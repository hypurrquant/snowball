// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {ISnowballLend} from "./ISnowballLend.sol";

/// @title ISnowballLendFull - Extended Morpho Blue interface
/// @dev Adds borrow, collateral, repay, and flash loan functions.
interface ISnowballLendFull is ISnowballLend {
    function borrow(
        MarketParams memory marketParams,
        uint256 assets,
        uint256 shares,
        address onBehalf,
        address receiver
    ) external returns (uint256 assetsBorrowed, uint256 sharesBorrowed);

    function supplyCollateral(
        MarketParams memory marketParams,
        uint256 assets,
        address onBehalf,
        bytes memory data
    ) external;

    function withdrawCollateral(
        MarketParams memory marketParams,
        uint256 assets,
        address onBehalf,
        address receiver
    ) external;

    function repay(
        MarketParams memory marketParams,
        uint256 assets,
        uint256 shares,
        address onBehalf,
        bytes memory data
    ) external returns (uint256 assetsRepaid, uint256 sharesRepaid);

    function flashLoan(address token, uint256 assets, bytes calldata data) external;

    function idToMarketParams(bytes32 id)
        external
        view
        returns (
            address loanToken,
            address collateralToken,
            address oracle,
            address irm,
            uint256 lltv
        );
}

/// @dev Callback interface for Morpho flash loans.
interface IMorphoFlashLoanCallback {
    function onMorphoFlashLoan(uint256 assets, bytes calldata data) external;
}
