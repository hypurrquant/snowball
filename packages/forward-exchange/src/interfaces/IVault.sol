// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

/// @title IVault
/// @notice Interface for the collateral vault managing USDC deposits
interface IVault {
    /// @notice Deposit USDC into the vault
    /// @param amount The amount of USDC to deposit (6 decimals)
    function deposit(uint256 amount) external;

    /// @notice Withdraw free (unlocked) USDC from the vault
    /// @param amount The amount of USDC to withdraw (6 decimals)
    function withdraw(uint256 amount) external;

    /// @notice Lock collateral for a position (internal, called by primitives)
    /// @param user The user whose collateral to lock
    /// @param positionId The position ID
    /// @param amount The amount to lock (6 decimals)
    function lockCollateral(address user, uint256 positionId, uint256 amount) external;

    /// @notice Unlock collateral from a position (internal, called by primitives)
    /// @param user The user whose collateral to unlock
    /// @param positionId The position ID
    /// @param amount The amount to unlock (6 decimals)
    function unlockCollateral(address user, uint256 positionId, uint256 amount) external;

    /// @notice Settle a position by redistributing collateral (internal, called by settlement engine)
    /// @param positionId The position ID
    /// @param winner The address receiving the PnL
    /// @param loser The address paying the PnL
    /// @param pnl The absolute PnL amount (6 decimals)
    function settlePosition(uint256 positionId, address winner, address loser, uint256 pnl) external;

    /// @notice Get the free (unlocked) balance of a user
    /// @param user The user address
    /// @return The free balance (6 decimals)
    function freeBalance(address user) external view returns (uint256);

    /// @notice Get the locked balance of a user
    /// @param user The user address
    /// @return The locked balance (6 decimals)
    function lockedBalance(address user) external view returns (uint256);

    /// @notice Get the collateral locked for a specific position
    /// @param positionId The position ID
    /// @return The locked amount (6 decimals)
    function positionCollateral(uint256 positionId) external view returns (uint256);

    /// @notice Transfer free balance between users (internal bookkeeping only)
    /// @param from The sender address
    /// @param to The receiver address
    /// @param amount The amount to transfer (6 decimals)
    function internalTransfer(address from, address to, uint256 amount) external;

    event InternalTransfer(address indexed from, address indexed to, uint256 amount);
}
