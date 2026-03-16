// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {SnowballStrategyBase} from "../SnowballStrategyBase.sol";
import {ISnowballLendFull} from "../interfaces/ISnowballLendFull.sol";
import {ISnowballLend} from "../interfaces/ISnowballLend.sol";

interface IOracle {
    function price() external view returns (uint256);
}

/// @title StrategyWCTCLoop
/// @notice Leveraged wCTC yield strategy using Morpho Blue.
///
///         Loop: supply wCTC as collateral → borrow sbUSD → swap sbUSD → wCTC
///               → supply new wCTC as collateral → repeat
///         Profit = collateral appreciation × leverage factor
///
///         Safety: maintains margin below LLTV to avoid liquidation.
///         Oracle guard: circuit-breaker rejects borrows when spot price deviates
///         more than maxPriceDeviation from the last known price, preventing
///         flash-loan price manipulation.
contract StrategyWCTCLoop is SnowballStrategyBase {
    using SafeERC20 for IERC20;

    ISnowballLendFull public immutable lend;
    IERC20 public immutable sbUSD;

    // Market where wCTC is collateral, sbUSD is loan token
    ISnowballLend.MarketParams public collateralMarket;
    bytes32 public immutable collateralMarketId;

    // --- Leverage settings ---
    uint256 public targetLeverageBps;       // e.g. 20000 = 2x
    uint256 public constant MAX_LEVERAGE_BPS = 40000; // 4x max
    uint256 public constant BPS_DENOMINATOR = 10000;

    uint256 public safetyMarginBps;         // e.g. 500 = 5% below LLTV

    // --- Oracle circuit-breaker ---
    uint256 public maxPriceDeviation;       // bps, default 1000 = 10%
    uint256 public lastKnownPrice;          // last accepted oracle price (1e36 scale)
    uint256 public lastPriceTimestamp;      // block.timestamp of last accepted price

    // --- Tracking ---
    uint256 public totalCollateralSupplied;
    uint256 public totalBorrowed;

    // --- Swap direction context for _getMinAmountOut ---
    // true  = swapping sbUSD → wCTC  (amountIn is sbUSD, output is wCTC)
    // false = swapping wCTC → sbUSD  (amountIn is wCTC,  output is sbUSD)
    bool private _swapDirectionSbUSDtoWCTC;

    event Leveraged(uint256 collateral, uint256 borrowed, uint256 leverageBps);
    event Deleveraged(uint256 collateralWithdrawn, uint256 repaid);
    event LeverageUpdated(uint256 oldBps, uint256 newBps);
    event MaxPriceDeviationUpdated(uint256 oldBps, uint256 newBps);
    event PriceUpdated(uint256 price, uint256 timestamp);

    constructor(
        address _vault,
        address _want,          // wCTC
        address _native,        // wCTC (same)
        address _swapRouter,
        uint24 _swapFee,
        address _strategist,
        address _treasury,
        address _lend,
        address _sbUSD,
        ISnowballLend.MarketParams memory _collateralMarket
    )
        SnowballStrategyBase(
            _vault, _want, _native, _swapRouter, _swapFee, _strategist, _treasury
        )
    {
        lend = ISnowballLendFull(_lend);
        sbUSD = IERC20(_sbUSD);
        collateralMarket = _collateralMarket;
        collateralMarketId = _computeMarketId(_collateralMarket);

        targetLeverageBps = 20000; // 2x default
        safetyMarginBps = 500;    // 5% safety margin
        maxPriceDeviation = 1000; // 10% max deviation before circuit-breaker trips
    }

    // ═══════════════════════════════════════════════════════════════
    // Strategy hooks
    // ═══════════════════════════════════════════════════════════════

    function _deposit(uint256 _amount) internal override {
        if (_amount > 0) {
            _leverageUp(_amount);
        }
    }

    function _withdraw(uint256 _amount) internal override {
        _deleverageFor(_amount);
    }

    function _emergencyWithdraw() internal override {
        _deleverageAll();
    }

    function _claim() internal override {
        lend.accrueInterest(collateralMarket);

        // Profit mechanism: swap any idle sbUSD sitting in the strategy
        // (residual from the borrow→swap→collateral loop, or slippage leftovers) to wCTC.
        uint256 sbUSDBalance = sbUSD.balanceOf(address(this));
        if (sbUSDBalance > 0) {
            _swapDirectionSbUSDtoWCTC = true;
            _swap(address(sbUSD), address(native), sbUSDBalance);
            _swapDirectionSbUSDtoWCTC = false;
        }
    }

    function _verifyRewardToken(address) internal pure override {
        // No external reward tokens
    }

    function balanceOfPool() public view override returns (uint256) {
        (,, uint128 collateral) = lend.position(collateralMarketId, address(this));
        uint256 currentBorrow = _currentBorrowAssets();
        // Always convert borrow (sbUSD) back to wCTC terms using oracle price (1e36 scale).
        // This ensures outstanding debt is accounted for even when collateral == 0
        // (e.g. after a partial liquidation that wiped out collateral but left residual debt).
        uint256 borrowInWCTC = 0;
        if (currentBorrow > 0) {
            uint256 oraclePrice = IOracle(collateralMarket.oracle).price();
            if (oraclePrice > 0) {
                borrowInWCTC = (currentBorrow * 1e36) / oraclePrice;
            }
        }
        uint256 col = uint256(collateral);
        return col > borrowInWCTC ? col - borrowInWCTC : 0;
    }

    // ═══════════════════════════════════════════════════════════════
    // Leverage mechanics
    // ═══════════════════════════════════════════════════════════════

    /// @notice Leverage up: supply wCTC as collateral, borrow sbUSD, swap sbUSD → wCTC,
    ///         supply the new wCTC as additional collateral, repeat once.
    ///
    ///         Loop pattern (standard collateral-loop leverage):
    ///           1. Supply wCTC as collateral
    ///           2. Borrow sbUSD up to safe LLTV limit
    ///           3. Swap sbUSD → wCTC via DEX
    ///           4. Supply the acquired wCTC as additional collateral
    ///           5. (One additional borrow pass on the new collateral for target leverage)
    ///
    ///         This produces net positive yield because:
    ///           - We hold MORE wCTC collateral than we started with
    ///           - We owe sbUSD debt, which we service from wCTC appreciation / harvest
    ///           - Supply rate on wCTC > borrow cost on sbUSD (target market conditions)
    function _leverageUp(uint256 _wctcAmount) internal {
        // --- Pass 1: initial collateral deposit ---
        wantToken.forceApprove(address(lend), _wctcAmount);
        lend.supplyCollateral(collateralMarket, _wctcAmount, address(this), "");
        totalCollateralSupplied += _wctcAmount;

        // --- Pass 1: borrow sbUSD ---
        uint256 maxBorrow = _maxSafeBorrow();
        uint256 currentBorrow = _currentBorrowAssets();
        if (maxBorrow <= currentBorrow) {
            emit Leveraged(_wctcAmount, totalBorrowed, targetLeverageBps);
            return;
        }
        uint256 borrowAmount = maxBorrow - currentBorrow;
        if (borrowAmount == 0) {
            emit Leveraged(_wctcAmount, totalBorrowed, targetLeverageBps);
            return;
        }

        lend.borrow(collateralMarket, borrowAmount, 0, address(this), address(this));
        totalBorrowed += borrowAmount;

        // --- Pass 1: swap sbUSD → wCTC and re-supply as collateral ---
        uint256 wctcReceived = _swapSbUSDToWCTC(borrowAmount);
        if (wctcReceived > 0) {
            wantToken.forceApprove(address(lend), wctcReceived);
            lend.supplyCollateral(collateralMarket, wctcReceived, address(this), "");
            totalCollateralSupplied += wctcReceived;

            // --- Pass 2: one more borrow on the new collateral to approach target leverage ---
            maxBorrow = _maxSafeBorrow();
            currentBorrow = _currentBorrowAssets();
            if (maxBorrow > currentBorrow) {
                uint256 borrowAmount2 = maxBorrow - currentBorrow;
                if (borrowAmount2 > 0) {
                    lend.borrow(collateralMarket, borrowAmount2, 0, address(this), address(this));
                    totalBorrowed += borrowAmount2;

                    // Swap the second tranche of sbUSD → wCTC and supply as collateral
                    uint256 wctcReceived2 = _swapSbUSDToWCTC(borrowAmount2);
                    if (wctcReceived2 > 0) {
                        wantToken.forceApprove(address(lend), wctcReceived2);
                        lend.supplyCollateral(collateralMarket, wctcReceived2, address(this), "");
                        totalCollateralSupplied += wctcReceived2;
                    }
                }
            }
        }

        // Accept the current price now that the borrow succeeded
        _acceptCurrentPrice();

        emit Leveraged(_wctcAmount, totalBorrowed, targetLeverageBps);
    }

    /// @dev Swap `_sbUSDAmount` sbUSD → wCTC. Returns wCTC received.
    function _swapSbUSDToWCTC(uint256 _sbUSDAmount) internal returns (uint256) {
        uint256 wctcBefore = wantToken.balanceOf(address(this));
        _swapDirectionSbUSDtoWCTC = true;
        _swap(address(sbUSD), address(wantToken), _sbUSDAmount);
        _swapDirectionSbUSDtoWCTC = false;
        uint256 wctcAfter = wantToken.balanceOf(address(this));
        return wctcAfter > wctcBefore ? wctcAfter - wctcBefore : 0;
    }

    /// @notice Deleverage to free up a specific amount of wCTC.
    ///         Because all borrowed sbUSD was swapped into wCTC collateral, there is no
    ///         sbUSD supply position to withdraw from. We source sbUSD to repay debt by
    ///         withdrawing a slice of collateral and swapping it.
    function _deleverageFor(uint256 _wctcNeeded) internal {
        if (totalBorrowed == 0) {
            // No leverage, just withdraw collateral directly
            lend.withdrawCollateral(collateralMarket, _wctcNeeded, address(this), address(this));
            if (totalCollateralSupplied > _wctcNeeded) {
                totalCollateralSupplied -= _wctcNeeded;
            } else {
                totalCollateralSupplied = 0;
            }
            return;
        }

        // Calculate proportional deleverage
        (,, uint128 collateral) = lend.position(collateralMarketId, address(this));
        uint256 totalColl = uint256(collateral);
        if (totalColl == 0) return;

        uint256 ratio = (_wctcNeeded * 1e18) / totalColl;
        if (ratio > 1e18) ratio = 1e18;

        uint256 borrowToRepay = (totalBorrowed * ratio) / 1e18;

        // Source sbUSD by withdrawing extra wCTC collateral and swapping it
        if (borrowToRepay > 0) {
            // Estimate how much wCTC we need to swap to cover borrowToRepay sbUSD
            uint256 oraclePrice = IOracle(collateralMarket.oracle).price();
            uint256 wctcForRepay = 0;
            if (oraclePrice > 0) {
                wctcForRepay = (borrowToRepay * 1e36) / oraclePrice;
                wctcForRepay = wctcForRepay * 10100 / 10000; // +1% slippage buffer
            }

            // Withdraw extra wCTC to cover debt repayment
            uint256 totalWithdraw = _wctcNeeded + wctcForRepay;
            if (totalWithdraw > totalColl) totalWithdraw = totalColl;
            lend.withdrawCollateral(collateralMarket, totalWithdraw, address(this), address(this));
            if (totalCollateralSupplied > totalWithdraw) {
                totalCollateralSupplied -= totalWithdraw;
            } else {
                totalCollateralSupplied = 0;
            }

            // Swap wCTC → sbUSD to cover repayment
            if (wctcForRepay > 0) {
                uint256 wctcBal = wantToken.balanceOf(address(this));
                uint256 swapAmt = wctcForRepay < wctcBal ? wctcForRepay : wctcBal;
                if (swapAmt > 0) {
                    // _swapDirectionSbUSDtoWCTC remains false (wCTC → sbUSD direction)
                    _swap(address(wantToken), address(sbUSD), swapAmt);
                }
            }

            // Repay debt
            uint256 sbUSDbal = sbUSD.balanceOf(address(this));
            uint256 repayAmt = sbUSDbal < borrowToRepay ? sbUSDbal : borrowToRepay;
            if (repayAmt > 0) {
                sbUSD.forceApprove(address(lend), repayAmt);
                lend.repay(collateralMarket, repayAmt, 0, address(this), "");
                if (totalBorrowed > repayAmt) {
                    totalBorrowed -= repayAmt;
                } else {
                    totalBorrowed = 0;
                }
            }
        } else {
            // No borrow to repay for this slice — withdraw collateral directly
            lend.withdrawCollateral(collateralMarket, _wctcNeeded, address(this), address(this));
            if (totalCollateralSupplied > _wctcNeeded) {
                totalCollateralSupplied -= _wctcNeeded;
            } else {
                totalCollateralSupplied = 0;
            }
        }

        emit Deleveraged(_wctcNeeded, borrowToRepay);
    }

    /// @notice Full deleverage — unwind entire position.
    ///         All sbUSD was swapped to wCTC at borrow time, so we source repayment
    ///         funds by withdrawing a portion of wCTC collateral and swapping it.
    function _deleverageAll() internal {
        // Repay all borrows
        (, uint128 borrowShares,) = lend.position(collateralMarketId, address(this));
        if (borrowShares > 0) {
            uint256 debtAssets = _currentBorrowAssets();
            uint256 sbUSDBalance = sbUSD.balanceOf(address(this));

            // If sbUSD balance is insufficient, swap some wCTC to cover the shortfall
            if (sbUSDBalance < debtAssets) {
                uint256 shortfall = debtAssets - sbUSDBalance;
                // Convert shortfall (sbUSD) to wCTC via oracle price (1e36 scale)
                uint256 oraclePrice = IOracle(collateralMarket.oracle).price();
                if (oraclePrice > 0) {
                    uint256 wctcNeeded = (shortfall * 1e36) / oraclePrice;
                    // Add 1% buffer for slippage
                    wctcNeeded = wctcNeeded * 10100 / 10000;
                    uint256 wctcBal = wantToken.balanceOf(address(this));
                    uint256 swapAmount = wctcNeeded < wctcBal ? wctcNeeded : wctcBal;
                    if (swapAmount > 0) {
                        _swap(address(wantToken), address(sbUSD), swapAmount);
                    }
                }
                sbUSDBalance = sbUSD.balanceOf(address(this));
            }

            sbUSD.forceApprove(address(lend), sbUSDBalance);
            lend.repay(collateralMarket, 0, borrowShares, address(this), "");
        }

        // Withdraw all collateral
        (,, uint128 collateral) = lend.position(collateralMarketId, address(this));
        if (collateral > 0) {
            lend.withdrawCollateral(collateralMarket, uint256(collateral), address(this), address(this));
        }

        totalCollateralSupplied = 0;
        totalBorrowed = 0;
    }

    // ═══════════════════════════════════════════════════════════════
    // Slippage protection override
    // ═══════════════════════════════════════════════════════════════

    /// @notice Oracle-aware minimum output calculation for wCTC/sbUSD swaps.
    ///
    ///         The base implementation assumes a 1:1 rate (suitable for pegged pairs).
    ///         wCTC and sbUSD are NOT pegged, so we use the Morpho oracle price
    ///         (1e36 scale, expressed as sbUSD per wCTC × 1e36 / 1e18 = sbUSD/wCTC × 1e18)
    ///         to derive a fair expected output before applying the slippage tolerance.
    ///
    ///         Direction is communicated via _swapDirectionSbUSDtoWCTC:
    ///           true  → sbUSD in, wCTC out:  fairOutput = amountIn * 1e36 / price
    ///           false → wCTC in, sbUSD out:  fairOutput = amountIn * price / 1e36
    function _getMinAmountOut(uint256 _amountIn) internal view override returns (uint256) {
        if (maxSlippageBps == 0) return 0;

        uint256 oraclePrice = IOracle(collateralMarket.oracle).price();
        uint256 fairOutput;
        if (oraclePrice > 0) {
            if (_swapDirectionSbUSDtoWCTC) {
                // sbUSD → wCTC: wCTC out = sbUSD in * 1e36 / price
                fairOutput = (_amountIn * 1e36) / oraclePrice;
            } else {
                // wCTC → sbUSD: sbUSD out = wCTC in * price / 1e36
                fairOutput = (_amountIn * oraclePrice) / 1e36;
            }
        } else {
            // Oracle unavailable — fall back to 1:1 with slippage applied
            fairOutput = _amountIn;
        }

        return fairOutput * (SLIPPAGE_DIVISOR - maxSlippageBps) / SLIPPAGE_DIVISOR;
    }

    // ═══════════════════════════════════════════════════════════════
    // View helpers
    // ═══════════════════════════════════════════════════════════════

    /// @notice Maximum safe borrow amount given current collateral.
    ///         Converts collateral units to loan token units via oracle price.
    ///
    ///         Oracle circuit-breaker: if the current spot price deviates from
    ///         lastKnownPrice by more than maxPriceDeviation bps, the call reverts.
    ///         This prevents flash-loan price manipulation from allowing over-borrowing.
    ///         On the very first borrow (lastKnownPrice == 0) the check is skipped and
    ///         the price is recorded.
    function _maxSafeBorrow() internal view returns (uint256) {
        (,, uint128 collateral) = lend.position(collateralMarketId, address(this));
        if (collateral == 0) return 0;

        // Read current spot price (1e36 scale)
        uint256 currentPrice = IOracle(collateralMarket.oracle).price();
        require(currentPrice > 0, "oracle: zero price");

        // Circuit-breaker: reject if price moved more than maxPriceDeviation from last known
        if (lastKnownPrice != 0) {
            uint256 deviation;
            if (currentPrice >= lastKnownPrice) {
                deviation = ((currentPrice - lastKnownPrice) * BPS_DENOMINATOR) / lastKnownPrice;
            } else {
                deviation = ((lastKnownPrice - currentPrice) * BPS_DENOMINATOR) / lastKnownPrice;
            }
            require(deviation <= maxPriceDeviation, "oracle: price deviation too high");
        }

        // Convert collateral to loan token value using the validated price
        uint256 collValueInLoan = (uint256(collateral) * currentPrice) / 1e36;

        // Target borrow based on leverage
        uint256 targetBorrow = (collValueInLoan * (targetLeverageBps - BPS_DENOMINATOR)) / targetLeverageBps;

        // Cap at safe LLTV
        uint256 safeLltv = collateralMarket.lltv * (BPS_DENOMINATOR - safetyMarginBps) / BPS_DENOMINATOR;
        uint256 maxFromLltv = (collValueInLoan * safeLltv) / 1e18;

        return targetBorrow < maxFromLltv ? targetBorrow : maxFromLltv;
    }

    /// @dev Persist the current oracle price as the new baseline after a successful borrow.
    ///      Called after _maxSafeBorrow() + borrow succeed so we know the price was accepted.
    function _acceptCurrentPrice() internal {
        uint256 currentPrice = IOracle(collateralMarket.oracle).price();
        if (currentPrice > 0) {
            lastKnownPrice = currentPrice;
            lastPriceTimestamp = block.timestamp;
            emit PriceUpdated(currentPrice, block.timestamp);
        }
    }

    function _currentBorrowAssets() internal view returns (uint256) {
        (, uint128 borrowShares,) = lend.position(collateralMarketId, address(this));
        if (borrowShares == 0) return 0;

        (,, uint128 totalBorrowAssets, uint128 totalBorrowShares,,) = lend.market(collateralMarketId);
        if (totalBorrowShares == 0) return 0;
        return (uint256(borrowShares) * uint256(totalBorrowAssets)) / uint256(totalBorrowShares);
    }

    function _computeMarketId(ISnowballLend.MarketParams memory mp) internal pure returns (bytes32 id) {
        assembly {
            id := keccak256(mp, 160)
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // Admin
    // ═══════════════════════════════════════════════════════════════

    function setTargetLeverage(uint256 _bps) external onlyManager {
        require(_bps >= BPS_DENOMINATOR && _bps <= MAX_LEVERAGE_BPS, "!leverage");
        emit LeverageUpdated(targetLeverageBps, _bps);
        targetLeverageBps = _bps;
    }

    function setSafetyMargin(uint256 _bps) external onlyManager {
        require(_bps > 0 && _bps <= 2000, "!margin"); // max 20% safety margin
        safetyMarginBps = _bps;
    }

    /// @notice Update the maximum oracle price deviation allowed before the circuit-breaker trips.
    /// @param _bps Deviation in basis points (e.g. 1000 = 10%). Maximum allowed is 5000 (50%).
    function setMaxPriceDeviation(uint256 _bps) external onlyManager {
        require(_bps > 0 && _bps <= 5000, "!deviation"); // sanity cap at 50%
        emit MaxPriceDeviationUpdated(maxPriceDeviation, _bps);
        maxPriceDeviation = _bps;
    }

    /// @notice Reset the price baseline to the current oracle price.
    ///         Use after a large, legitimate price move that triggered the circuit-breaker.
    ///         Only callable by the owner (higher trust level than keeper).
    function resetPriceBaseline() external onlyOwner {
        _acceptCurrentPrice();
    }

    /// @notice Current leverage ratio in basis points.
    function currentLeverageBps() external view returns (uint256) {
        (,, uint128 collateral) = lend.position(collateralMarketId, address(this));
        if (collateral == 0) return 0;
        uint256 oraclePrice = IOracle(collateralMarket.oracle).price();
        uint256 collValue = (uint256(collateral) * oraclePrice) / 1e36;
        uint256 borrowed = _currentBorrowAssets();
        if (collValue <= borrowed) return MAX_LEVERAGE_BPS;
        return (collValue * BPS_DENOMINATOR) / (collValue - borrowed);
    }
}
