// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity 0.8.24;

interface ISnowballVault {
    function asset() external view returns (address);
    function totalAssets() external view returns (uint256);
    function deposit(uint256 assets, address receiver) external returns (uint256 shares);
    function withdraw(uint256 assets, address receiver, address owner) external returns (uint256 shares);
    function redeem(uint256 shares, address receiver, address owner) external returns (uint256 assets);
    function mint(uint256 shares, address receiver) external returns (uint256 assets);
    function previewDeposit(uint256 assets) external view returns (uint256 shares);
    function previewWithdraw(uint256 assets) external view returns (uint256 shares);
    function previewRedeem(uint256 shares) external view returns (uint256 assets);
    function previewMint(uint256 shares) external view returns (uint256 assets);
    function maxDeposit(address receiver) external view returns (uint256);
    function maxWithdraw(address owner) external view returns (uint256);
    function maxRedeem(address owner) external view returns (uint256);
    function maxMint(address receiver) external view returns (uint256);
}
