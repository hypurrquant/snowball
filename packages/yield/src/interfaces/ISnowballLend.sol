// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

/// @title ISnowballLend - Minimal interface for Morpho-based SnowballLend
interface ISnowballLend {
    function supply(
        bytes32 id,
        uint256 assets,
        uint256 shares,
        address onBehalf,
        bytes calldata data
    ) external returns (uint256 assetsSupplied, uint256 sharesSupplied);

    function withdraw(
        bytes32 id,
        uint256 assets,
        uint256 shares,
        address onBehalf,
        address receiver
    ) external returns (uint256 assetsWithdrawn, uint256 sharesWithdrawn);

    function supplyShares(bytes32 id, address user) external view returns (uint256);

    /// @return totalSupplyAssets, totalSupplyShares, totalBorrowAssets, totalBorrowShares, lastUpdate, fee
    function market(bytes32 id) external view returns (uint128, uint128, uint128, uint128, uint128, uint128);

    function accrueInterest(bytes32 id) external;
}
