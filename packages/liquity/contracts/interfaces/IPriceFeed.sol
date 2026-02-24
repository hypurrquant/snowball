// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IPriceFeed {
    function lastGoodPrice() external view returns (uint256);
    function fetchPrice() external view returns (uint256, bool);
    function setPrice(uint256 _price) external;
}
