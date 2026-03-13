// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

/// @title IRouter
/// @notice Interface for the user entry point combining mint/swap/LP operations
interface IRouter {
    // ─── Errors ───
    error ZeroAmount();
    error ZeroAddress();
    error SlippageExceeded();

    // ─── Events ───
    event MintAndSwap(
        address indexed user,
        bytes32 indexed seriesId,
        uint256 usdcAmount,
        uint256 tokenReceived,
        bool isFToken
    );
    event MintAndAddLiquidity(
        address indexed user,
        bytes32 indexed seriesId,
        uint256 usdcAmount,
        uint256 lpTokens
    );
    event RemoveLiquidityAndRedeem(
        address indexed user,
        bytes32 indexed seriesId,
        uint256 lpTokensBurned,
        uint256 usdcReceived
    );
    event MintWithAltCollateral(
        address indexed user,
        bytes32 indexed seriesId,
        address indexed collateral,
        uint256 amount,
        uint256 usdcCost
    );

    // ─── Mutative ───

    /// @notice Mint token pair and add both to pool as liquidity
    /// @param seriesId The series to mint
    /// @param usdcAmount USDC to spend (6 decimals)
    /// @param pool FXPool address
    /// @param minLpTokens Minimum LP tokens
    /// @param deadline Timestamp after which the transaction reverts
    /// @return lpTokens LP tokens received
    function mintAndAddLiquidity(
        bytes32 seriesId,
        uint256 usdcAmount,
        address pool,
        uint256 minLpTokens,
        uint256 deadline
    ) external returns (uint256 lpTokens);

    /// @notice Mint pair, swap unwanted side, return desired token
    /// @param seriesId The series to mint
    /// @param usdcAmount USDC to spend (6 decimals)
    /// @param pool FXPool address
    /// @param wantFToken True = keep fToken, False = keep sfToken
    /// @param minAmountOut Minimum tokens to receive
    /// @param deadline Timestamp after which the transaction reverts
    /// @return amountOut Total desired tokens received
    function mintAndSwap(
        bytes32 seriesId,
        uint256 usdcAmount,
        address pool,
        bool wantFToken,
        uint256 minAmountOut,
        uint256 deadline
    ) external returns (uint256 amountOut);

    /// @notice Mint token pair using an alternative collateral (e.g., aUSDC) via CollateralSwap
    /// @param seriesId The series to mint
    /// @param amount Token amount to mint (18 decimals)
    /// @param altCollateral Alternative collateral token address
    /// @param swapContract CollateralSwap contract for 1:1 conversion
    /// @param deadline Timestamp after which the transaction reverts
    function mintWithAltCollateral(
        bytes32 seriesId,
        uint256 amount,
        address altCollateral,
        address swapContract,
        uint256 deadline
    ) external;

    /// @notice Remove liquidity and redeem both tokens for USDC
    /// @param pool FXPool address
    /// @param lpTokens LP tokens to burn
    /// @param seriesId Series for redemption
    /// @param deadline Timestamp after which the transaction reverts
    /// @return usdcReceived Total USDC received
    function removeLiquidityAndRedeem(
        address pool,
        uint256 lpTokens,
        bytes32 seriesId,
        uint256 deadline
    ) external returns (uint256 usdcReceived);

    /// @notice Rollover: redeem settled tokens → mint new series → swap to desired side
    /// @param oldSeriesId The settled series to redeem from
    /// @param newSeriesId The new series to roll into
    /// @param newPool FXPool for the new series
    /// @param amount Token amount to roll (18 decimals)
    /// @param isFToken True = rolling fToken, False = rolling sfToken
    /// @param minAmountOut Minimum tokens to receive in new series
    /// @param deadline Timestamp after which the transaction reverts
    /// @return amountOut Desired tokens received in new series
    function redeemAndRoll(
        bytes32 oldSeriesId,
        bytes32 newSeriesId,
        address newPool,
        uint256 amount,
        bool isFToken,
        uint256 minAmountOut,
        uint256 deadline
    ) external returns (uint256 amountOut);

    event RedeemAndRoll(
        address indexed user,
        bytes32 indexed oldSeriesId,
        bytes32 indexed newSeriesId,
        uint256 redeemedUsdc,
        uint256 tokenReceived,
        bool isFToken
    );

    // ─── Auto-Routing ───

    /// @notice Buy fToken/sfToken with USDC — auto-routes via best path
    /// @param seriesId Series to buy tokens from
    /// @param usdcAmount USDC to spend (6 decimals)
    /// @param usdcPool FXPoolUSDC address (fToken/USDC)
    /// @param ysPool FXPool address (fToken/sfToken Yield Space), address(0) to skip
    /// @param wantFToken True = buy fToken, False = buy sfToken
    /// @param minAmountOut Minimum tokens to receive
    /// @param deadline Timestamp after which the transaction reverts
    function buyToken(
        bytes32 seriesId,
        uint256 usdcAmount,
        address usdcPool,
        address ysPool,
        bool wantFToken,
        uint256 minAmountOut,
        uint256 deadline
    ) external returns (uint256 amountOut);

    /// @notice Sell fToken for USDC via USDC pool (direct)
    /// @param seriesId Series of the token being sold
    /// @param tokenAmount Token amount to sell (18 decimals)
    /// @param usdcPool FXPoolUSDC address
    /// @param isFToken True = selling fToken, False = selling sfToken (requires ysPool)
    /// @param minUsdcOut Minimum USDC to receive
    /// @param deadline Timestamp after which the transaction reverts
    function sellToken(
        bytes32 seriesId,
        uint256 tokenAmount,
        address usdcPool,
        bool isFToken,
        uint256 minUsdcOut,
        uint256 deadline
    ) external returns (uint256 usdcOut);

    /// @notice Sell any token for USDC — sfToken auto-routes via YS Pool → USDC Pool
    /// @param seriesId Series of the token being sold
    /// @param tokenAmount Token amount to sell (18 decimals)
    /// @param usdcPool FXPoolUSDC address (fToken/USDC)
    /// @param ysPool FXPool address (fToken/sfToken), used for sfToken→fToken hop
    /// @param isFToken True = selling fToken (direct), False = selling sfToken (2-hop)
    /// @param minUsdcOut Minimum USDC to receive
    /// @param deadline Timestamp after which the transaction reverts
    function sellTokenMultiHop(
        bytes32 seriesId,
        uint256 tokenAmount,
        address usdcPool,
        address ysPool,
        bool isFToken,
        uint256 minUsdcOut,
        uint256 deadline
    ) external returns (uint256 usdcOut);

    event BuyToken(
        address indexed user,
        bytes32 indexed seriesId,
        uint256 usdcAmount,
        uint256 tokenReceived,
        bool isFToken
    );
    event SellToken(
        address indexed user,
        bytes32 indexed seriesId,
        uint256 tokenAmount,
        uint256 usdcReceived,
        bool isFToken
    );
}
