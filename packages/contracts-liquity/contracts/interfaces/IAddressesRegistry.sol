// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

interface IAddressesRegistry {
    function borrowerOperations() external view returns (address);
    function troveManager() external view returns (address);
    function stabilityPool() external view returns (address);
    function activePool() external view returns (address);
    function defaultPool() external view returns (address);
    function gasPool() external view returns (address);
    function collSurplusPool() external view returns (address);
    function sortedTroves() external view returns (address);
    function troveNFT() external view returns (address);
    function priceFeed() external view returns (address);
    function sbUSDToken() external view returns (address);
    function collToken() external view returns (address);
    function CCR() external view returns (uint256);
    function MCR() external view returns (uint256);

    function setAddresses(
        address _borrowerOperations,
        address _troveManager,
        address _stabilityPool,
        address _activePool,
        address _defaultPool,
        address _gasPool,
        address _collSurplusPool,
        address _sortedTroves,
        address _troveNFT,
        address _priceFeed,
        address _sbUSDToken,
        address _collToken
    ) external;
}
