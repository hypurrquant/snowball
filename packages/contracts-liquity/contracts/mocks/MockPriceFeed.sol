// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "../interfaces/IPriceFeed.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/// @title MockPriceFeed — Controllable price oracle for testnet
contract MockPriceFeed is IPriceFeed, Ownable {
    uint256 public lastGoodPrice;
    bool public priceIsValid = true;

    event PriceUpdated(uint256 newPrice);

    constructor(uint256 _initialPrice) Ownable(msg.sender) {
        lastGoodPrice = _initialPrice;
    }

    function setPrice(uint256 _price) external override onlyOwner {
        lastGoodPrice = _price;
        emit PriceUpdated(_price);
    }

    function fetchPrice() external view override returns (uint256, bool) {
        return (lastGoodPrice, priceIsValid);
    }

    function setPriceIsValid(bool _valid) external onlyOwner {
        priceIsValid = _valid;
    }
}
