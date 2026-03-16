// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {IMaturityTokenFactory} from "./interfaces/IMaturityTokenFactory.sol";
import {IEscrowVault} from "./interfaces/IEscrowVault.sol";
import {IOracleAdapter} from "../interfaces/IOracleAdapter.sol";
import {MaturityToken} from "./MaturityToken.sol";
import {EscrowVault} from "./EscrowVault.sol";
import {IAccessControl} from "@openzeppelin/contracts/access/IAccessControl.sol";
import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/// @title MaturityTokenFactory
/// @notice Creates and manages maturity token series (fToken + sfToken pairs)
contract MaturityTokenFactory is IMaturityTokenFactory, AccessControl, ReentrancyGuard, Pausable {
    using SafeERC20 for IERC20;

    bytes32 public constant SERIES_CREATOR_ROLE = keccak256("SERIES_CREATOR_ROLE");
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");
    bytes32 public constant CRE_CONSUMER_ROLE = keccak256("CRE_CONSUMER_ROLE");

    IERC20 public immutable USDC;
    IEscrowVault public immutable ESCROW_VAULT;
    IOracleAdapter public immutable ORACLE;

    /// @notice Mapping of market ID to price feed ID
    mapping(bytes32 => bytes32) public marketFeedId;

    /// @notice All series data
    mapping(bytes32 => Series) private _series;
    /// @notice List of active (unsettled) series IDs
    bytes32[] private _activeSeriesIds;

    constructor(
        address _usdc,
        address _escrowVault,
        address _oracle,
        address _admin
    ) {
        if (_usdc == address(0) || _escrowVault == address(0) || _oracle == address(0) || _admin == address(0)) {
            revert ZeroAddress();
        }
        USDC = IERC20(_usdc);
        ESCROW_VAULT = IEscrowVault(_escrowVault);
        ORACLE = IOracleAdapter(_oracle);

        _grantRole(DEFAULT_ADMIN_ROLE, _admin);
        _grantRole(SERIES_CREATOR_ROLE, _admin);
        _grantRole(PAUSER_ROLE, _admin);
    }

    /// @notice Set the price feed ID for a market
    /// @param marketId Market identifier
    /// @param feedId Price feed ID
    function setMarketFeedId(bytes32 marketId, bytes32 feedId) external onlyRole(DEFAULT_ADMIN_ROLE) {
        marketFeedId[marketId] = feedId;
    }

    /// @inheritdoc IMaturityTokenFactory
    function createSeries(
        bytes32 marketId,
        uint256 maturityTime,
        int256 forwardRate
    ) external override onlyRole(SERIES_CREATOR_ROLE) whenNotPaused returns (bytes32 seriesId) {
        if (maturityTime <= block.timestamp) revert InvalidMaturity();
        if (forwardRate <= 0) revert InvalidForwardRate();

        seriesId = getSeriesId(marketId, maturityTime, forwardRate);
        if (_series[seriesId].fToken != address(0)) revert SeriesAlreadyExists(seriesId);

        // Generate token names (e.g., "fKRW-1719792000", "sfKRW-1719792000")
        string memory matStr = _uint2str(maturityTime);
        string memory fName = string.concat("f-", matStr);
        string memory fSymbol = string.concat("f-", matStr);
        string memory sfName = string.concat("sf-", matStr);
        string memory sfSymbol = string.concat("sf-", matStr);

        // Deploy fToken (Long)
        MaturityToken fToken = new MaturityToken(
            fName, fSymbol,
            marketId, maturityTime, forwardRate,
            true, // isLong
            seriesId,
            address(ESCROW_VAULT),
            address(this)
        );

        // Deploy sfToken (Short)
        MaturityToken sfToken = new MaturityToken(
            sfName, sfSymbol,
            marketId, maturityTime, forwardRate,
            false, // isLong
            seriesId,
            address(ESCROW_VAULT),
            address(this)
        );

        // Link counterparts
        fToken.setCounterpart(address(sfToken));
        sfToken.setCounterpart(address(fToken));

        // Grant FACTORY_ROLE on EscrowVault to tokens so they can release USDC on redeem
        bytes32 factoryRole = EscrowVault(address(ESCROW_VAULT)).FACTORY_ROLE();
        IAccessControl(address(ESCROW_VAULT)).grantRole(factoryRole, address(fToken));
        IAccessControl(address(ESCROW_VAULT)).grantRole(factoryRole, address(sfToken));

        // Authorize each token to release escrow for this specific series
        EscrowVault(address(ESCROW_VAULT)).authorizeForSeries(seriesId, address(fToken));
        EscrowVault(address(ESCROW_VAULT)).authorizeForSeries(seriesId, address(sfToken));

        _series[seriesId] = Series({
            marketId: marketId,
            maturityTime: maturityTime,
            forwardRate: forwardRate,
            fToken: address(fToken),
            sfToken: address(sfToken),
            settled: false
        });

        _activeSeriesIds.push(seriesId);

        emit SeriesCreated(seriesId, marketId, maturityTime, forwardRate, address(fToken), address(sfToken));
    }

    /// @inheritdoc IMaturityTokenFactory
    function mint(bytes32 seriesId, uint256 amount) external override nonReentrant whenNotPaused {
        if (amount == 0) revert ZeroAmount();
        Series storage s = _series[seriesId];
        if (s.fToken == address(0)) revert SeriesNotFound(seriesId);
        if (s.settled) revert SeriesAlreadySettled(seriesId);

        // Cost: 2 USDC per token pair
        // amount is 18 decimals, USDC is 6 decimals
        // usdcCost = amount * 2e6 / 1e18
        uint256 usdcCost = amount * 2e6 / 1e18;
        if (usdcCost == 0) revert ZeroAmount();

        // Transfer USDC from user to this contract, then deposit to escrow
        USDC.safeTransferFrom(msg.sender, address(this), usdcCost);
        USDC.approve(address(ESCROW_VAULT), usdcCost);
        ESCROW_VAULT.depositFor(seriesId, usdcCost);

        // Mint both tokens to user
        MaturityToken(s.fToken).mint(msg.sender, amount);
        MaturityToken(s.sfToken).mint(msg.sender, amount);

        emit Minted(seriesId, msg.sender, amount, usdcCost);
    }

    /// @inheritdoc IMaturityTokenFactory
    function settleSeries(
        bytes32 seriesId,
        bytes[] calldata priceUpdate
    ) external payable override nonReentrant {
        Series storage s = _series[seriesId];
        if (s.fToken == address(0)) revert SeriesNotFound(seriesId);
        if (s.settled) revert SeriesAlreadySettled(seriesId);
        if (block.timestamp < s.maturityTime) revert SeriesNotMature(seriesId);

        bytes32 feedId = marketFeedId[s.marketId];

        // Get settlement price from oracle
        (int256 settlementRate,) = ORACLE.getPrice{value: msg.value}(feedId, priceUpdate);

        // Settle both tokens
        MaturityToken(s.fToken).settle(settlementRate);
        MaturityToken(s.sfToken).settle(settlementRate);

        s.settled = true;

        // Remove from active list
        _removeFromActive(seriesId);

        emit SeriesSettled(seriesId, settlementRate);
    }

    /// @inheritdoc IMaturityTokenFactory
    function settleSeriesFromConsumer(
        bytes32 seriesId,
        int256 settlementRate
    ) external override onlyRole(CRE_CONSUMER_ROLE) nonReentrant {
        Series storage s = _series[seriesId];
        if (s.fToken == address(0)) revert SeriesNotFound(seriesId);
        if (s.settled) revert SeriesAlreadySettled(seriesId);
        if (block.timestamp < s.maturityTime) revert SeriesNotMature(seriesId);
        if (settlementRate <= 0) revert InvalidForwardRate();

        // Settle both tokens with the provided rate (no oracle call)
        MaturityToken(s.fToken).settle(settlementRate);
        MaturityToken(s.sfToken).settle(settlementRate);

        s.settled = true;

        // Remove from active list
        _removeFromActive(seriesId);

        emit SeriesSettled(seriesId, settlementRate);
    }

    /// @inheritdoc IMaturityTokenFactory
    function getSeries(bytes32 seriesId) external view override returns (Series memory) {
        return _series[seriesId];
    }

    /// @inheritdoc IMaturityTokenFactory
    function getSeriesId(
        bytes32 marketId,
        uint256 maturityTime,
        int256 forwardRate
    ) public pure override returns (bytes32) {
        return keccak256(abi.encodePacked(marketId, maturityTime, forwardRate));
    }

    /// @inheritdoc IMaturityTokenFactory
    function getActiveSeriesIds() external view override returns (bytes32[] memory) {
        return _activeSeriesIds;
    }

    // ─── Admin ───

    function pause() external onlyRole(PAUSER_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(PAUSER_ROLE) {
        _unpause();
    }

    // ─── Internal ───

    function _removeFromActive(bytes32 seriesId) internal {
        uint256 len = _activeSeriesIds.length;
        for (uint256 i = 0; i < len; i++) {
            if (_activeSeriesIds[i] == seriesId) {
                _activeSeriesIds[i] = _activeSeriesIds[len - 1];
                _activeSeriesIds.pop();
                break;
            }
        }
    }

    function _uint2str(uint256 value) internal pure returns (string memory) {
        if (value == 0) return "0";
        uint256 temp = value;
        uint256 digits;
        while (temp != 0) {
            digits++;
            temp /= 10;
        }
        bytes memory buffer = new bytes(digits);
        while (value != 0) {
            digits--;
            buffer[digits] = bytes1(uint8(48 + uint256(value % 10)));
            value /= 10;
        }
        return string(buffer);
    }
}
