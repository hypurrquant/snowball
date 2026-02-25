// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

/// @title IStabilityPool - Minimal interface for Liquity StabilityPool
interface IStabilityPool {
    function provideToSP(uint256 amount, bool doClaim) external;
    function withdrawFromSP(uint256 amount, bool doClaim) external;
    function claimAllCollGains() external;
    function getCompoundedBoldDeposit(address depositor) external view returns (uint256);
    function getDepositorCollGain(address depositor) external view returns (uint256);
    function getDepositorYieldGain(address depositor) external view returns (uint256);
    function getDepositorYieldGainWithPending(address depositor) external view returns (uint256);
}
