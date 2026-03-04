// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

/// @title IStabilityPool - Minimal interface for Liquity V2 StabilityPool
/// @dev Matches the original Liquity V2 (Bold) StabilityPool interface.
interface IStabilityPool {
    function provideToSP(uint256 _amount, bool _doClaim) external;
    function withdrawFromSP(uint256 _amount, bool _doClaim) external;
    function claimAllCollGains() external;
    function getCompoundedBoldDeposit(address _depositor) external view returns (uint256);
    function getDepositorCollGain(address _depositor) external view returns (uint256);
}
