// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IStabilityPool {
    function setAddressesRegistry(address _addressesRegistry) external;
    function provideToSP(uint256 _amount) external;
    function withdrawFromSP(uint256 _amount) external;
    function claimReward() external;
    function getTotalBoldDeposits() external view returns (uint256);
    function getDepositorBoldGain(address _depositor) external view returns (uint256);
    function getDepositorCollGain(address _depositor) external view returns (uint256);
    function getCompoundedBoldDeposit(address _depositor) external view returns (uint256);
    function offset(uint256 _debtToOffset, uint256 _collToAdd) external;
    function triggerBoldRewards(uint256 _boldYield) external;
}
