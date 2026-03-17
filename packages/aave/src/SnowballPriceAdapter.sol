// SPDX-License-Identifier: MIT
pragma solidity ^0.8.10;

import "./aave-v3-core/contracts/dependencies/chainlink/AggregatorInterface.sol";

/// @title SnowballPriceAdapter
/// @notice Simple Chainlink AggregatorInterface adapter that returns a fixed price.
///         Used by AaveOracle on Creditcoin Testnet where real oracles don't exist.
/// @dev price is stored in 8-decimal format (Aave standard). Owner can update.
contract SnowballPriceAdapter is AggregatorInterface {
    int256 public price;
    address public owner;
    uint256 public updatedAt;

    constructor(int256 _price) {
        price = _price;
        owner = msg.sender;
        updatedAt = block.timestamp;
    }

    function setPrice(int256 _price) external {
        require(msg.sender == owner, "only owner");
        price = _price;
        updatedAt = block.timestamp;
    }

    function latestAnswer() external view override returns (int256) {
        return price;
    }

    function latestTimestamp() external view override returns (uint256) {
        return updatedAt;
    }

    function latestRound() external view override returns (uint256) {
        return 1;
    }

    function getAnswer(uint256) external view override returns (int256) {
        return price;
    }

    function getTimestamp(uint256) external view override returns (uint256) {
        return updatedAt;
    }
}
