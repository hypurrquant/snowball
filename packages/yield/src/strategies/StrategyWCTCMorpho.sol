// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {SnowballStrategyBase} from "../SnowballStrategyBase.sol";
import {ISnowballLend} from "../interfaces/ISnowballLend.sol";

/// @title StrategyWCTCMorpho
/// @notice Supplies wCTC to a SnowballLend (Morpho) market.
///         Since want == native (wCTC), no extra swap is needed in _claim.
contract StrategyWCTCMorpho is SnowballStrategyBase {
    using SafeERC20 for IERC20;

    ISnowballLend public immutable lend;
    bytes32 public immutable marketId;

    uint256 internal _lastSupplyAssets;

    constructor(
        address _vault,
        address _want,          // wCTC (same as native)
        address _native,        // wCTC
        address _swapRouter,
        address _poolDeployer,
        address _strategist,
        address _treasury,
        address _lend,
        bytes32 _marketId
    )
        SnowballStrategyBase(
            _vault, _want, _native, _swapRouter, _poolDeployer, _strategist, _treasury
        )
    {
        lend = ISnowballLend(_lend);
        marketId = _marketId;
    }

    // ─── Hooks ──────────────────────────────────────────────

    function _deposit(uint256 _amount) internal override {
        if (_amount > 0) {
            wantToken.forceApprove(address(lend), _amount);
            lend.supply(marketId, _amount, 0, address(this), "");
            _lastSupplyAssets += _amount;
        }
    }

    function _withdraw(uint256 _amount) internal override {
        lend.withdraw(marketId, _amount, 0, address(this), address(this));
        if (_lastSupplyAssets > _amount) {
            _lastSupplyAssets -= _amount;
        } else {
            _lastSupplyAssets = 0;
        }
    }

    function _emergencyWithdraw() internal override {
        uint256 shares = lend.supplyShares(marketId, address(this));
        if (shares > 0) {
            lend.withdraw(marketId, 0, shares, address(this), address(this));
        }
        _lastSupplyAssets = 0;
    }

    function _claim() internal override {
        lend.accrueInterest(marketId);

        uint256 currentAssets = _sharesToAssets(
            lend.supplyShares(marketId, address(this))
        );
        if (currentAssets > _lastSupplyAssets) {
            uint256 profit = currentAssets - _lastSupplyAssets;
            lend.withdraw(marketId, profit, 0, address(this), address(this));
            _lastSupplyAssets = currentAssets - profit;
            // want == native (wCTC), so profit is already in native — no swap needed.
        }
    }

    function _verifyRewardToken(address) internal pure override {
        // Morpho strategies don't have external reward tokens.
    }

    function balanceOfPool() public view override returns (uint256) {
        return _sharesToAssets(lend.supplyShares(marketId, address(this)));
    }

    function _sharesToAssets(uint256 shares) internal view returns (uint256) {
        (uint128 totalSupplyAssets, uint128 totalSupplyShares,,,,) = lend.market(marketId);
        if (totalSupplyShares == 0) return 0;
        return (shares * uint256(totalSupplyAssets)) / uint256(totalSupplyShares);
    }
}
