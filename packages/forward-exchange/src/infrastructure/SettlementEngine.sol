// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {ISettlementEngine} from "../interfaces/ISettlementEngine.sol";
import {IForward} from "../interfaces/IForward.sol";
import {IOracleAdapter} from "../interfaces/IOracleAdapter.sol";
import {IVault} from "../interfaces/IVault.sol";
import {IRiskManager} from "../interfaces/IRiskManager.sol";
import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {AccessControlUpgradeable} from "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import {PausableUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";
import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

/// @title SettlementEngine
/// @notice Handles maturity settlement for NDF forward positions
/// @dev PnL = notional * (settlementRate - forwardRate) / forwardRate
contract SettlementEngine is Initializable, ISettlementEngine, AccessControlUpgradeable, PausableUpgradeable, UUPSUpgradeable {
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");

    /// @notice The Forward contract
    IForward public FORWARD;

    /// @notice The Oracle adapter
    IOracleAdapter public ORACLE;

    /// @notice The Vault contract
    IVault public VAULT;

    /// @notice The Risk Manager
    IRiskManager public RISK_MANAGER;

    /// @notice Settlement window tolerance (seconds before/after maturity)
    uint256 public settlementWindow;

    // Constants
    uint256 private constant RATE_DECIMALS = 18;
    uint256 private constant USDC_DECIMALS = 6;
    uint256 private constant RATE_SCALE = 10 ** RATE_DECIMALS;

    // Errors
    error ZeroAddress();
    error NotForward();
    error SettlementTooEarly(uint256 maturityTime, uint256 currentTime);
    error SettlementTooLate(uint256 maturityTime, uint256 currentTime, uint256 window);
    error InvalidSettlementRate();
    error PositionAlreadySettled();
    error PositionLocked();
    error InvalidPositionId();
    error InvalidParameter();

    // Events
    event Settled(
        uint256 indexed positionId,
        int256 settlementRate,
        int256 pnl,
        address winner,
        address loser
    );
    event SettlementWindowUpdated(uint256 oldWindow, uint256 newWindow);

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(
        address _forward,
        address _oracle,
        address _vault,
        address _riskManager,
        address _admin,
        uint256 _settlementWindow
    ) external initializer {
        if (
            _forward == address(0) || _oracle == address(0) || _vault == address(0) ||
            _riskManager == address(0) || _admin == address(0)
        ) revert ZeroAddress();
        if (_settlementWindow == 0) revert InvalidParameter();

        __AccessControl_init();
        __Pausable_init();

        FORWARD = IForward(_forward);
        ORACLE = IOracleAdapter(_oracle);
        VAULT = IVault(_vault);
        RISK_MANAGER = IRiskManager(_riskManager);
        settlementWindow = _settlementWindow;

        _grantRole(DEFAULT_ADMIN_ROLE, _admin);
        _grantRole(PAUSER_ROLE, _admin);
    }

    /// @inheritdoc ISettlementEngine
    /// @dev Only callable by Forward contract. Use Forward.settle() as the entry point.
    function settle(
        uint256 positionId,
        bytes[] calldata priceUpdate
    ) external payable override whenNotPaused {
        if (msg.sender != address(FORWARD)) revert NotForward();
        // Ensure we're working with the Long token ID (even)
        if (positionId % 2 != 0) revert InvalidPositionId();

        IForward.ForwardPosition memory pos = FORWARD.getPosition(positionId);
        if (pos.settled) revert PositionAlreadySettled();
        if (pos.counterparty == address(0)) revert InvalidPositionId();
        // Fix #6: prevent settlement of a locked (structured-product-held) position
        if (pos.locked) revert PositionLocked();

        // Check settlement window
        uint256 matTime = pos.maturityTime;
        if (block.timestamp < matTime) revert SettlementTooEarly(matTime, block.timestamp);
        if (block.timestamp > matTime + settlementWindow) {
            revert SettlementTooLate(matTime, block.timestamp, settlementWindow);
        }

        // Get settlement price from oracle
        bytes32 feedId = RISK_MANAGER.getPriceFeedId(pos.marketId);
        (int256 settlementRate,) = ORACLE.getSettlementPrice{value: msg.value}(
            feedId,
            priceUpdate,
            uint64(matTime)
        );
        if (settlementRate <= 0) revert InvalidSettlementRate();

        // Calculate PnL
        int256 pnl = calculatePnL(pos.notional, pos.forwardRate, settlementRate);

        // Determine winner/loser
        // Long position owner and Short position owner
        uint256 shortTokenId = positionId + 1;
        address longOwner = _getTokenOwner(positionId);
        address shortOwner = _getTokenOwner(shortTokenId);

        address winner;
        address loser;
        uint256 absPnl;

        if (pnl >= 0) {
            winner = longOwner;
            loser = shortOwner;
            absPnl = uint256(pnl);
            // Settle: loser's positionId collateral goes partially to winner
            VAULT.settlePosition(shortTokenId, winner, loser, absPnl);
        } else {
            winner = shortOwner;
            loser = longOwner;
            absPnl = uint256(-pnl);
            VAULT.settlePosition(positionId, winner, loser, absPnl);
        }

        // Deregister OI using original position creators (not current NFT owners)
        IForward.ForwardPosition memory shortPos = FORWARD.getPosition(shortTokenId);
        RISK_MANAGER.deregisterPosition(pos.marketId, pos.originalOwner, pos.notional, true);
        RISK_MANAGER.deregisterPosition(pos.marketId, shortPos.originalOwner, pos.notional, false);

        // Mark position as settled in Forward contract
        // The Forward contract's settle function will handle NFT burning
        // This is called by Forward.settle() which delegates to us, so we emit the event
        emit Settled(positionId, settlementRate, pnl, winner, loser);
    }

    /// @inheritdoc ISettlementEngine
    function calculatePnL(
        uint256 notional,
        int256 forwardRate,
        int256 settlementRate
    ) public pure override returns (int256 pnl) {
        // Linear PnL for Long: notional * (settlementRate - forwardRate) / forwardRate
        // Result in USDC terms (6 decimals, same as notional)
        // Rates are in 18 decimals

        int256 rateDiff = settlementRate - forwardRate;

        // multiply before divide for precision
        // notional (6d) * rateDiff (18d) / forwardRate (18d) = result (6d)
        pnl = int256(notional) * rateDiff / forwardRate;
    }

    // ─── Admin ───────────────────────────────────────────────────────────

    /// @notice Update the settlement window
    function setSettlementWindow(uint256 _window) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (_window == 0) revert InvalidParameter();
        uint256 oldWindow = settlementWindow;
        settlementWindow = _window;
        emit SettlementWindowUpdated(oldWindow, _window);
    }

    /// @notice Pause settlement engine (emergency)
    function pause() external onlyRole(PAUSER_ROLE) {
        _pause();
    }

    /// @notice Unpause settlement engine
    function unpause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _unpause();
    }

    // ─── Upgrade ─────────────────────────────────────────────────────────

    function _authorizeUpgrade(address) internal override onlyRole(DEFAULT_ADMIN_ROLE) {}

    // ─── Internal ────────────────────────────────────────────────────────

    /// @dev Get the owner of a Forward NFT token
    function _getTokenOwner(uint256 tokenId) internal view returns (address) {
        // Forward is an ERC-721, use ownerOf
        return IERC721Minimal(address(FORWARD)).ownerOf(tokenId);
    }
}

/// @dev Minimal ERC721 interface for ownerOf
interface IERC721Minimal {
    function ownerOf(uint256 tokenId) external view returns (address);
}
