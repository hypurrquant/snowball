// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

interface ISbUSDToken is IERC20 {
    function mint(address _account, uint256 _amount) external;
    function burn(address _account, uint256 _amount) external;
    function setBranchAddresses(
        address _troveManagerAddress,
        address _stabilityPoolAddress,
        address _borrowerOperationsAddress,
        address _activePoolAddress
    ) external;
    function setCollateralRegistry(address _collateralRegistryAddress) external;
}
