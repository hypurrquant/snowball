// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {ISnowballOracle} from "../interfaces/ISnowballOracle.sol";

/// @title AaveOracleAdapter - Adapts SnowballOracle to Chainlink AggregatorInterface
/// @notice Bridges the Snowball oracle (1e18 scale) to the Chainlink AggregatorInterface
///         expected by Aave V3's AaveOracle (1e8 scale).
/// @dev Creditcoin has no native Chainlink feeds. This adapter allows AaveOracle to
///      use SnowballOracle as a price source without modification to Aave V3 contracts.
///
///      Scale conversion: price_1e8 = price_1e18 / 1e10
///
///      Round semantics: SnowballOracle is a push-based oracle with no round history.
///      latestRound() returns 1 as a fixed sentinel. getAnswer/getTimestamp accept any
///      roundId and return the current value, matching AaveOracle's usage pattern which
///      only ever calls latestAnswer().
contract AaveOracleAdapter {
    /// @dev Divisor to convert 1e18 → 1e8.
    uint256 private constant SCALE_DIVISOR = 1e10;

    ISnowballOracle public immutable snowballOracle;
    address public immutable asset;
    uint256 public immutable maxPriceAge;

    constructor(address _oracle, address _asset, uint256 _maxPriceAge) {
        require(_oracle != address(0), "AaveAdapter: zero oracle");
        require(_asset != address(0), "AaveAdapter: zero asset");
        require(_maxPriceAge > 0, "AaveAdapter: zero maxAge");
        snowballOracle = ISnowballOracle(_oracle);
        asset = _asset;
        maxPriceAge = _maxPriceAge;
    }

    // -------------------------------------------------------------------------
    // AggregatorInterface implementation
    // -------------------------------------------------------------------------

    /// @notice Returns the latest asset price in 1e8 scale.
    /// @dev AaveOracle checks `price > 0` before casting to uint256; we return a
    ///      positive int256 on success. Reverts on stale or zero price so that
    ///      AaveOracle falls back to the fallback oracle rather than using a bad value.
    function latestAnswer() external view returns (int256) {
        uint256 p = snowballOracle.getPrice(asset);
        require(p > 0, "AaveAdapter: zero price");
        require(snowballOracle.isFresh(asset, maxPriceAge), "AaveAdapter: stale price");
        return int256(p / SCALE_DIVISOR);
    }

    /// @notice Returns the timestamp of the most recent price update.
    function latestTimestamp() external view returns (uint256) {
        return snowballOracle.lastUpdatedAt(asset);
    }

    /// @notice Returns the current round identifier.
    /// @dev SnowballOracle has no concept of rounds; always returns 1.
    function latestRound() external pure returns (uint256) {
        return 1;
    }

    /// @notice Returns the price for a given roundId.
    /// @dev SnowballOracle keeps no round history; returns the current price for
    ///      any roundId. AaveOracle only calls latestAnswer(), so this is provided
    ///      solely for interface completeness.
    function getAnswer(uint256 /*roundId*/) external view returns (int256) {
        uint256 p = snowballOracle.getPrice(asset);
        if (p == 0) return 0;
        return int256(p / SCALE_DIVISOR);
    }

    /// @notice Returns the timestamp for a given roundId.
    /// @dev Returns the last update timestamp for any roundId (no history available).
    function getTimestamp(uint256 /*roundId*/) external view returns (uint256) {
        return snowballOracle.lastUpdatedAt(asset);
    }
}
