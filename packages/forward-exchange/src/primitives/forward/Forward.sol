// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {IForward} from "../../interfaces/IForward.sol";
import {IPrimitive} from "../../interfaces/IPrimitive.sol";
import {IVault} from "../../interfaces/IVault.sol";
import {IRiskManager} from "../../interfaces/IRiskManager.sol";
import {IOracleAdapter} from "../../interfaces/IOracleAdapter.sol";
import {ISettlementEngine} from "../../interfaces/ISettlementEngine.sol";
import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {ERC721Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC721/ERC721Upgradeable.sol";
import {AccessControlUpgradeable} from "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import {PausableUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

/// @title Forward
/// @notice Forward Exchange primitive - NDF positions as ERC-721 NFTs
/// @dev Paired Long/Short NFTs: Long = even IDs (2,4,6...), Short = odd IDs (3,5,7...)
///      Token IDs start at 2 to avoid 0/1 edge cases. Pairs: (2,3), (4,5), (6,7)...
contract Forward is
    Initializable,
    ERC721Upgradeable,
    AccessControlUpgradeable,
    PausableUpgradeable,
    ReentrancyGuard,
    UUPSUpgradeable,
    IForward
{
    // ─── Roles ───────────────────────────────────────────────────────────

    /// @notice Role for structured product contracts (lock/unlock)
    bytes32 public constant STRUCTURED_PRODUCT_ROLE = keccak256("STRUCTURED_PRODUCT_ROLE");
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");
    bytes32 public constant SETTLEMENT_ROLE = keccak256("SETTLEMENT_ROLE");
    bytes32 public constant CRE_CONSUMER_ROLE = keccak256("CRE_CONSUMER_ROLE");

    // ─── State ───────────────────────────────────────────────────────────

    /// @notice The Vault contract
    IVault public VAULT;

    /// @notice The Risk Manager
    IRiskManager public RISK_MANAGER;

    /// @notice The Oracle adapter
    IOracleAdapter public ORACLE;

    /// @notice The Settlement Engine
    ISettlementEngine public settlementEngine;

    /// @notice Next token ID counter (starts at 2, increments by 2 for each pair)
    uint256 private _nextPairId;

    /// @notice Position data for each token ID
    mapping(uint256 => ForwardPosition) private _positions;

    // ─── Constructor (disable initializers) ──────────────────────────────

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    // ─── Initializer ─────────────────────────────────────────────────────

    function initialize(
        address _vault,
        address _riskManager,
        address _oracle,
        address _admin
    ) external initializer {
        if (_vault == address(0) || _riskManager == address(0) || _oracle == address(0) || _admin == address(0)) {
            revert InvalidMarket();
        }

        __ERC721_init("Forward Exchange Position", "FWD-POS");
        __AccessControl_init();
        __Pausable_init();

        VAULT = IVault(_vault);
        RISK_MANAGER = IRiskManager(_riskManager);
        ORACLE = IOracleAdapter(_oracle);

        _nextPairId = 2;

        _grantRole(DEFAULT_ADMIN_ROLE, _admin);
        _grantRole(PAUSER_ROLE, _admin);
    }

    // ─── UUPS Upgrade Authorization ─────────────────────────────────────

    function _authorizeUpgrade(address) internal override onlyRole(DEFAULT_ADMIN_ROLE) {}

    // ─── Lifecycle ───────────────────────────────────────────────────────

    /// @inheritdoc IForward
    function createOffer(
        bytes32 marketId,
        uint256 notional,
        int256 forwardRate,
        uint256 maturityTime,
        bool isLong
    ) external override nonReentrant whenNotPaused returns (uint256 longTokenId, uint256 shortTokenId) {
        if (notional == 0) revert InvalidNotional();
        if (forwardRate <= 0) revert InvalidForwardRate();
        if (maturityTime <= block.timestamp) revert InvalidMaturity();

        // Validate against risk parameters (checks maturity range, position size, OI)
        RISK_MANAGER.validateNewPosition(marketId, msg.sender, notional, maturityTime, isLong);

        // Assign paired token IDs
        longTokenId = _nextPairId;
        shortTokenId = _nextPairId + 1;
        _nextPairId += 2;

        // Lock collateral for the creator's side
        // Full collateral = notional amount
        VAULT.lockCollateral(msg.sender, isLong ? longTokenId : shortTokenId, notional);

        // Create position data for both sides
        // Fix #3: originalOwner is only set for the creator's side here; the acceptor's
        // side will be populated in acceptOffer once a counterparty matches.
        _positions[longTokenId] = ForwardPosition({
            marketId: marketId,
            notional: notional,
            forwardRate: forwardRate,
            maturityTime: maturityTime,
            collateral: notional,
            counterparty: address(0),
            originalOwner: isLong ? msg.sender : address(0),
            isLong: true,
            settled: false,
            locked: false
        });

        _positions[shortTokenId] = ForwardPosition({
            marketId: marketId,
            notional: notional,
            forwardRate: forwardRate,
            maturityTime: maturityTime,
            collateral: notional,
            counterparty: address(0),
            originalOwner: isLong ? address(0) : msg.sender,
            isLong: false,
            settled: false,
            locked: false
        });

        // Mint NFT to creator for their side
        if (isLong) {
            _safeMint(msg.sender, longTokenId);
        } else {
            _safeMint(msg.sender, shortTokenId);
        }

        emit OfferCreated(longTokenId, shortTokenId, marketId, msg.sender, notional, forwardRate, maturityTime, isLong);
    }

    /// @inheritdoc IForward
    function acceptOffer(uint256 tokenId) external override nonReentrant whenNotPaused {
        // Determine the paired token
        uint256 longTokenId = (tokenId % 2 == 0) ? tokenId : tokenId - 1;
        uint256 shortTokenId = longTokenId + 1;

        ForwardPosition storage longPos = _positions[longTokenId];
        if (longPos.notional == 0) revert PositionNotFound();
        if (longPos.counterparty != address(0)) revert OfferAlreadyAccepted();

        // Determine which side the creator holds
        bool creatorIsLong = _exists(longTokenId);
        bool creatorIsShort = _exists(shortTokenId);

        address creator;
        uint256 acceptorTokenId;

        if (creatorIsLong) {
            creator = _ownerOf(longTokenId);
            acceptorTokenId = shortTokenId;
        } else if (creatorIsShort) {
            creator = _ownerOf(shortTokenId);
            acceptorTokenId = longTokenId;
        } else {
            revert PositionNotFound();
        }

        if (msg.sender == creator) revert CannotAcceptOwnOffer();

        // Validate risk for acceptor
        bool acceptorIsLong = (acceptorTokenId == longTokenId);
        RISK_MANAGER.validateNewPosition(
            longPos.marketId, msg.sender, longPos.notional, longPos.maturityTime, acceptorIsLong
        );

        // Lock collateral for acceptor
        VAULT.lockCollateral(msg.sender, acceptorTokenId, longPos.notional);

        // Fix #5: counterparty on each position points to the *other* side's current holder.
        // Long's counterparty = the short holder; Short's counterparty = the long holder.
        if (creatorIsLong) {
            // creator holds long, acceptor (msg.sender) holds short
            longPos.counterparty = msg.sender;            // long's counterparty = short holder
            _positions[shortTokenId].counterparty = creator; // short's counterparty = long holder
        } else {
            // creator holds short, acceptor (msg.sender) holds long
            longPos.counterparty = creator;               // long's counterparty = short holder (creator)
            _positions[shortTokenId].counterparty = msg.sender; // short's counterparty = long holder
        }

        // Fix #3: set originalOwner for the acceptor's side (was address(0) after createOffer)
        _positions[acceptorTokenId].originalOwner = msg.sender;

        // Determine original owners for OI registration
        address longOriginal = _positions[longTokenId].originalOwner;
        address shortOriginal = _positions[shortTokenId].originalOwner;

        // Register OI for both sides using original owners
        RISK_MANAGER.registerPosition(longPos.marketId, longOriginal, longPos.notional, true);
        RISK_MANAGER.registerPosition(longPos.marketId, shortOriginal, longPos.notional, false);

        // Mint the acceptor's NFT
        _safeMint(msg.sender, acceptorTokenId);

        emit OfferAccepted(longTokenId, shortTokenId, msg.sender);
    }

    /// @inheritdoc IForward
    function cancelOffer(uint256 tokenId) external override nonReentrant whenNotPaused {
        uint256 longTokenId = (tokenId % 2 == 0) ? tokenId : tokenId - 1;
        uint256 shortTokenId = longTokenId + 1;

        ForwardPosition storage pos = _positions[longTokenId];
        if (pos.notional == 0) revert PositionNotFound();
        if (pos.counterparty != address(0)) revert OfferAlreadyAccepted();

        // Only the creator (token holder) can cancel
        bool creatorIsLong = _exists(longTokenId);
        uint256 creatorTokenId = creatorIsLong ? longTokenId : shortTokenId;

        if (!_exists(creatorTokenId)) revert PositionNotFound();
        if (_ownerOf(creatorTokenId) != msg.sender) revert NotOfferCreator();

        // Fix #4: prevent cancellation of a locked position
        if (_positions[creatorTokenId].locked) revert PositionIsLocked();

        // Unlock collateral
        VAULT.unlockCollateral(msg.sender, creatorTokenId, pos.notional);

        // Burn the creator's NFT
        _burn(creatorTokenId);

        // Clear position data
        delete _positions[longTokenId];
        delete _positions[shortTokenId];

        emit OfferCancelled(tokenId, msg.sender);
    }

    /// @inheritdoc IPrimitive
    function settle(
        uint256 tokenId,
        bytes[] calldata priceUpdate
    ) external payable override nonReentrant whenNotPaused {
        // Normalize to Long token ID (even)
        uint256 longTokenId = (tokenId % 2 == 0) ? tokenId : tokenId - 1;
        uint256 shortTokenId = longTokenId + 1;

        ForwardPosition storage pos = _positions[longTokenId];
        if (pos.notional == 0) revert PositionNotFound();
        if (pos.settled) revert PositionAlreadySettled();
        if (pos.counterparty == address(0)) revert PositionNotActive();
        if (block.timestamp < pos.maturityTime) revert MaturityNotReached();

        // Delegate to settlement engine
        settlementEngine.settle{value: msg.value}(longTokenId, priceUpdate);

        // Mark as settled
        pos.settled = true;
        _positions[shortTokenId].settled = true;

        // Get settlement details for event
        // Burn both NFTs
        address longOwner = _ownerOf(longTokenId);
        address shortOwner = _ownerOf(shortTokenId);

        _burn(longTokenId);
        _burn(shortTokenId);

        // Note: SettlementEngine emits the detailed Settled event
    }

    /// @notice CRE Consumer settles a position (PnL computed on-chain from DON-reported rate)
    /// @param tokenId The position token ID (normalized to Long internally)
    /// @param settlementRate The settlement exchange rate reported by the DON (18 decimals)
    function settleFromConsumer(uint256 tokenId, int256 settlementRate) external nonReentrant onlyRole(CRE_CONSUMER_ROLE) {
        uint256 longTokenId = (tokenId % 2 == 0) ? tokenId : tokenId - 1;
        uint256 shortTokenId = longTokenId + 1;

        ForwardPosition storage pos = _positions[longTokenId];
        if (pos.notional == 0) revert PositionNotFound();
        if (pos.settled) revert PositionAlreadySettled();
        if (pos.counterparty == address(0)) revert PositionNotActive();
        if (block.timestamp < pos.maturityTime) revert MaturityNotReached();
        if (pos.locked) revert PositionIsLocked();
        if (settlementRate <= 0) revert InvalidForwardRate();

        // Fix #1: Compute PnL on-chain using the DON-reported rate
        int256 pnl = settlementEngine.calculatePnL(pos.notional, pos.forwardRate, settlementRate);

        // Determine winner/loser from current NFT owners
        address longOwner = _ownerOf(longTokenId);
        address shortOwner = _ownerOf(shortTokenId);

        address winner;
        address loser;
        uint256 absPnl;

        if (pnl >= 0) {
            winner = longOwner;
            loser = shortOwner;
            absPnl = uint256(pnl);
            VAULT.settlePosition(shortTokenId, winner, loser, absPnl);
        } else {
            winner = shortOwner;
            loser = longOwner;
            absPnl = uint256(-pnl);
            VAULT.settlePosition(longTokenId, winner, loser, absPnl);
        }

        // Deregister OI using original position creators
        ForwardPosition storage shortPos = _positions[shortTokenId];
        RISK_MANAGER.deregisterPosition(pos.marketId, pos.originalOwner, pos.notional, true);
        RISK_MANAGER.deregisterPosition(pos.marketId, shortPos.originalOwner, pos.notional, false);

        // Mark settled, then burn both NFTs
        pos.settled = true;
        shortPos.settled = true;

        _burn(longTokenId);
        _burn(shortTokenId);
    }

    // ─── Lock/Unlock (Structured Products) ───────────────────────────────

    /// @inheritdoc IPrimitive
    function lock(uint256 tokenId) external override onlyRole(STRUCTURED_PRODUCT_ROLE) {
        ForwardPosition storage pos = _positions[_longId(tokenId)];
        if (pos.notional == 0) revert PositionNotFound();
        if (pos.settled) revert PositionAlreadySettled();
        if (_positions[tokenId].locked) revert PositionAlreadyLocked();

        _positions[tokenId].locked = true;

        emit PositionLocked(tokenId, msg.sender);
    }

    /// @inheritdoc IPrimitive
    function unlock(uint256 tokenId) external override onlyRole(STRUCTURED_PRODUCT_ROLE) {
        if (!_positions[tokenId].locked) revert PositionNotLocked();

        _positions[tokenId].locked = false;

        emit PositionUnlocked(tokenId, msg.sender);
    }

    // ─── Views ───────────────────────────────────────────────────────────

    /// @inheritdoc IPrimitive
    function fairValue(uint256 tokenId) external view override returns (int256) {
        // Fair value calculation would require current oracle price (not available in view)
        // Return 0 as placeholder - actual MTM needs off-chain calculation or payable call
        ForwardPosition storage pos = _positions[_longId(tokenId)];
        if (pos.notional == 0) revert PositionNotFound();
        return 0;
    }

    /// @inheritdoc IPrimitive
    function maturity(uint256 tokenId) external view override returns (uint256) {
        return _positions[_longId(tokenId)].maturityTime;
    }

    /// @inheritdoc IPrimitive
    function isSettled(uint256 tokenId) external view override returns (bool) {
        return _positions[_longId(tokenId)].settled;
    }

    /// @inheritdoc IForward
    function getPosition(uint256 tokenId) external view override returns (ForwardPosition memory) {
        return _positions[tokenId];
    }

    /// @inheritdoc IForward
    function getPairedTokenId(uint256 tokenId) external pure override returns (uint256) {
        if (tokenId % 2 == 0) return tokenId + 1;
        return tokenId - 1;
    }

    /// @notice Get the next pair ID that will be assigned
    function nextPairId() external view returns (uint256) {
        return _nextPairId;
    }

    // ─── Admin ───────────────────────────────────────────────────────────

    /// @notice Set the settlement engine address
    function setSettlementEngine(address _engine) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (_engine == address(0)) revert InvalidMarket();
        settlementEngine = ISettlementEngine(_engine);
    }

    /// @notice Pause the Forward contract (emergency)
    function pause() external onlyRole(PAUSER_ROLE) {
        _pause();
    }

    /// @notice Unpause the Forward contract
    function unpause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _unpause();
    }

    // ─── ERC721 Overrides ────────────────────────────────────────────────

    /// @dev Override _update to prevent transfer of locked positions
    function _update(
        address to,
        uint256 tokenId,
        address auth
    ) internal override returns (address) {
        // Allow mint (from == 0) and burn (to == 0)
        address from = _ownerOf(tokenId);
        if (from != address(0) && to != address(0)) {
            // This is a transfer (not mint/burn)
            if (_positions[tokenId].locked) revert TransferWhileLocked();
        }
        return super._update(to, tokenId, auth);
    }

    /// @dev Required override for AccessControlUpgradeable + ERC721Upgradeable
    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721Upgradeable, AccessControlUpgradeable)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }

    // ─── Internal Helpers ────────────────────────────────────────────────

    /// @dev Normalize token ID to Long (even) ID
    function _longId(uint256 tokenId) internal pure returns (uint256) {
        return (tokenId % 2 == 0) ? tokenId : tokenId - 1;
    }

    /// @dev Check if a token exists
    function _exists(uint256 tokenId) internal view returns (bool) {
        return _ownerOf(tokenId) != address(0);
    }
}
