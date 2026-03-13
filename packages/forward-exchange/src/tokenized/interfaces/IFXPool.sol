// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

/// @title IFXPool
/// @notice Interface for the Yield Space AMM pool (fToken/sfToken)
interface IFXPool {
    // ─── Errors ───
    error ZeroAmount();
    error SlippageExceeded(uint256 amountOut, uint256 minAmountOut);
    error InvalidToken();
    error InsufficientLiquidity();
    error PoolAlreadyInitialized();
    error PoolNotInitialized();
    error InvalidRatio();
    error MinimumReserveBreach();
    error TradeTooLarge();

    // ─── Events ───
    event Swap(
        address indexed user,
        address indexed tokenIn,
        uint256 amountIn,
        uint256 amountOut,
        uint256 feeAmount
    );
    event LiquidityAdded(
        address indexed provider,
        uint256 amountX,
        uint256 amountY,
        uint256 lpTokens
    );
    event LiquidityRemoved(
        address indexed provider,
        uint256 amountX,
        uint256 amountY,
        uint256 lpTokens
    );

    // ─── Mutative ───

    /// @notice Initialize the pool with first liquidity
    /// @param fToken The fToken address
    /// @param sfToken The sfToken address
    /// @param maturity Maturity timestamp
    /// @param totalLifetime Pool total lifetime in seconds
    /// @param tMax Maximum curvature parameter (WAD)
    /// @param tMin Minimum curvature parameter (WAD)
    /// @param feeMax Maximum swap fee (WAD)
    function initialize(
        address fToken,
        address sfToken,
        uint256 maturity,
        uint256 totalLifetime,
        uint256 tMax,
        uint256 tMin,
        uint256 feeMax
    ) external;

    /// @notice Swap tokenIn for the other token
    /// @param tokenIn Address of the token to swap in
    /// @param amountIn Amount to swap in (18 decimals)
    /// @param minAmountOut Minimum output (slippage protection)
    /// @return amountOut Amount received
    function swap(
        address tokenIn,
        uint256 amountIn,
        uint256 minAmountOut
    ) external returns (uint256 amountOut);

    /// @notice Add liquidity to the pool
    /// @param amountX fToken amount (18 decimals)
    /// @param amountY sfToken amount (18 decimals)
    /// @param minLpTokens Minimum LP tokens to receive
    /// @return lpTokens LP tokens minted
    function addLiquidity(
        uint256 amountX,
        uint256 amountY,
        uint256 minLpTokens
    ) external returns (uint256 lpTokens);

    /// @notice Remove liquidity from the pool
    /// @param lpTokens LP tokens to burn
    /// @param minX Minimum fToken to receive
    /// @param minY Minimum sfToken to receive
    /// @return amountX fToken received
    /// @return amountY sfToken received
    function removeLiquidity(
        uint256 lpTokens,
        uint256 minX,
        uint256 minY
    ) external returns (uint256 amountX, uint256 amountY);

    /// @notice Update pool curvature and fee parameters (admin only)
    function setParameters(uint256 tMax, uint256 tMin, uint256 feeMax) external;

    // ─── Views ───

    function getReserves() external view returns (uint256 reserveX, uint256 reserveY);
    function getCurrentT() external view returns (uint256 t);
    function getSkew() external view returns (uint256 skew);
    function getInvariantK() external view returns (uint256 k);
    function quoteSwap(address tokenIn, uint256 amountIn) external view returns (uint256 amountOut, uint256 fee);
    function fToken() external view returns (address);
    function sfToken() external view returns (address);
}
