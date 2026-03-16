// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {IFXPoolUSDC} from "./interfaces/IFXPoolUSDC.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Math} from "@openzeppelin/contracts/utils/math/Math.sol";

/// @title FXPoolUSDC
/// @notice Constant-product AMM (x·y=k) for fToken ↔ USDC direct trading
/// @dev fToken is 18 decimals, USDC is 6 decimals. Reserves stored in native decimals.
contract FXPoolUSDC is IFXPoolUSDC, ERC20, ReentrancyGuard {
    using SafeERC20 for IERC20;

    address public immutable F_TOKEN;   // 18 dec
    address public immutable USDC;      // 6 dec

    uint256 public reserveFToken;       // 18 dec
    uint256 public reserveUSDC;         // 6 dec

    uint256 public protocolFeesF;       // 18 dec
    uint256 public protocolFeesUSDC;    // 6 dec

    address public feeRecipient;

    uint256 public constant FEE_BPS = 30;               // 0.30%
    uint256 public constant BPS = 10_000;
    uint256 public constant PROTOCOL_FEE_SHARE = 80;     // 80% of fee → protocol
    uint256 public constant MIN_LIQUIDITY = 1000;
    uint256 private constant USDC_SCALE = 1e12;          // 6→18 dec
    uint256 public constant MIN_RESERVE = 1e3;           // minimum reserve after swap

    constructor(
        address _fToken,
        address _usdc,
        address _feeRecipient
    ) ERC20("FXPoolUSDC-LP", "FXPU-LP") {
        require(_fToken != address(0) && _usdc != address(0), "zero addr");
        F_TOKEN = _fToken;
        USDC = _usdc;
        feeRecipient = _feeRecipient;
    }

    // ─── Swap ──────────────────────────────────────────────────────────

    /// @inheritdoc IFXPoolUSDC
    function swap(
        address tokenIn,
        uint256 amountIn,
        uint256 minAmountOut
    ) external override nonReentrant returns (uint256 amountOut) {
        if (amountIn == 0) revert ZeroAmount();

        bool isFTokenIn = tokenIn == F_TOKEN;
        if (!isFTokenIn && tokenIn != USDC) revert InvalidToken();

        (amountOut,) = _computeSwap(isFTokenIn, amountIn);
        if (amountOut < minAmountOut) revert SlippageExceeded(amountOut, minAmountOut);

        // Transfer in
        IERC20(tokenIn).safeTransferFrom(msg.sender, address(this), amountIn);

        // Update reserves + fees
        _applySwap(isFTokenIn, amountIn, amountOut);

        // Transfer out
        address tokenOut = isFTokenIn ? USDC : F_TOKEN;
        IERC20(tokenOut).safeTransfer(msg.sender, amountOut);

        emit Swap(msg.sender, tokenIn, amountIn, amountOut, amountIn * FEE_BPS / BPS);
    }

    /// @inheritdoc IFXPoolUSDC
    function quoteSwap(
        address tokenIn,
        uint256 amountIn
    ) external view override returns (uint256 amountOut) {
        if (amountIn == 0) return 0;
        bool isFTokenIn = tokenIn == F_TOKEN;
        if (!isFTokenIn && tokenIn != USDC) revert InvalidToken();
        (amountOut,) = _computeSwap(isFTokenIn, amountIn);
    }

    function _computeSwap(
        bool isFTokenIn,
        uint256 amountIn
    ) internal view returns (uint256 amountOut, uint256 feeAmount) {
        uint256 resIn = isFTokenIn ? reserveFToken : reserveUSDC;
        uint256 resOut = isFTokenIn ? reserveUSDC : reserveFToken;
        if (resIn == 0 || resOut == 0) revert InsufficientLiquidity();

        feeAmount = amountIn * FEE_BPS / BPS;
        uint256 amountInAfterFee = amountIn - feeAmount;

        // x·y = k → amountOut = resOut · amountInAfterFee / (resIn + amountInAfterFee)
        amountOut = resOut * amountInAfterFee / (resIn + amountInAfterFee);
        if (amountOut == 0) revert InsufficientLiquidity();
        require(resOut - amountOut >= MIN_RESERVE, "min reserve breach");
    }

    function _applySwap(bool isFTokenIn, uint256 amountIn, uint256 amountOut) internal {
        uint256 feeAmount = amountIn * FEE_BPS / BPS;
        uint256 protocolFee = feeAmount * PROTOCOL_FEE_SHARE / 100;
        uint256 lpFee = feeAmount - protocolFee;

        if (isFTokenIn) {
            reserveFToken += amountIn - feeAmount + lpFee;
            reserveUSDC -= amountOut;
            protocolFeesF += protocolFee;
        } else {
            reserveUSDC += amountIn - feeAmount + lpFee;
            reserveFToken -= amountOut;
            protocolFeesUSDC += protocolFee;
        }
    }

    // ─── Liquidity ─────────────────────────────────────────────────────

    /// @inheritdoc IFXPoolUSDC
    function addLiquidity(
        uint256 amountFToken,
        uint256 amountUSDC,
        uint256 minLpTokens
    ) external override nonReentrant returns (uint256 lpTokens) {
        if (amountFToken == 0 || amountUSDC == 0) revert ZeroAmount();

        uint256 supply = totalSupply();

        if (supply == 0) {
            // First deposit: LP tokens = sqrt(fToken * usdcScaled)
            lpTokens = Math.sqrt(amountFToken * (amountUSDC * USDC_SCALE)) - MIN_LIQUIDITY;
            _mint(address(1), MIN_LIQUIDITY); // permanent lock
        } else {
            // Proportional: min of both ratios
            uint256 lpFromF = amountFToken * supply / reserveFToken;
            uint256 lpFromU = amountUSDC * supply / reserveUSDC;
            lpTokens = lpFromF < lpFromU ? lpFromF : lpFromU;
        }

        if (lpTokens < minLpTokens) revert SlippageExceeded(lpTokens, minLpTokens);

        // Transfer tokens in
        IERC20(F_TOKEN).safeTransferFrom(msg.sender, address(this), amountFToken);
        IERC20(USDC).safeTransferFrom(msg.sender, address(this), amountUSDC);

        reserveFToken += amountFToken;
        reserveUSDC += amountUSDC;

        _mint(msg.sender, lpTokens);

        emit LiquidityAdded(msg.sender, amountFToken, amountUSDC, lpTokens);
    }

    /// @inheritdoc IFXPoolUSDC
    function removeLiquidity(
        uint256 lpTokens,
        uint256 minFToken,
        uint256 minUSDC
    ) external override nonReentrant returns (uint256 amountFToken, uint256 amountUSDC) {
        if (lpTokens == 0) revert ZeroAmount();

        uint256 supply = totalSupply();
        amountFToken = reserveFToken * lpTokens / supply;
        amountUSDC = reserveUSDC * lpTokens / supply;

        if (amountFToken < minFToken) revert SlippageExceeded(amountFToken, minFToken);
        if (amountUSDC < minUSDC) revert SlippageExceeded(amountUSDC, minUSDC);

        _burn(msg.sender, lpTokens);

        reserveFToken -= amountFToken;
        reserveUSDC -= amountUSDC;

        IERC20(F_TOKEN).safeTransfer(msg.sender, amountFToken);
        IERC20(USDC).safeTransfer(msg.sender, amountUSDC);

        emit LiquidityRemoved(msg.sender, amountFToken, amountUSDC, lpTokens);
    }

    // ─── Protocol Fees ─────────────────────────────────────────────────

    /// @inheritdoc IFXPoolUSDC
    function collectProtocolFees() external override {
        uint256 feesF = protocolFeesF;
        uint256 feesU = protocolFeesUSDC;
        protocolFeesF = 0;
        protocolFeesUSDC = 0;

        if (feesF > 0) IERC20(F_TOKEN).safeTransfer(feeRecipient, feesF);
        if (feesU > 0) IERC20(USDC).safeTransfer(feeRecipient, feesU);

        emit ProtocolFeesCollected(feesF, feesU);
    }

    // ─── Views ─────────────────────────────────────────────────────────

    /// @inheritdoc IFXPoolUSDC
    function getReserves() external view override returns (uint256, uint256) {
        return (reserveFToken, reserveUSDC);
    }
}
