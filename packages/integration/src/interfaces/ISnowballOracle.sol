// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

/// @title ISnowballOracle - Unified price oracle interface
/// @notice Single source of truth for asset prices across Snowball protocol.
///         Stores prices at 1e18 precision; adapters convert to protocol-specific formats.
interface ISnowballOracle {
    event PriceUpdated(address indexed asset, uint256 price, uint256 timestamp);

    /// @notice Update the price for an asset. Only callable by OPERATOR_ROLE.
    function updatePrice(address asset, uint256 price) external;

    /// @notice Get the stored price for an asset (1e18 precision).
    function getPrice(address asset) external view returns (uint256);

    /// @notice Get the last update timestamp for an asset.
    function lastUpdatedAt(address asset) external view returns (uint256);

    /// @notice Check if the price for an asset is fresh (updated within maxAge seconds).
    function isFresh(address asset, uint256 maxAge) external view returns (bool);
}
