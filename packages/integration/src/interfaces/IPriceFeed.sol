// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/// @title IPriceFeed - Liquity V2 price feed interface
/// @dev Copied from packages/liquity/contracts/src/Interfaces/IPriceFeed.sol
interface IPriceFeed {
    function fetchPrice() external returns (uint256, bool);
    function fetchRedemptionPrice() external returns (uint256, bool);
    function lastGoodPrice() external view returns (uint256);
}
