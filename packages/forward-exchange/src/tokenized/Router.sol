// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {IRouter} from "./interfaces/IRouter.sol";
import {IMaturityTokenFactory} from "./interfaces/IMaturityTokenFactory.sol";
import {IFXPool} from "./interfaces/IFXPool.sol";
import {IFXPoolUSDC} from "./interfaces/IFXPoolUSDC.sol";
import {CollateralSwap} from "./CollateralSwap.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IERC20Metadata} from "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/// @title Router
/// @notice User entry point for combined mint/swap/LP operations
contract Router is IRouter, ReentrancyGuard {
    using SafeERC20 for IERC20;

    IMaturityTokenFactory public immutable FACTORY;
    IERC20 public immutable USDC;

    modifier checkDeadline(uint256 deadline) {
        require(block.timestamp <= deadline, "Transaction expired");
        _;
    }

    constructor(address _factory, address _usdc) {
        if (_factory == address(0) || _usdc == address(0)) revert ZeroAddress();
        FACTORY = IMaturityTokenFactory(_factory);
        USDC = IERC20(_usdc);
    }

    /// @inheritdoc IRouter
    function mintAndAddLiquidity(
        bytes32 seriesId,
        uint256 usdcAmount,
        address pool,
        uint256 minLpTokens,
        uint256 deadline
    ) external override nonReentrant checkDeadline(deadline) returns (uint256 lpTokens) {
        if (usdcAmount == 0) revert ZeroAmount();
        if (pool == address(0)) revert ZeroAddress();

        // Transfer USDC from user
        USDC.safeTransferFrom(msg.sender, address(this), usdcAmount);

        // Approve factory to spend USDC
        USDC.approve(address(FACTORY), usdcAmount);

        // Mint token pair: usdcAmount buys (usdcAmount * 1e18 / 2e6) tokens each
        uint256 tokenAmount = usdcAmount * 1e18 / 2e6;
        FACTORY.mint(seriesId, tokenAmount);

        // Get token addresses
        IMaturityTokenFactory.Series memory s = FACTORY.getSeries(seriesId);

        // Approve pool to spend both tokens
        IERC20(s.fToken).approve(pool, tokenAmount);
        IERC20(s.sfToken).approve(pool, tokenAmount);

        // Add liquidity with equal amounts
        lpTokens = IFXPool(pool).addLiquidity(tokenAmount, tokenAmount, minLpTokens);

        emit MintAndAddLiquidity(msg.sender, seriesId, usdcAmount, lpTokens);
    }

    /// @inheritdoc IRouter
    function mintAndSwap(
        bytes32 seriesId,
        uint256 usdcAmount,
        address pool,
        bool wantFToken,
        uint256 minAmountOut,
        uint256 deadline
    ) external override nonReentrant checkDeadline(deadline) returns (uint256 amountOut) {
        if (usdcAmount == 0) revert ZeroAmount();
        if (pool == address(0)) revert ZeroAddress();

        // Transfer USDC from user
        USDC.safeTransferFrom(msg.sender, address(this), usdcAmount);

        // Approve factory
        USDC.approve(address(FACTORY), usdcAmount);

        // Mint token pair
        uint256 tokenAmount = usdcAmount * 1e18 / 2e6;
        FACTORY.mint(seriesId, tokenAmount);

        IMaturityTokenFactory.Series memory s = FACTORY.getSeries(seriesId);

        // Swap the unwanted token for the wanted one
        address tokenToSwap = wantFToken ? s.sfToken : s.fToken;
        address tokenToKeep = wantFToken ? s.fToken : s.sfToken;

        IERC20(tokenToSwap).approve(pool, tokenAmount);
        uint256 swapOut = IFXPool(pool).swap(tokenToSwap, tokenAmount, 0);

        // Total received = kept amount + swap output
        amountOut = tokenAmount + swapOut;
        if (amountOut < minAmountOut) revert SlippageExceeded();

        // Transfer desired tokens to user
        IERC20(tokenToKeep).safeTransfer(msg.sender, amountOut);

        emit MintAndSwap(msg.sender, seriesId, usdcAmount, amountOut, wantFToken);
    }

    /// @inheritdoc IRouter
    function mintWithAltCollateral(
        bytes32 seriesId,
        uint256 amount,
        address altCollateral,
        address swapContract,
        uint256 deadline
    ) external override nonReentrant checkDeadline(deadline) {
        if (amount == 0) revert ZeroAmount();
        if (altCollateral == address(0) || swapContract == address(0)) revert ZeroAddress();

        // Calculate USDC cost: 2 USDC per token pair (6 decimals)
        uint256 usdcCost = amount * 2e6 / 1e18;
        if (usdcCost == 0) revert ZeroAmount();

        // Normalize usdcCost to the alt collateral's own decimal precision
        uint8 altDec = IERC20Metadata(altCollateral).decimals();
        uint256 altAmount = usdcCost * (10 ** altDec) / 1e6;

        // Take alt collateral from user
        IERC20(altCollateral).safeTransferFrom(msg.sender, address(this), altAmount);

        // Swap alt collateral → USDC via CollateralSwap
        IERC20(altCollateral).approve(swapContract, altAmount);
        CollateralSwap(swapContract).swap(altCollateral, address(USDC), altAmount);

        // Mint normally with USDC
        USDC.approve(address(FACTORY), usdcCost);
        FACTORY.mint(seriesId, amount);

        // Transfer minted tokens to user
        IMaturityTokenFactory.Series memory s = FACTORY.getSeries(seriesId);
        IERC20(s.fToken).safeTransfer(msg.sender, amount);
        IERC20(s.sfToken).safeTransfer(msg.sender, amount);

        emit MintWithAltCollateral(msg.sender, seriesId, altCollateral, amount, altAmount);
    }

    /// @inheritdoc IRouter
    function removeLiquidityAndRedeem(
        address pool,
        uint256 lpTokens,
        bytes32 seriesId,
        uint256 deadline
    ) external override nonReentrant checkDeadline(deadline) returns (uint256 usdcReceived) {
        if (lpTokens == 0) revert ZeroAmount();
        if (pool == address(0)) revert ZeroAddress();

        // Transfer LP tokens from user
        IERC20(pool).safeTransferFrom(msg.sender, address(this), lpTokens);

        // Remove liquidity
        (uint256 amountX, uint256 amountY) = IFXPool(pool).removeLiquidity(lpTokens, 0, 0);

        IMaturityTokenFactory.Series memory s = FACTORY.getSeries(seriesId);

        // Redeem fTokens
        if (amountX > 0) {
            uint256 balBefore = USDC.balanceOf(address(this));
            _redeemToken(s.fToken, amountX);
            usdcReceived += USDC.balanceOf(address(this)) - balBefore;
        }

        // Redeem sfTokens
        if (amountY > 0) {
            uint256 balBefore = USDC.balanceOf(address(this));
            _redeemToken(s.sfToken, amountY);
            usdcReceived += USDC.balanceOf(address(this)) - balBefore;
        }

        // Transfer USDC to user
        if (usdcReceived > 0) {
            USDC.safeTransfer(msg.sender, usdcReceived);
        }

        emit RemoveLiquidityAndRedeem(msg.sender, seriesId, lpTokens, usdcReceived);
    }

    /// @inheritdoc IRouter
    function redeemAndRoll(
        bytes32 oldSeriesId,
        bytes32 newSeriesId,
        address newPool,
        uint256 amount,
        bool isFToken,
        uint256 minAmountOut,
        uint256 deadline
    ) external override nonReentrant checkDeadline(deadline) returns (uint256 amountOut) {
        if (amount == 0) revert ZeroAmount();
        if (newPool == address(0)) revert ZeroAddress();

        // 1. Redeem old tokens → USDC
        uint256 redeemedUsdc = _pullAndRedeem(oldSeriesId, amount, isFToken);
        if (redeemedUsdc == 0) revert ZeroAmount();

        // 2. Mint new tokens + swap → desired side
        amountOut = _mintAndSwapForRoll(newSeriesId, newPool, redeemedUsdc, isFToken);
        if (amountOut < minAmountOut) revert SlippageExceeded();

        emit RedeemAndRoll(msg.sender, oldSeriesId, newSeriesId, redeemedUsdc, amountOut, isFToken);
    }

    function _pullAndRedeem(bytes32 seriesId, uint256 amount, bool isFToken) internal returns (uint256 redeemedUsdc) {
        IMaturityTokenFactory.Series memory s = FACTORY.getSeries(seriesId);
        address token = isFToken ? s.fToken : s.sfToken;
        IERC20(token).safeTransferFrom(msg.sender, address(this), amount);

        uint256 before = USDC.balanceOf(address(this));
        _redeemToken(token, amount);
        redeemedUsdc = USDC.balanceOf(address(this)) - before;
    }

    function _mintAndSwapForRoll(
        bytes32 seriesId,
        address pool,
        uint256 usdcAmount,
        bool isFToken
    ) internal returns (uint256 amountOut) {
        USDC.approve(address(FACTORY), usdcAmount);
        uint256 mintAmount = usdcAmount * 1e18 / 2e6;
        FACTORY.mint(seriesId, mintAmount);

        IMaturityTokenFactory.Series memory s = FACTORY.getSeries(seriesId);
        address tokenToSwap = isFToken ? s.sfToken : s.fToken;
        address tokenToKeep = isFToken ? s.fToken : s.sfToken;

        IERC20(tokenToSwap).approve(pool, mintAmount);
        uint256 swapOut = IFXPool(pool).swap(tokenToSwap, mintAmount, 0);

        amountOut = mintAmount + swapOut;
        IERC20(tokenToKeep).safeTransfer(msg.sender, amountOut);
    }

    // ─── Auto-Routing: Buy/Sell fToken with USDC ────────────────────

    /// @inheritdoc IRouter
    function buyToken(
        bytes32 seriesId,
        uint256 usdcAmount,
        address usdcPool,
        address ysPool,
        bool wantFToken,
        uint256 minAmountOut,
        uint256 deadline
    ) external override nonReentrant checkDeadline(deadline) returns (uint256 amountOut) {
        if (usdcAmount == 0) revert ZeroAmount();

        // Quote Path A: direct swap on USDC pool — only valid when buying fToken.
        // The USDC pool holds fToken/USDC; it cannot produce sfToken directly.
        uint256 pathA = wantFToken ? IFXPoolUSDC(usdcPool).quoteSwap(address(USDC), usdcAmount) : 0;

        // Quote Path B: mint + swap in Yield Space pool
        uint256 mintAmount = usdcAmount * 1e18 / 2e6;
        uint256 pathB = mintAmount; // kept tokens
        if (ysPool != address(0) && mintAmount > 0) {
            IMaturityTokenFactory.Series memory s = FACTORY.getSeries(seriesId);
            address swapToken = wantFToken ? s.sfToken : s.fToken;
            try IFXPool(ysPool).quoteSwap(swapToken, mintAmount) returns (uint256 swapOut, uint256) {
                pathB += swapOut;
            } catch {}
        }

        USDC.safeTransferFrom(msg.sender, address(this), usdcAmount);

        if (pathA >= pathB) {
            // Path A: direct USDC pool
            amountOut = _buyViaUSDCPool(usdcPool, usdcAmount, wantFToken, seriesId);
        } else {
            // Path B: mint + swap
            amountOut = _buyViaMintSwap(seriesId, usdcAmount, ysPool, wantFToken);
        }

        if (amountOut < minAmountOut) revert SlippageExceeded();

        emit BuyToken(msg.sender, seriesId, usdcAmount, amountOut, wantFToken);
    }

    /// @inheritdoc IRouter
    function sellToken(
        bytes32 seriesId,
        uint256 tokenAmount,
        address usdcPool,
        bool isFToken,
        uint256 minUsdcOut,
        uint256 deadline
    ) external override nonReentrant checkDeadline(deadline) returns (uint256 usdcOut) {
        if (tokenAmount == 0) revert ZeroAmount();

        IMaturityTokenFactory.Series memory s = FACTORY.getSeries(seriesId);
        address token = isFToken ? s.fToken : s.sfToken;

        IERC20(token).safeTransferFrom(msg.sender, address(this), tokenAmount);
        IERC20(token).approve(usdcPool, tokenAmount);
        usdcOut = IFXPoolUSDC(usdcPool).swap(token, tokenAmount, 0);

        if (usdcOut < minUsdcOut) revert SlippageExceeded();

        USDC.safeTransfer(msg.sender, usdcOut);

        emit SellToken(msg.sender, seriesId, tokenAmount, usdcOut, isFToken);
    }

    /// @inheritdoc IRouter
    function sellTokenMultiHop(
        bytes32 seriesId,
        uint256 tokenAmount,
        address usdcPool,
        address ysPool,
        bool isFToken,
        uint256 minUsdcOut,
        uint256 deadline
    ) external override nonReentrant checkDeadline(deadline) returns (uint256 usdcOut) {
        if (tokenAmount == 0) revert ZeroAmount();

        IMaturityTokenFactory.Series memory s = FACTORY.getSeries(seriesId);

        if (isFToken) {
            // Direct: fToken → USDC via USDC Pool
            IERC20(s.fToken).safeTransferFrom(msg.sender, address(this), tokenAmount);
            IERC20(s.fToken).approve(usdcPool, tokenAmount);
            usdcOut = IFXPoolUSDC(usdcPool).swap(s.fToken, tokenAmount, 0);
        } else {
            // 2-hop: sfToken → fToken (YS Pool) → USDC (USDC Pool)
            IERC20(s.sfToken).safeTransferFrom(msg.sender, address(this), tokenAmount);
            IERC20(s.sfToken).approve(ysPool, tokenAmount);
            uint256 fTokenOut = IFXPool(ysPool).swap(s.sfToken, tokenAmount, 0);

            IERC20(s.fToken).approve(usdcPool, fTokenOut);
            usdcOut = IFXPoolUSDC(usdcPool).swap(s.fToken, fTokenOut, 0);
        }

        if (usdcOut < minUsdcOut) revert SlippageExceeded();
        USDC.safeTransfer(msg.sender, usdcOut);

        emit SellToken(msg.sender, seriesId, tokenAmount, usdcOut, isFToken);
    }

    function _buyViaUSDCPool(
        address usdcPool,
        uint256 usdcAmount,
        bool wantFToken,
        bytes32 seriesId
    ) internal returns (uint256 amountOut) {
        USDC.approve(usdcPool, usdcAmount);
        amountOut = IFXPoolUSDC(usdcPool).swap(address(USDC), usdcAmount, 0);

        // USDC pool only has fToken. If user wants sfToken, this path shouldn't be used.
        // For now, USDC pool is fToken/USDC only. wantFToken must be true for Path A.
        IMaturityTokenFactory.Series memory s = FACTORY.getSeries(seriesId);
        address tokenToKeep = wantFToken ? s.fToken : s.sfToken;
        IERC20(tokenToKeep).safeTransfer(msg.sender, amountOut);
    }

    function _buyViaMintSwap(
        bytes32 seriesId,
        uint256 usdcAmount,
        address ysPool,
        bool wantFToken
    ) internal returns (uint256 amountOut) {
        USDC.approve(address(FACTORY), usdcAmount);
        uint256 mintAmount = usdcAmount * 1e18 / 2e6;
        FACTORY.mint(seriesId, mintAmount);

        IMaturityTokenFactory.Series memory s = FACTORY.getSeries(seriesId);
        address tokenToSwap = wantFToken ? s.sfToken : s.fToken;
        address tokenToKeep = wantFToken ? s.fToken : s.sfToken;

        IERC20(tokenToSwap).approve(ysPool, mintAmount);
        uint256 swapOut = IFXPool(ysPool).swap(tokenToSwap, mintAmount, 0);

        amountOut = mintAmount + swapOut;
        IERC20(tokenToKeep).safeTransfer(msg.sender, amountOut);
    }

    // ─── Internal Helpers ─────────────────────────────────────────────

    function _redeemToken(address token, uint256 amount) internal {
        // Call redeem on the maturity token
        // This will burn the tokens and release USDC from escrow to this contract
        (bool success,) = token.call(abi.encodeWithSignature("redeem(uint256)", amount));
        // If redeem fails (e.g., not settled), tokens stay in router — no revert
        // This allows partial redemption
        if (!success) {
            // Return tokens to user if not redeemable
            IERC20(token).safeTransfer(msg.sender, amount);
        }
    }
}
