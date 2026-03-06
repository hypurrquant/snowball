// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

/// @title MockOracle — Simple oracle for Morpho markets (18 decimals)
/// @notice Implements IOracle.price() interface expected by SnowballLend
contract MockOracle {
    uint256 public price;
    address public owner;

    event PriceUpdated(uint256 newPrice);

    modifier onlyOwner() {
        require(msg.sender == owner, "MockOracle: not owner");
        _;
    }

    constructor(uint256 _initialPrice) {
        owner = msg.sender;
        price = _initialPrice;
    }

    function setPrice(uint256 _newPrice) external onlyOwner {
        price = _newPrice;
        emit PriceUpdated(_newPrice);
    }

    function transferOwnership(address _newOwner) external onlyOwner {
        owner = _newOwner;
    }
}
