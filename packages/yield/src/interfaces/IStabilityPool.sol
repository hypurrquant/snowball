// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

/// @title IStabilityPool - Minimal interface for Liquity StabilityPool
/// @dev Matches the actually deployed SP bytecode on Creditcoin Testnet.
///      getDepositorYieldGain / getDepositorYieldGainWithPending do NOT exist
///      in the deployed contract (different Liquity build), so they are omitted.
interface IStabilityPool {
    function provideToSP(uint256 amount) external;
    function withdrawFromSP(uint256 amount) external;
    function claimAllCollGains() external;
    function getCompoundedBoldDeposit(address depositor) external view returns (uint256);
    function getDepositorCollGain(address depositor) external view returns (uint256);
}
