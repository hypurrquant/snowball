// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {IOracleAdapter} from "../interfaces/IOracleAdapter.sol";
import {Ownable2Step, Ownable} from "@openzeppelin/contracts/access/Ownable2Step.sol";

/// @title StubOracleAdapter
/// @notice Minimal oracle adapter for testing/demo deployment
/// @dev Used only for the manual settle() path. CRE workflow handles pricing off-chain.
contract StubOracleAdapter is IOracleAdapter, Ownable2Step {
    mapping(bytes32 => int256) public prices;
    mapping(bytes32 => uint256) public lastUpdated;

    error PriceNotSet(bytes32 feedId);

    constructor(address _owner) Ownable(_owner) {}

    /// @notice Admin sets a price for a feed (for demo/testing purposes)
    function setPrice(bytes32 feedId, int256 price) external onlyOwner {
        prices[feedId] = price;
        lastUpdated[feedId] = block.timestamp;
    }

    /// @inheritdoc IOracleAdapter
    function getPrice(
        bytes32 feedId,
        bytes[] calldata
    ) external payable override returns (int256 price, uint256 timestamp) {
        price = prices[feedId];
        if (price <= 0) revert PriceNotSet(feedId);
        timestamp = lastUpdated[feedId];
    }

    /// @inheritdoc IOracleAdapter
    function getSettlementPrice(
        bytes32 feedId,
        bytes[] calldata,
        uint64
    ) external payable override returns (int256 price, uint256 timestamp) {
        price = prices[feedId];
        if (price <= 0) revert PriceNotSet(feedId);
        timestamp = lastUpdated[feedId];
    }

    /// @inheritdoc IOracleAdapter
    function getUpdateFee(bytes[] calldata) external pure override returns (uint256) {
        return 0;
    }
}
