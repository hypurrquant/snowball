// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

/// @title IMaturityToken
/// @notice Interface for ERC-20 maturity tokens (fKRW, sfKRW)
interface IMaturityToken {
    // ─── Errors ───
    error NotSettled();
    error AlreadySettled();
    error ZeroAmount();
    error ZeroAddress();
    error NothingToRedeem();

    // ─── Events ───
    event Settled(int256 settlementRate, uint256 redemptionRate);
    event Redeemed(address indexed user, uint256 tokensBurned, uint256 usdcReceived);
    event CounterpartSet(address indexed counterpart);

    // ─── Mutative ───

    /// @notice Mint tokens (only MINTER_ROLE)
    /// @param to Recipient
    /// @param amount Amount in 18 decimals
    function mint(address to, uint256 amount) external;

    /// @notice Settle the token with oracle rate (only SETTLER_ROLE)
    /// @param settlementRate The spot rate at maturity (18 decimals)
    function settle(int256 settlementRate) external;

    /// @notice Burn settled tokens and receive USDC from escrow
    /// @param amount Amount of tokens to redeem (18 decimals)
    function redeem(uint256 amount) external;

    /// @notice Set the counterpart token address (only MINTER_ROLE, one-time)
    /// @param counterpart The paired token address
    function setCounterpart(address counterpart) external;

    // ─── Views ───

    function MARKET_ID() external view returns (bytes32);
    function MATURITY_TIME() external view returns (uint256);
    function FORWARD_RATE() external view returns (int256);
    function IS_LONG() external view returns (bool);
    function counterpart() external view returns (address);
    function isSettled() external view returns (bool);
    function redemptionRate() external view returns (uint256);
}
