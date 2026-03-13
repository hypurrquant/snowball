// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

/// @title ISettlementEngine
/// @notice Interface for the settlement engine handling maturity settlements
interface ISettlementEngine {
    /// @notice Settle a forward position at maturity
    /// @param positionId The position ID (Long NFT tokenId)
    /// @param priceUpdate Oracle price update data
    function settle(uint256 positionId, bytes[] calldata priceUpdate) external payable;

    /// @notice Calculate PnL for an NDF forward
    /// @param notional The notional amount (USDC, 6 decimals)
    /// @param forwardRate The agreed forward rate (18 decimals)
    /// @param settlementRate The settlement spot rate (18 decimals)
    /// @return pnl The PnL amount (can be negative, 6 decimals)
    function calculatePnL(
        uint256 notional,
        int256 forwardRate,
        int256 settlementRate
    ) external pure returns (int256 pnl);
}
