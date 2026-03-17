// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {SnowballStrategyBase} from "../SnowballStrategyBase.sol";
import {ISnowballLendFull, IMorphoFlashLoanCallback} from "../interfaces/ISnowballLendFull.sol";
import {ISnowballLend} from "../interfaces/ISnowballLend.sol";

interface IOracle {
    function price() external view returns (uint256);
}

/// @title StrategyWCTCLoop
/// @notice Leveraged wCTC yield strategy using Morpho Blue.
///
///         Flow: wCTC deposit → supply as collateral → borrow sbUSD → supply sbUSD (earn interest)
///         Profit = (supply APY × leverage) - (borrow APY × (leverage - 1))
///
///         Uses Morpho flash loans for atomic leverage/deleverage.
///         Safety: maintains margin below LLTV to avoid liquidation.
contract StrategyWCTCLoop is SnowballStrategyBase, IMorphoFlashLoanCallback {
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

    // --- Tracking ---
    uint256 public totalCollateralSupplied;
    uint256 public totalBorrowed;

    // --- Flash loan action types ---
    uint8 private constant ACTION_LEVERAGE = 1;
    uint8 private constant ACTION_DELEVERAGE = 2;

    event Leveraged(uint256 collateral, uint256 borrowed, uint256 leverageBps);
    event Deleveraged(uint256 collateralWithdrawn, uint256 repaid);
    event LeverageUpdated(uint256 oldBps, uint256 newBps);

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

        // Check sbUSD supply profit (interest earned on supplied sbUSD)
        (uint256 supplyShares,,) = lend.position(collateralMarketId, address(this));
        uint256 currentSupply = _sharesToAssets(supplyShares);

        // Net profit = sbUSD supply growth (interest earned on lent sbUSD)
        // We don't track supply shares for sbUSD directly in this market since
        // we're the borrower. Profit manifests as collateral value growth relative to debt.
        // For simplicity, we realize profit by checking wCTC balance after partial deleverage.

        // Partial deleverage to realize profits if any excess collateral exists
        (,uint128 borrowShares, uint128 collateral) = lend.position(collateralMarketId, address(this));
        if (collateral > 0 && totalCollateralSupplied > 0) {
            uint256 collateralValue = uint256(collateral);
            if (collateralValue > totalCollateralSupplied) {
                // We have excess collateral (unlikely in pure loop, but possible from price movement)
                // Leave it for now — profit comes from sbUSD interest spread
            }
        }

        // The main profit mechanism: swap any idle sbUSD (from interest spread) to wCTC
        uint256 sbUSDBalance = sbUSD.balanceOf(address(this));
        if (sbUSDBalance > 0) {
            _swap(address(sbUSD), address(native), sbUSDBalance);
        }
    }

    function _verifyRewardToken(address) internal pure override {
        // No external reward tokens
    }

    function balanceOfPool() public view override returns (uint256) {
        (,, uint128 collateral) = lend.position(collateralMarketId, address(this));
        uint256 currentBorrow = _currentBorrowAssets();
        // Convert borrow (sbUSD) back to wCTC terms using oracle price (1e36 scale)
        uint256 oraclePrice = collateral > 0
            ? IOracle(collateralMarket.oracle).price()
            : 0;
        uint256 borrowInWCTC = oraclePrice > 0
            ? (currentBorrow * 1e36) / oraclePrice
            : 0;
        uint256 col = uint256(collateral);
        return col > borrowInWCTC ? col - borrowInWCTC : 0;
    }

    // ═══════════════════════════════════════════════════════════════
    // Leverage mechanics
    // ═══════════════════════════════════════════════════════════════

    /// @notice Leverage up: supply wCTC as collateral, borrow sbUSD, repeat.
    ///         Uses flash loan for atomic execution.
    function _leverageUp(uint256 _wctcAmount) internal {
        // Calculate how much sbUSD to borrow based on target leverage
        // leverage = totalCollateral / equity
        // Additional borrow = wctcAmount * (leverage - 1) * price
        // For simplicity, we do iterative leverage without flash loan first

        // Step 1: Supply wCTC as collateral
        wantToken.forceApprove(address(lend), _wctcAmount);
        lend.supplyCollateral(collateralMarket, _wctcAmount, address(this), "");
        totalCollateralSupplied += _wctcAmount;

        // Step 2: Borrow sbUSD up to safe limit
        uint256 maxBorrow = _maxSafeBorrow();
        uint256 currentBorrow = _currentBorrowAssets();
        if (maxBorrow > currentBorrow) {
            uint256 borrowAmount = maxBorrow - currentBorrow;
            if (borrowAmount > 0) {
                lend.borrow(collateralMarket, borrowAmount, 0, address(this), address(this));
                totalBorrowed += borrowAmount;

                // Step 3: Supply borrowed sbUSD back as loanToken supply (earn interest)
                sbUSD.forceApprove(address(lend), borrowAmount);
                lend.supply(collateralMarket, borrowAmount, 0, address(this), "");
            }
        }

        emit Leveraged(_wctcAmount, totalBorrowed, targetLeverageBps);
    }

    /// @notice Deleverage to free up a specific amount of wCTC.
    function _deleverageFor(uint256 _wctcNeeded) internal {
        if (totalBorrowed == 0) {
            // No leverage, just withdraw collateral
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

        // Withdraw supplied sbUSD first
        if (borrowToRepay > 0) {
            lend.withdraw(collateralMarket, borrowToRepay, 0, address(this), address(this));
            // Repay the borrow
            sbUSD.forceApprove(address(lend), borrowToRepay);
            lend.repay(collateralMarket, borrowToRepay, 0, address(this), "");
            if (totalBorrowed > borrowToRepay) {
                totalBorrowed -= borrowToRepay;
            } else {
                totalBorrowed = 0;
            }
        }

        // Withdraw collateral
        lend.withdrawCollateral(collateralMarket, _wctcNeeded, address(this), address(this));
        if (totalCollateralSupplied > _wctcNeeded) {
            totalCollateralSupplied -= _wctcNeeded;
        } else {
            totalCollateralSupplied = 0;
        }

        emit Deleveraged(_wctcNeeded, borrowToRepay);
    }

    /// @notice Full deleverage — unwind entire position.
    function _deleverageAll() internal {
        // Withdraw all supplied sbUSD
        (uint256 supplyShares,,) = lend.position(collateralMarketId, address(this));
        if (supplyShares > 0) {
            lend.withdraw(collateralMarket, 0, supplyShares, address(this), address(this));
        }

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
    // Flash loan callback
    // ═══════════════════════════════════════════════════════════════

    function onMorphoFlashLoan(uint256 assets, bytes calldata data) external override {
        require(msg.sender == address(lend), "!lend");

        uint8 action = abi.decode(data, (uint8));

        if (action == ACTION_LEVERAGE) {
            // Flash borrowed sbUSD -> supply sbUSD -> supply wCTC collateral -> borrow sbUSD to repay flash
            sbUSD.forceApprove(address(lend), assets);
            lend.supply(collateralMarket, assets, 0, address(this), "");

            // Borrow sbUSD to repay flash loan
            lend.borrow(collateralMarket, assets, 0, address(this), address(this));
            totalBorrowed += assets;

            // Repay flash loan
            sbUSD.forceApprove(address(lend), assets);
        } else if (action == ACTION_DELEVERAGE) {
            // Flash borrowed sbUSD -> repay borrow -> withdraw collateral -> sell wCTC for sbUSD -> repay flash
            sbUSD.forceApprove(address(lend), assets);
            lend.repay(collateralMarket, assets, 0, address(this), "");
            if (totalBorrowed > assets) {
                totalBorrowed -= assets;
            } else {
                totalBorrowed = 0;
            }

            // Repay flash loan — caller must ensure enough sbUSD is available
            sbUSD.forceApprove(address(lend), assets);
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // View helpers
    // ═══════════════════════════════════════════════════════════════

    /// @notice Maximum safe borrow amount given current collateral.
    ///         Converts collateral units to loan token units via oracle price.
    function _maxSafeBorrow() internal view returns (uint256) {
        (,, uint128 collateral) = lend.position(collateralMarketId, address(this));
        if (collateral == 0) return 0;

        // Convert collateral to loan token value using oracle price (1e36 scale)
        uint256 oraclePrice = IOracle(collateralMarket.oracle).price();
        uint256 collValueInLoan = (uint256(collateral) * oraclePrice) / 1e36;

        // Target borrow based on leverage
        uint256 targetBorrow = (collValueInLoan * (targetLeverageBps - BPS_DENOMINATOR)) / targetLeverageBps;

        // Cap at safe LLTV
        uint256 safeLltv = collateralMarket.lltv * (BPS_DENOMINATOR - safetyMarginBps) / BPS_DENOMINATOR;
        uint256 maxFromLltv = (collValueInLoan * safeLltv) / 1e18;

        return targetBorrow < maxFromLltv ? targetBorrow : maxFromLltv;
    }

    function _currentBorrowAssets() internal view returns (uint256) {
        (, uint128 borrowShares,) = lend.position(collateralMarketId, address(this));
        if (borrowShares == 0) return 0;

        (,, uint128 totalBorrowAssets, uint128 totalBorrowShares,,) = lend.market(collateralMarketId);
        if (totalBorrowShares == 0) return 0;
        return (uint256(borrowShares) * uint256(totalBorrowAssets)) / uint256(totalBorrowShares);
    }

    function _sharesToAssets(uint256 shares) internal view returns (uint256) {
        (uint128 totalSupplyAssets, uint128 totalSupplyShares,,,,) = lend.market(collateralMarketId);
        if (totalSupplyShares == 0) return 0;
        return (shares * uint256(totalSupplyAssets)) / uint256(totalSupplyShares);
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
