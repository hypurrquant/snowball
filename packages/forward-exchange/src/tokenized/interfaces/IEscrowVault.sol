// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

/// @title IEscrowVault
/// @notice Interface for USDC escrow management per series
interface IEscrowVault {
    // ─── Errors ───
    error ZeroAmount();
    error ZeroAddress();
    error InsufficientBalance(bytes32 seriesId, uint256 requested, uint256 available);

    // ─── Events ───
    event Deposited(bytes32 indexed seriesId, uint256 amount);
    event ReleasedToUser(address indexed user, uint256 amount);
    event ReleasedToFactory(uint256 amount);

    // ─── Mutative ───

    /// @notice Deposit USDC for a series (only FACTORY_ROLE)
    /// @param seriesId The series identifier
    /// @param amount USDC amount (6 decimals)
    function depositFor(bytes32 seriesId, uint256 amount) external;

    /// @notice Release USDC to a user after settlement (only FACTORY_ROLE)
    /// @param seriesId The series identifier
    /// @param user Recipient address
    /// @param amount USDC amount (6 decimals)
    function releaseToUser(bytes32 seriesId, address user, uint256 amount) external;

    /// @notice Release USDC back to factory (only FACTORY_ROLE)
    /// @param seriesId The series identifier
    /// @param amount USDC amount (6 decimals)
    function releaseToFactory(bytes32 seriesId, uint256 amount) external;

    // ─── Views ───

    function seriesBalance(bytes32 seriesId) external view returns (uint256);
    function totalEscrowed() external view returns (uint256);
}
