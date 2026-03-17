// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {SnowballStrategyBase} from "../SnowballStrategyBase.sol";
import {ISnowballLend} from "../interfaces/ISnowballLend.sol";

/// @title StrategyUSDCMorpho
/// @notice Supplies USDC (6 decimals) to a Morpho Blue market.
///         Same pattern as StrategySbUSDMorpho but for USDC.
contract StrategyUSDCMorpho is SnowballStrategyBase {
    using SafeERC20 for IERC20;

    ISnowballLend public immutable lend;
    bytes32 public immutable marketId;
    ISnowballLend.MarketParams public marketParams;

    uint256 internal _lastSupplyAssets;

    constructor(
        address _vault,
        address _want,          // USDC (6 decimals)
        address _native,        // wCTC
        address _swapRouter,
        uint24 _swapFee,
        address _strategist,
        address _treasury,
        address _lend,
        ISnowballLend.MarketParams memory _marketParams
    )
        SnowballStrategyBase(
            _vault, _want, _native, _swapRouter, _swapFee, _strategist, _treasury
        )
    {
        lend = ISnowballLend(_lend);
        marketParams = _marketParams;
        marketId = _computeMarketId(_marketParams);
    }

    // ─── Hooks ──────────────────────────────────────────────

    function _deposit(uint256 _amount) internal override {
        if (_amount > 0) {
            wantToken.forceApprove(address(lend), _amount);
            lend.supply(marketParams, _amount, 0, address(this), "");
            // Re-read live position to avoid drift
            (uint256 shares,,) = lend.position(marketId, address(this));
            _lastSupplyAssets = _sharesToAssets(shares);
        }
    }

    function _withdraw(uint256 _amount) internal override {
        lend.withdraw(marketParams, _amount, 0, address(this), address(this));
        // Re-read live position to avoid drift
        (uint256 shares,,) = lend.position(marketId, address(this));
        _lastSupplyAssets = _sharesToAssets(shares);
    }

    function _emergencyWithdraw() internal override {
        (uint256 shares,,) = lend.position(marketId, address(this));
        if (shares > 0) {
            lend.withdraw(marketParams, 0, shares, address(this), address(this));
        }
        _lastSupplyAssets = 0;
    }

    function _claim() internal override {
        lend.accrueInterest(marketParams);

        (uint256 shares,,) = lend.position(marketId, address(this));
        uint256 currentAssets = _sharesToAssets(shares);
        if (currentAssets > _lastSupplyAssets) {
            uint256 profit = currentAssets - _lastSupplyAssets;
            lend.withdraw(marketParams, profit, 0, address(this), address(this));
            _lastSupplyAssets = currentAssets - profit;

            // Swap USDC profit -> native (wCTC) for fee distribution.
            uint256 profitBal = wantToken.balanceOf(address(this));
            if (profitBal > 0) {
                _swap(address(wantToken), address(native), profitBal);
            }
        }
    }

    function _verifyRewardToken(address) internal pure override {
        // Morpho strategies don't have external reward tokens.
    }

    function balanceOfPool() public view override returns (uint256) {
        (uint256 shares,,) = lend.position(marketId, address(this));
        return _sharesToAssets(shares);
    }

    function _sharesToAssets(uint256 shares) internal view returns (uint256) {
        (uint128 totalSupplyAssets, uint128 totalSupplyShares,,,,) = lend.market(marketId);
        if (totalSupplyShares == 0) return 0;
        return (shares * uint256(totalSupplyAssets)) / uint256(totalSupplyShares);
    }

    function _computeMarketId(ISnowballLend.MarketParams memory mp) internal pure returns (bytes32 id) {
        assembly {
            id := keccak256(mp, 160) // 5 * 32 bytes
        }
    }
}
