// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IActivePool {
    function setAddressesRegistry(address _addressesRegistry) external;
    function getCollBalance() external view returns (uint256);
    function getBoldDebt() external view returns (uint256);
    function aggWeightedDebtSum() external view returns (uint256);
    function sendColl(address _account, uint256 _amount) external;
    function receiveColl(uint256 _amount) external;
    function increaseCollBalance(uint256 _amount) external;
    function increaseBoldDebt(uint256 _amount) external;
    function decreaseBoldDebt(uint256 _amount) external;
    function increaseAggWeightedDebtSum(uint256 _amount) external;
    function decreaseAggWeightedDebtSum(uint256 _amount) external;
}
