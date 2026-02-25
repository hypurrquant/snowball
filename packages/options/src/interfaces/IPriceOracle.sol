// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title IPriceOracle
/// @notice Minimal oracle interface for the options protocol
interface IPriceOracle {
    /// @notice Returns the current price (1e18 scale) and whether it's fresh
    function fetchPrice() external view returns (uint256 price, bool isFresh);
}
