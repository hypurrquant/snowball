// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

/**
 * @title MockOracle
 * @notice Simple price oracle for Snowball Lend testnet markets.
 *         Returns price as 1e36 / collateralPrice denominated in loan token.
 */
contract MockOracle {
    uint256 public price;
    address public owner;

    event PriceUpdated(uint256 newPrice);

    constructor(uint256 _initialPrice) {
        price = _initialPrice;
        owner = msg.sender;
    }

    function setPrice(uint256 _price) external {
        require(msg.sender == owner, "MockOracle: not owner");
        price = _price;
        emit PriceUpdated(_price);
    }

    /// @notice Returns price scaled to 1e36 (Morpho oracle standard)
    function getPrice() external view returns (uint256) {
        return price;
    }
}
