// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IOptionsClearingHouse {
    event Deposited(address indexed user, uint256 amount);
    event Withdrawn(address indexed user, uint256 amount);
    event EscrowLocked(address indexed user, uint256 amount);
    event EscrowReleased(address indexed user, uint256 amount);
    event EscrowSettled(address indexed user, uint256 amount, address indexed recipient);
    event FeesCollected(uint256 amount);

    function deposit() external payable;
    function withdraw(uint256 amount) external;

    function balanceOf(address user) external view returns (uint256);
    function escrowOf(address user) external view returns (uint256);

    function lockInEscrow(address user, uint256 amount) external;
    function releaseFromEscrow(address user, uint256 amount) external;
    function settleEscrow(address from, address to, uint256 amount) external;

    function collectFee(address from, uint256 amount) external;
    function flushFeesToRevenue(address recipient) external;
    function accumulatedFees() external view returns (uint256);
}
