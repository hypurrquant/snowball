// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {SnowballStrategyBase} from "../SnowballStrategyBase.sol";
import {IStabilityPool} from "../interfaces/IStabilityPool.sol";

/// @title StrategySbUSDStabilityPool
/// @notice Deposits sbUSD into Liquity StabilityPool.
///         Rewards: wCTC collateral gains + sbUSD yield gains.
///         Harvest: claim wCTC → charge fees → swap wCTC to sbUSD → re-deposit.
contract StrategySbUSDStabilityPool is SnowballStrategyBase {
    using SafeERC20 for IERC20;

    IStabilityPool public immutable stabilityPool;

    constructor(
        address _vault,
        address _want,          // sbUSD
        address _native,        // wCTC
        address _swapRouter,
        address _poolDeployer,
        address _strategist,
        address _treasury,
        address _stabilityPool
    )
        SnowballStrategyBase(
            _vault, _want, _native, _swapRouter, _poolDeployer, _strategist, _treasury
        )
    {
        stabilityPool = IStabilityPool(_stabilityPool);
    }

    // ─── Hooks ──────────────────────────────────────────────

    function _deposit(uint256 _amount) internal override {
        if (_amount > 0) {
            wantToken.forceApprove(address(stabilityPool), _amount);
            stabilityPool.provideToSP(_amount, false);
        }
    }

    function _withdraw(uint256 _amount) internal override {
        stabilityPool.withdrawFromSP(_amount, true);
    }

    function _emergencyWithdraw() internal override {
        uint256 deposited = stabilityPool.getCompoundedBoldDeposit(address(this));
        if (deposited > 0) {
            stabilityPool.withdrawFromSP(deposited, true);
        }
    }

    function _claim() internal override {
        // Trigger yield + collateral claim by doing a zero withdraw.
        stabilityPool.withdrawFromSP(0, true);
    }

    function _verifyRewardToken(address) internal pure override {
        // StabilityPool rewards are wCTC (native) and sbUSD (want).
        // Both are excluded from rewards[] by base contract checks.
        // Any additional reward token is accepted.
    }

    function balanceOfPool() public view override returns (uint256) {
        return stabilityPool.getCompoundedBoldDeposit(address(this))
            + stabilityPool.getDepositorYieldGainWithPending(address(this));
    }
}
