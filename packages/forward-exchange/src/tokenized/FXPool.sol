// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {IFXPool} from "./interfaces/IFXPool.sol";
import {YieldSpaceMath} from "./math/YieldSpaceMath.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {ERC20Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

/// @title FXPool
/// @notice Yield Space AMM for fToken/sfToken pairs. The pool itself is the LP token (ERC-20).
/// @dev Invariant: x^(1-t) + y^(1-t) = k, with time-decaying t and dynamic fees. UUPS upgradeable.
contract FXPool is Initializable, ERC20Upgradeable, ReentrancyGuard, UUPSUpgradeable, IFXPool {
    using SafeERC20 for IERC20;

    uint256 internal constant WAD = 1e18;
    uint256 internal constant MIN_RESERVE = 1e15;
    uint256 internal constant MAX_TRADE_RATIO = 2e17;
    uint256 internal constant PROTOCOL_FEE_SHARE = 8e17;

    // ─── Pool State ───
    address public fToken;
    address public sfToken;
    uint256 public reserveX;
    uint256 public reserveY;
    uint256 public k;
    uint256 public tMax;
    uint256 public tMin;
    uint256 public feeMax;
    uint256 public maturity;
    uint256 public totalLifetime;
    uint256 public createdAt;

    uint256 public protocolFeesX;
    uint256 public protocolFeesY;

    address public protocolFeeRecipient;
    address public admin;

    // ─── Upgrade Timelock ───
    address public pendingImplementation;
    uint256 public upgradeProposedTime;

    error OnlyAdmin();
    error UpgradeNotProposed();
    error TimelockNotExpired();

    event UpgradeProposed(address indexed newImpl, uint256 proposedAt);
    event ParametersUpdated(uint256 tMax, uint256 tMin, uint256 feeMax);

    /// @dev Intermediate swap calculation results
    struct SwapResult {
        uint256 amountOut;
        uint256 feeAmount;
        uint256 protocolFee;
        uint256 lpFee;
        uint256 amountInAfterFee;
    }

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    /// @inheritdoc IFXPool
    function initialize(
        address fToken_,
        address sfToken_,
        uint256 maturity_,
        uint256 totalLifetime_,
        uint256 tMax_,
        uint256 tMin_,
        uint256 feeMax_
    ) external override initializer {
        __ERC20_init("FXP-LP", "FXP");

        fToken = fToken_;
        sfToken = sfToken_;
        maturity = maturity_;
        totalLifetime = totalLifetime_;
        tMax = tMax_;
        tMin = tMin_;
        feeMax = feeMax_;
        createdAt = block.timestamp;
        admin = msg.sender;
        protocolFeeRecipient = msg.sender;
    }

    /// @notice Initialize with custom name/symbol (V2+)
    function initializeV2(string memory name_, string memory symbol_) external reinitializer(2) {
        require(msg.sender == admin, "Only admin");
        // Future: can re-init ERC20 name/symbol or add new state
        // For now this is a placeholder for upgrade versioning
    }

    // ─── Admin ───

    /// @notice Propose a new implementation address; starts the 48-hour timelock
    function proposeUpgrade(address newImpl) external {
        if (msg.sender != admin) revert OnlyAdmin();
        if (newImpl == address(0)) revert ZeroAmount();
        pendingImplementation = newImpl;
        upgradeProposedTime = block.timestamp;
        emit UpgradeProposed(newImpl, block.timestamp);
    }

    function _authorizeUpgrade(address newImpl) internal override {
        if (msg.sender != admin) revert OnlyAdmin();
        if (newImpl != pendingImplementation) revert UpgradeNotProposed();
        if (block.timestamp < upgradeProposedTime + 48 hours) revert TimelockNotExpired();
        // Reset after use
        pendingImplementation = address(0);
        upgradeProposedTime = 0;
    }

    /// @notice Update pool curvature and fee parameters
    /// @dev Parameters are immutable once liquidity has been added
    function setParameters(uint256 tMax_, uint256 tMin_, uint256 feeMax_) external {
        if (msg.sender != admin) revert OnlyAdmin();
        require(reserveX == 0 && reserveY == 0, "params locked after first LP");
        if (tMin_ >= tMax_) revert ZeroAmount();
        if (tMax_ >= WAD) revert ZeroAmount();

        tMax = tMax_;
        tMin = tMin_;
        feeMax = feeMax_;

        if (reserveX > 0 && reserveY > 0) {
            uint256 t = _calculateT();
            k = YieldSpaceMath.computeInvariant(reserveX, reserveY, t);
        }

        emit ParametersUpdated(tMax_, tMin_, feeMax_);
    }

    // ─── Core ───

    /// @inheritdoc IFXPool
    function swap(
        address tokenIn,
        uint256 amountIn,
        uint256 minAmountOut
    ) external override nonReentrant returns (uint256 amountOut) {
        if (amountIn == 0) revert ZeroAmount();
        if (tokenIn != fToken && tokenIn != sfToken) revert InvalidToken();

        bool isFTokenIn = tokenIn == fToken;

        SwapResult memory r = _executeSwap(isFTokenIn, amountIn);
        amountOut = r.amountOut;

        if (amountOut < minAmountOut) revert SlippageExceeded(amountOut, minAmountOut);

        IERC20(tokenIn).safeTransferFrom(msg.sender, address(this), amountIn);
        address tokenOut = isFTokenIn ? sfToken : fToken;
        IERC20(tokenOut).safeTransfer(msg.sender, amountOut);

        emit Swap(msg.sender, tokenIn, amountIn, amountOut, r.feeAmount);
    }

    function _executeSwap(
        bool isFTokenIn,
        uint256 amountIn
    ) internal returns (SwapResult memory r) {
        uint256 resIn = isFTokenIn ? reserveX : reserveY;
        uint256 resOut = isFTokenIn ? reserveY : reserveX;

        if (amountIn > resIn * MAX_TRADE_RATIO / WAD) revert TradeTooLarge();

        uint256 t = _calculateT();
        uint256 currentK = YieldSpaceMath.computeInvariant(reserveX, reserveY, t);
        uint256 effectiveFee = _getEffectiveFee(isFTokenIn);

        r.feeAmount = amountIn * effectiveFee / WAD;
        r.amountInAfterFee = amountIn - r.feeAmount;
        r.amountOut = YieldSpaceMath.getAmountOut(resIn, resOut, r.amountInAfterFee, t, currentK);

        if (resOut - r.amountOut < MIN_RESERVE) revert MinimumReserveBreach();

        r.protocolFee = r.feeAmount * PROTOCOL_FEE_SHARE / WAD;
        r.lpFee = r.feeAmount - r.protocolFee;

        if (isFTokenIn) {
            reserveX = resIn + r.amountInAfterFee + r.lpFee;
            reserveY = resOut - r.amountOut;
            protocolFeesX += r.protocolFee;
        } else {
            reserveY = resIn + r.amountInAfterFee + r.lpFee;
            reserveX = resOut - r.amountOut;
            protocolFeesY += r.protocolFee;
        }

        k = YieldSpaceMath.computeInvariant(reserveX, reserveY, t);
    }

    function _getEffectiveFee(bool isFTokenIn) internal view returns (uint256) {
        uint256 skew = YieldSpaceMath.calculateSkew(reserveX, reserveY);
        bool isRebalancing = _isRebalancing(isFTokenIn, reserveX, reserveY);
        uint256 baseFee = YieldSpaceMath.calculateBaseFee(
            _timeToMaturity(), totalLifetime, feeMax
        );
        return YieldSpaceMath.calculateEffectiveFee(baseFee, skew, isRebalancing);
    }

    /// @inheritdoc IFXPool
    function addLiquidity(
        uint256 amountX,
        uint256 amountY,
        uint256 minLpTokens
    ) external override nonReentrant returns (uint256 lpTokens) {
        if (amountX == 0 || amountY == 0) revert ZeroAmount();

        uint256 totalSupply_ = totalSupply();

        if (totalSupply_ == 0) {
            uint256 MINIMUM_LIQUIDITY = 1000;
            uint256 geometric = _sqrt(amountX * amountY);
            if (geometric <= MINIMUM_LIQUIDITY) revert InsufficientLiquidity();
            _mint(address(1), MINIMUM_LIQUIDITY);
            lpTokens = geometric - MINIMUM_LIQUIDITY;
            reserveX = amountX;
            reserveY = amountY;
        } else {
            uint256 ratioX = amountX * WAD / reserveX;
            uint256 ratioY = amountY * WAD / reserveY;
            uint256 diff = ratioX > ratioY ? ratioX - ratioY : ratioY - ratioX;
            if (diff > WAD / 100) revert InvalidRatio();

            uint256 ratio = ratioX < ratioY ? ratioX : ratioY;
            lpTokens = totalSupply_ * ratio / WAD;

            reserveX += amountX;
            reserveY += amountY;
        }

        if (lpTokens < minLpTokens) revert SlippageExceeded(lpTokens, minLpTokens);

        uint256 t = _calculateT();
        k = YieldSpaceMath.computeInvariant(reserveX, reserveY, t);

        IERC20(fToken).safeTransferFrom(msg.sender, address(this), amountX);
        IERC20(sfToken).safeTransferFrom(msg.sender, address(this), amountY);
        _mint(msg.sender, lpTokens);

        emit LiquidityAdded(msg.sender, amountX, amountY, lpTokens);
    }

    /// @inheritdoc IFXPool
    function removeLiquidity(
        uint256 lpTokens,
        uint256 minX,
        uint256 minY
    ) external override nonReentrant returns (uint256 amountX, uint256 amountY) {
        if (lpTokens == 0) revert ZeroAmount();

        uint256 totalSupply_ = totalSupply();
        amountX = reserveX * lpTokens / totalSupply_;
        amountY = reserveY * lpTokens / totalSupply_;

        if (amountX < minX) revert SlippageExceeded(amountX, minX);
        if (amountY < minY) revert SlippageExceeded(amountY, minY);

        reserveX -= amountX;
        reserveY -= amountY;
        _burn(msg.sender, lpTokens);

        if (reserveX > 0 && reserveY > 0) {
            uint256 t = _calculateT();
            k = YieldSpaceMath.computeInvariant(reserveX, reserveY, t);
        } else {
            k = 0;
        }

        IERC20(fToken).safeTransfer(msg.sender, amountX);
        IERC20(sfToken).safeTransfer(msg.sender, amountY);

        emit LiquidityRemoved(msg.sender, amountX, amountY, lpTokens);
    }

    /// @notice Collect accumulated protocol fees
    function collectProtocolFees() external {
        uint256 feesX = protocolFeesX;
        uint256 feesY = protocolFeesY;
        protocolFeesX = 0;
        protocolFeesY = 0;

        if (feesX > 0) IERC20(fToken).safeTransfer(protocolFeeRecipient, feesX);
        if (feesY > 0) IERC20(sfToken).safeTransfer(protocolFeeRecipient, feesY);
    }

    // ─── Views ───

    /// @inheritdoc IFXPool
    function getReserves() external view override returns (uint256, uint256) {
        return (reserveX, reserveY);
    }

    /// @inheritdoc IFXPool
    function getCurrentT() external view override returns (uint256) {
        return _calculateT();
    }

    /// @inheritdoc IFXPool
    function getSkew() external view override returns (uint256) {
        return YieldSpaceMath.calculateSkew(reserveX, reserveY);
    }

    /// @inheritdoc IFXPool
    function getInvariantK() external view override returns (uint256) {
        return k;
    }

    /// @inheritdoc IFXPool
    function quoteSwap(
        address tokenIn,
        uint256 amountIn
    ) external view override returns (uint256 amountOut, uint256 fee) {
        if (tokenIn != fToken && tokenIn != sfToken) revert InvalidToken();

        bool isFTokenIn = tokenIn == fToken;
        uint256 resIn = isFTokenIn ? reserveX : reserveY;
        uint256 resOut = isFTokenIn ? reserveY : reserveX;

        uint256 t = _calculateT();
        uint256 currentK = YieldSpaceMath.computeInvariant(reserveX, reserveY, t);
        uint256 effectiveFee = _getEffectiveFee(isFTokenIn);

        fee = amountIn * effectiveFee / WAD;
        uint256 amountInAfterFee = amountIn - fee;

        amountOut = YieldSpaceMath.getAmountOut(resIn, resOut, amountInAfterFee, t, currentK);
    }

    // ─── Internal ───

    function _calculateT() internal view returns (uint256) {
        return YieldSpaceMath.calculateT(_timeToMaturity(), totalLifetime, tMax, tMin);
    }

    function _timeToMaturity() internal view returns (uint256) {
        if (block.timestamp >= maturity) return 0;
        return maturity - block.timestamp;
    }

    function _isRebalancing(bool isFTokenIn, uint256 x, uint256 y) internal pure returns (bool) {
        if (x > y) return !isFTokenIn;
        if (y > x) return isFTokenIn;
        return false;
    }

    function _sqrt(uint256 x) internal pure returns (uint256 y) {
        if (x == 0) return 0;
        uint256 z = (x + 1) / 2;
        y = x;
        while (z < y) {
            y = z;
            z = (x / z + z) / 2;
        }
    }
}
