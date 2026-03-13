// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

/// @title IFXPoolUSDC
/// @notice Interface for constant-product AMM pool (fToken ↔ USDC)
interface IFXPoolUSDC {
    // ─── Errors ───
    error ZeroAmount();
    error InvalidToken();
    error SlippageExceeded(uint256 amountOut, uint256 minAmountOut);
    error InsufficientLiquidity();

    // ─── Events ───
    event Swap(address indexed user, address indexed tokenIn, uint256 amountIn, uint256 amountOut, uint256 feeAmount);
    event LiquidityAdded(address indexed provider, uint256 amountFToken, uint256 amountUSDC, uint256 lpTokens);
    event LiquidityRemoved(address indexed provider, uint256 amountFToken, uint256 amountUSDC, uint256 lpTokens);
    event ProtocolFeesCollected(uint256 feesF, uint256 feesUSDC);

    // ─── Mutative ───

    /// @notice Swap fToken ↔ USDC
    function swap(address tokenIn, uint256 amountIn, uint256 minAmountOut) external returns (uint256 amountOut);

    /// @notice Add liquidity proportional to current reserves
    function addLiquidity(uint256 amountFToken, uint256 amountUSDC, uint256 minLpTokens) external returns (uint256 lpTokens);

    /// @notice Remove liquidity and receive both tokens proportionally
    function removeLiquidity(uint256 lpTokens, uint256 minFToken, uint256 minUSDC) external returns (uint256 amountFToken, uint256 amountUSDC);

    /// @notice Collect accumulated protocol fees
    function collectProtocolFees() external;

    // ─── Views ───

    /// @notice Quote a swap without executing
    function quoteSwap(address tokenIn, uint256 amountIn) external view returns (uint256 amountOut);

    /// @notice Current reserves
    function getReserves() external view returns (uint256 reserveFToken, uint256 reserveUSDC);

    function F_TOKEN() external view returns (address);
    function USDC() external view returns (address);
}
