// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity 0.8.24;

interface ISnowballLend {
    // View functions
    function owner() external view returns (address);
    function feeRecipient() external view returns (address);
    function isIrmEnabled(address irm) external view returns (bool);
    function isLltvEnabled(uint256 lltv) external view returns (bool);
    function isAuthorized(address authorizer, address authorized) external view returns (bool);
    function supplyShares(bytes32 id, address user) external view returns (uint256);
    function borrowShares(bytes32 id, address user) external view returns (uint256);
    function collateral(bytes32 id, address user) external view returns (uint256);
    function market(bytes32 id) external view returns (uint128, uint128, uint128, uint128, uint128, uint128);
    function idToMarketParams(bytes32 id) external view returns (address, address, address, address, uint256);

    // Admin functions
    function setOwner(address newOwner) external;
    function setFeeRecipient(address newFeeRecipient) external;
    function enableIrm(address irm) external;
    function enableLltv(uint256 lltv) external;
    function setFee(bytes32 id, uint256 newFee) external;
    function setAuthorization(address authorized, bool newIsAuthorized) external;

    // Interest
    function accrueInterest(bytes32 id) external;

    // Core lending functions
    function supply(bytes32 id, uint256 assets, uint256 shares, address onBehalf, bytes calldata data) external returns (uint256, uint256);
    function withdraw(bytes32 id, uint256 assets, uint256 shares, address onBehalf, address receiver) external returns (uint256, uint256);
    function borrow(bytes32 id, uint256 assets, uint256 shares, address onBehalf, address receiver) external returns (uint256, uint256);
    function repay(bytes32 id, uint256 assets, uint256 shares, address onBehalf, bytes calldata data) external returns (uint256, uint256);
    function supplyCollateral(bytes32 id, uint256 assets, address onBehalf, bytes calldata data) external;
    function withdrawCollateral(bytes32 id, uint256 assets, address onBehalf, address receiver) external;
    function liquidate(bytes32 id, address borrower, uint256 seizedAssets, uint256 repaidShares, bytes calldata data) external returns (uint256, uint256);
}
