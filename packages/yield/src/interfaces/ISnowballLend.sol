// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

/// @title ISnowballLend - Minimal interface for Morpho Blue
/// @dev ABI-compatible with the original Morpho Blue contract.
///      Uses `bytes32` for Id (the custom type `Id` is `bytes32` under the hood).
interface ISnowballLend {
    struct MarketParams {
        address loanToken;
        address collateralToken;
        address oracle;
        address irm;
        uint256 lltv;
    }

    function supply(
        MarketParams memory marketParams,
        uint256 assets,
        uint256 shares,
        address onBehalf,
        bytes memory data
    ) external returns (uint256 assetsSupplied, uint256 sharesSupplied);

    function withdraw(
        MarketParams memory marketParams,
        uint256 assets,
        uint256 shares,
        address onBehalf,
        address receiver
    ) external returns (uint256 assetsWithdrawn, uint256 sharesWithdrawn);

    /// @dev Returns (supplyShares, borrowShares, collateral) for a position.
    function position(bytes32 id, address user) external view returns (uint256, uint128, uint128);

    /// @return totalSupplyAssets, totalSupplyShares, totalBorrowAssets, totalBorrowShares, lastUpdate, fee
    function market(bytes32 id) external view returns (uint128, uint128, uint128, uint128, uint128, uint128);

    function accrueInterest(MarketParams memory marketParams) external;
}
