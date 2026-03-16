// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {IOracleAdapter} from "../interfaces/IOracleAdapter.sol";
import {Ownable2Step, Ownable} from "@openzeppelin/contracts/access/Ownable2Step.sol";

/// @title CREOracleAdapter
/// @notice Oracle adapter backed by Chainlink CRE price reports
/// @dev Prices are pushed by authorized updaters (admin or CRE forwarder).
///      For auto-settlement, CRE workflows settle directly via consumer contracts.
///      This adapter serves the manual settlement fallback path.
contract CREOracleAdapter is IOracleAdapter, Ownable2Step {
    struct PriceData {
        int256 price;       // 18-decimal fixed point
        uint256 timestamp;  // publish time
    }

    /// @notice Maximum allowed staleness for price reads (seconds)
    uint256 public maxStaleness;

    /// @notice Maximum allowed price deviation from last known (basis points, 1000 = 10%)
    uint256 public maxDeviationBps;

    /// @notice Address authorised to push prices (separate from owner)
    address public priceUpdater;

    /// @notice Fallback oracle adapter (optional)
    IOracleAdapter public fallbackOracle;

    /// @notice Latest price data per feed
    mapping(bytes32 => PriceData) public latestPrices;

    /// @notice Last known good price per feed (sanity check reference)
    mapping(bytes32 => int256) public lastKnownPrice;

    // Constants
    uint256 private constant BPS_DENOMINATOR = 10_000;

    // Errors
    error StalePrice(bytes32 feedId, uint256 publishTime, uint256 currentTime);
    error InvalidPrice(bytes32 feedId, int256 price);
    error ExcessiveDeviation(bytes32 feedId, int256 newPrice, int256 lastPrice);
    error ZeroAddress();
    error InvalidParameter();
    error Unauthorized();

    // Events
    event MaxStalenessUpdated(uint256 oldValue, uint256 newValue);
    event MaxDeviationBpsUpdated(uint256 oldValue, uint256 newValue);
    event FallbackOracleUpdated(address oldOracle, address newOracle);
    event PriceUpdated(bytes32 indexed feedId, int256 price, uint256 timestamp);
    event PriceUpdaterUpdated(address indexed oldUpdater, address indexed newUpdater);

    constructor(
        address _owner,
        uint256 _maxStaleness,
        uint256 _maxDeviationBps
    ) Ownable(_owner) {
        if (_owner == address(0)) revert ZeroAddress();
        if (_maxStaleness == 0 || _maxDeviationBps == 0) revert InvalidParameter();

        maxStaleness = _maxStaleness;
        maxDeviationBps = _maxDeviationBps;
    }

    // ─── Price Updates ────────────────────────────────────────────────────

    /// @notice Push a new price for a feed (priceUpdater or owner)
    /// @param feedId The price feed identifier
    /// @param price The price in 18-decimal fixed point (must be positive)
    function setPrice(bytes32 feedId, int256 price) external {
        if (msg.sender != owner() && msg.sender != priceUpdater) revert Unauthorized();
        _updatePrice(feedId, price, block.timestamp);
    }

    /// @notice Seed the last known price for a feed (admin bootstrap)
    function seedLastKnownPrice(bytes32 feedId, int256 price) external onlyOwner {
        if (price <= 0) revert InvalidPrice(feedId, price);
        lastKnownPrice[feedId] = price;
        emit PriceUpdated(feedId, price, block.timestamp);
    }

    /// @notice Set the address authorised to push prices (owner-only)
    /// @param _priceUpdater New price updater address (address(0) to revoke)
    function setPriceUpdater(address _priceUpdater) external onlyOwner {
        emit PriceUpdaterUpdated(priceUpdater, _priceUpdater);
        priceUpdater = _priceUpdater;
    }

    // ─── IOracleAdapter ───────────────────────────────────────────────────

    /// @inheritdoc IOracleAdapter
    function getPrice(
        bytes32 feedId,
        bytes[] calldata
    ) external payable override returns (int256 price, uint256 timestamp) {
        return _readPrice(feedId);
    }

    /// @inheritdoc IOracleAdapter
    function getSettlementPrice(
        bytes32 feedId,
        bytes[] calldata,
        uint64
    ) external payable override returns (int256 price, uint256 timestamp) {
        return _readPrice(feedId);
    }

    /// @inheritdoc IOracleAdapter
    function getUpdateFee(bytes[] calldata) external pure override returns (uint256) {
        return 0; // No fee required — prices are pushed, not pulled
    }

    // ─── Admin ────────────────────────────────────────────────────────────

    /// @notice Set the fallback oracle
    function setFallbackOracle(address _fallbackOracle) external onlyOwner {
        address oldOracle = address(fallbackOracle);
        fallbackOracle = IOracleAdapter(_fallbackOracle);
        emit FallbackOracleUpdated(oldOracle, _fallbackOracle);
    }

    /// @notice Update the maximum staleness parameter
    function setMaxStaleness(uint256 _maxStaleness) external onlyOwner {
        if (_maxStaleness == 0) revert InvalidParameter();
        uint256 oldValue = maxStaleness;
        maxStaleness = _maxStaleness;
        emit MaxStalenessUpdated(oldValue, _maxStaleness);
    }

    /// @notice Update the maximum price deviation
    function setMaxDeviationBps(uint256 _maxDeviationBps) external onlyOwner {
        if (_maxDeviationBps == 0) revert InvalidParameter();
        uint256 oldValue = maxDeviationBps;
        maxDeviationBps = _maxDeviationBps;
        emit MaxDeviationBpsUpdated(oldValue, _maxDeviationBps);
    }

    // ─── Internal ─────────────────────────────────────────────────────────

    /// @dev Store a validated price
    function _updatePrice(bytes32 feedId, int256 price, uint256 timestamp) internal {
        if (price <= 0) revert InvalidPrice(feedId, price);

        // Deviation check against last known price (if available)
        int256 _lastKnown = lastKnownPrice[feedId];
        if (_lastKnown > 0) {
            uint256 deviation = _calculateDeviationBps(price, _lastKnown);
            if (deviation > maxDeviationBps) {
                revert ExcessiveDeviation(feedId, price, _lastKnown);
            }
        }

        latestPrices[feedId] = PriceData(price, timestamp);
        lastKnownPrice[feedId] = price;
        emit PriceUpdated(feedId, price, timestamp);
    }

    /// @dev Read and validate stored price
    function _readPrice(bytes32 feedId) internal view returns (int256 price, uint256 timestamp) {
        PriceData memory data = latestPrices[feedId];
        if (data.price <= 0) revert InvalidPrice(feedId, data.price);

        // Staleness check
        if (block.timestamp - data.timestamp > maxStaleness) {
            revert StalePrice(feedId, data.timestamp, block.timestamp);
        }

        return (data.price, data.timestamp);
    }

    /// @dev Calculate deviation between two prices in basis points.
    ///      Returns minimum 1 bps for any non-zero difference to prevent truncation to zero.
    function _calculateDeviationBps(int256 newPrice, int256 oldPrice) internal pure returns (uint256) {
        int256 diff = newPrice - oldPrice;
        if (diff < 0) diff = -diff;
        uint256 result = uint256(diff * int256(BPS_DENOMINATOR) / oldPrice);
        if (diff > 0 && result == 0) result = 1;
        return result;
    }
}
