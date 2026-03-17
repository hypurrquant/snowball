// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {IRiskManager} from "../interfaces/IRiskManager.sol";
import {OwnableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import {Ownable2StepUpgradeable} from "@openzeppelin/contracts-upgradeable/access/Ownable2StepUpgradeable.sol";
import {PausableUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";
import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";

/// @title RiskManager
/// @notice Central risk management for full-collateral environment
/// @dev Manages market configs, position limits, OI caps, concentration limits
contract RiskManager is Initializable, Ownable2StepUpgradeable, PausableUpgradeable, UUPSUpgradeable, IRiskManager {
    /// @notice Role for contracts that can register/deregister positions (Forward, SettlementEngine, Consumer)
    mapping(address => bool) public operators;
    /// @notice Market configurations
    mapping(bytes32 => MarketConfig) private _marketConfigs;

    /// @notice Open interest tracking: marketId => isLong => total OI
    mapping(bytes32 => mapping(bool => uint256)) private _openInterest;

    /// @notice Per-user OI tracking: marketId => user => isLong => OI
    mapping(bytes32 => mapping(address => mapping(bool => uint256))) private _userOpenInterest;

    /// @notice List of registered market IDs
    bytes32[] public marketIds;

    // Errors
    error MarketNotActive(bytes32 marketId);
    error MarketAlreadyExists(bytes32 marketId);
    error PositionTooLarge(uint256 notional, uint256 maxSize);
    error OpenInterestExceeded(bytes32 marketId, bool isLong, uint256 current, uint256 max);
    error ConcentrationExceeded(address user, uint256 userOI, uint256 totalOI, uint256 maxBps);
    error MaturityTooShort(uint256 duration, uint256 minDuration);
    error MaturityTooLong(uint256 duration, uint256 maxDuration);
    error InvalidConfig();
    error ZeroAddress();
    error NotOperator();

    // Events
    event MarketAdded(bytes32 indexed marketId, MarketConfig config);
    event MarketUpdated(bytes32 indexed marketId, MarketConfig config);
    event MarketDeactivated(bytes32 indexed marketId);
    event PositionRegistered(bytes32 indexed marketId, address indexed user, uint256 notional, bool isLong);
    event PositionDeregistered(bytes32 indexed marketId, address indexed user, uint256 notional, bool isLong);
    event OperatorUpdated(address indexed operator, bool status);

    modifier onlyOperator() {
        if (!operators[msg.sender]) revert NotOperator();
        _;
    }

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    /// @notice Initializes the contract (replaces constructor for upgradeable pattern)
    /// @param _owner The initial owner of the contract
    function initialize(address _owner) external initializer {
        if (_owner == address(0)) revert ZeroAddress();
        __Ownable_init(_owner);
        __Ownable2Step_init();
        __Pausable_init();
    }

    // ─── Admin ───────────────────────────────────────────────────────────

    /// @notice Add a new market
    function addMarket(bytes32 marketId, MarketConfig calldata config) external onlyOwner {
        if (_marketConfigs[marketId].priceFeedId != bytes32(0)) revert MarketAlreadyExists(marketId);
        _validateConfig(config);

        _marketConfigs[marketId] = config;
        marketIds.push(marketId);

        emit MarketAdded(marketId, config);
    }

    /// @notice Update an existing market configuration
    function updateMarket(bytes32 marketId, MarketConfig calldata config) external onlyOwner {
        if (_marketConfigs[marketId].priceFeedId == bytes32(0)) revert MarketNotActive(marketId);
        _validateConfig(config);

        _marketConfigs[marketId] = config;

        emit MarketUpdated(marketId, config);
    }

    /// @notice Deactivate a market
    function deactivateMarket(bytes32 marketId) external onlyOwner {
        _marketConfigs[marketId].active = false;
        emit MarketDeactivated(marketId);
    }

    /// @notice Pause risk manager (emergency)
    function pause() external onlyOwner {
        _pause();
    }

    /// @notice Unpause risk manager
    function unpause() external onlyOwner {
        _unpause();
    }

    /// @notice Set operator status (Forward, SettlementEngine, Consumer contracts)
    function setOperator(address operator, bool status) external onlyOwner {
        if (operator == address(0)) revert ZeroAddress();
        operators[operator] = status;
        emit OperatorUpdated(operator, status);
    }

    // ─── Core Functions ──────────────────────────────────────────────────

    /// @inheritdoc IRiskManager
    function validateNewPosition(
        bytes32 marketId,
        address user,
        uint256 notional,
        uint256 maturityTimestamp,
        bool isLong
    ) external view override whenNotPaused {
        MarketConfig storage config = _marketConfigs[marketId];
        if (!config.active) revert MarketNotActive(marketId);

        // 1. Position size check
        if (notional > config.maxPositionSize) {
            revert PositionTooLarge(notional, config.maxPositionSize);
        }

        // 2. Maturity check
        uint256 duration = maturityTimestamp - block.timestamp;
        if (duration < config.minMaturity) revert MaturityTooShort(duration, config.minMaturity);
        if (duration > config.maxMaturity) revert MaturityTooLong(duration, config.maxMaturity);

        // 3. OI check
        uint256 currentOI = _openInterest[marketId][isLong];
        if (currentOI + notional > config.maxOpenInterest) {
            revert OpenInterestExceeded(marketId, isLong, currentOI, config.maxOpenInterest);
        }

        // 4. Concentration check (only applies when there is existing OI from other users)
        if (currentOI > 0) {
            uint256 userOI = _userOpenInterest[marketId][user][isLong] + notional;
            uint256 totalOI = currentOI + notional;
            if (userOI * 10_000 > totalOI * config.maxConcentrationBps) {
                revert ConcentrationExceeded(user, userOI, totalOI, config.maxConcentrationBps);
            }
        }
    }

    /// @inheritdoc IRiskManager
    function registerPosition(
        bytes32 marketId,
        address user,
        uint256 notional,
        bool isLong
    ) external override onlyOperator whenNotPaused {
        // Re-verify OI limit to close TOCTOU gap between validateNewPosition and registration
        MarketConfig storage config = _marketConfigs[marketId];
        uint256 currentOI = _openInterest[marketId][isLong];
        if (currentOI + notional > config.maxOpenInterest) {
            revert OpenInterestExceeded(marketId, isLong, currentOI, config.maxOpenInterest);
        }

        _openInterest[marketId][isLong] += notional;
        _userOpenInterest[marketId][user][isLong] += notional;

        emit PositionRegistered(marketId, user, notional, isLong);
    }

    /// @inheritdoc IRiskManager
    function deregisterPosition(
        bytes32 marketId,
        address user,
        uint256 notional,
        bool isLong
    ) external override onlyOperator whenNotPaused {
        _openInterest[marketId][isLong] -= notional;
        _userOpenInterest[marketId][user][isLong] -= notional;

        emit PositionDeregistered(marketId, user, notional, isLong);
    }

    // ─── Views ───────────────────────────────────────────────────────────

    /// @inheritdoc IRiskManager
    function getMarketConfig(bytes32 marketId) external view override returns (MarketConfig memory) {
        return _marketConfigs[marketId];
    }

    /// @inheritdoc IRiskManager
    function getPriceFeedId(bytes32 marketId) external view override returns (bytes32) {
        return _marketConfigs[marketId].priceFeedId;
    }

    /// @notice Get current open interest for a market side
    function getOpenInterest(bytes32 marketId, bool isLong) external view returns (uint256) {
        return _openInterest[marketId][isLong];
    }

    /// @notice Get user's open interest for a market side
    function getUserOpenInterest(bytes32 marketId, address user, bool isLong) external view returns (uint256) {
        return _userOpenInterest[marketId][user][isLong];
    }

    /// @notice Get the number of registered markets
    function getMarketCount() external view returns (uint256) {
        return marketIds.length;
    }

    // ─── Internal ────────────────────────────────────────────────────────

    function _validateConfig(MarketConfig calldata config) internal pure {
        if (config.priceFeedId == bytes32(0)) revert InvalidConfig();
        if (config.maxPositionSize == 0) revert InvalidConfig();
        if (config.maxOpenInterest == 0) revert InvalidConfig();
        if (config.maxConcentrationBps == 0 || config.maxConcentrationBps > 10_000) revert InvalidConfig();
        if (config.minMaturity == 0) revert InvalidConfig();
        if (config.maxMaturity <= config.minMaturity) revert InvalidConfig();
    }

    /// @notice Authorizes an upgrade to a new implementation
    /// @dev Only the owner can authorize upgrades
    function _authorizeUpgrade(address) internal override onlyOwner {}
}
