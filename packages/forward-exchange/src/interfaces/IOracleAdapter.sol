// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

/// @title IOracleAdapter
/// @notice Oracle adapter interface for price feeds
interface IOracleAdapter {
    /// @notice Get the latest price for a feed, updating with provided data
    /// @param feedId The price feed identifier
    /// @param priceUpdate The price update data (optional, adapter-specific)
    /// @return price The price in 18 decimals
    /// @return timestamp The price publish timestamp
    function getPrice(
        bytes32 feedId,
        bytes[] calldata priceUpdate
    ) external payable returns (int256 price, uint256 timestamp);

    /// @notice Get the settlement price for a specific time window
    /// @param feedId The price feed identifier
    /// @param priceUpdate The price update data (optional, adapter-specific)
    /// @param settlementTime The target settlement timestamp
    /// @return price The settlement price in 18 decimals
    /// @return timestamp The actual price publish timestamp
    function getSettlementPrice(
        bytes32 feedId,
        bytes[] calldata priceUpdate,
        uint64 settlementTime
    ) external payable returns (int256 price, uint256 timestamp);

    /// @notice Get the fee required to update prices
    /// @param priceUpdate The price update data
    /// @return fee The required fee in wei
    function getUpdateFee(bytes[] calldata priceUpdate) external view returns (uint256 fee);
}
