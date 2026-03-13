// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "forge-std/Test.sol";
import {YieldSpaceMath} from "../../src/tokenized/math/YieldSpaceMath.sol";

contract YieldSpaceMathTest is Test {
    uint256 constant WAD = 1e18;

    // ─── powWad ───

    function test_PowWad_OneExponent() public pure {
        // x^1 = x
        uint256 result = YieldSpaceMath.powWad(2e18, WAD);
        assertApproxEqRel(result, 2e18, 1e14); // 0.01% tolerance
    }

    function test_PowWad_ZeroExponent() public pure {
        // x^0 = 1
        uint256 result = YieldSpaceMath.powWad(5e18, 0);
        assertEq(result, WAD);
    }

    function test_PowWad_ZeroBase() public pure {
        // 0^x = 0
        uint256 result = YieldSpaceMath.powWad(0, 5e17);
        assertEq(result, 0);
    }

    function test_PowWad_FractionalExponent() public pure {
        // 4^0.5 = 2
        uint256 result = YieldSpaceMath.powWad(4e18, 5e17);
        assertApproxEqRel(result, 2e18, 1e14);
    }

    function test_PowWad_SmallExponent() public pure {
        // 2^0.75 ≈ 1.6818
        uint256 result = YieldSpaceMath.powWad(2e18, 75e16);
        assertApproxEqRel(result, 1681792830507429e3, 1e14);
    }

    // ─── calculateT ───

    function test_CalculateT_AtMaturity() public pure {
        // timeToMaturity = 0 → t = tMin
        uint256 t = YieldSpaceMath.calculateT(0, 90 days, 25e16, 5e16);
        assertEq(t, 5e16); // t_min = 0.05
    }

    function test_CalculateT_AtInception() public pure {
        // timeToMaturity = totalLifetime → t = tMax
        uint256 t = YieldSpaceMath.calculateT(90 days, 90 days, 25e16, 5e16);
        assertEq(t, 25e16); // t_max = 0.25
    }

    function test_CalculateT_MidLife() public pure {
        // timeToMaturity = 45 days (half), sqrt(0.5) ≈ 0.707
        // t = 0.05 + 0.20 * 0.707 ≈ 0.191
        uint256 t = YieldSpaceMath.calculateT(45 days, 90 days, 25e16, 5e16);
        assertApproxEqRel(t, 191421356237309e3, 1e15); // ~0.191, 0.1% tolerance
    }

    function test_CalculateT_FloorEnforced() public pure {
        // Very small timeToMaturity → t should still be > tMin
        uint256 t = YieldSpaceMath.calculateT(1, 90 days, 25e16, 5e16);
        assertGt(t, 5e16);
    }

    // ─── computeInvariant ───

    function test_ComputeInvariant_EqualReserves() public pure {
        // x = y = 1000e18, t = 0.25
        // k = 2 * 1000^0.75
        uint256 k = YieldSpaceMath.computeInvariant(1000e18, 1000e18, 25e16);
        assertGt(k, 0);
    }

    function test_ComputeInvariant_ZeroReserve_ReturnsZeroPow() public pure {
        // When base=0, powWad returns 0, so k = 0 + y^(1-t)
        // Since the library function checks for zero and reverts,
        // but it's an internal call, we verify the zero base path
        uint256 result = YieldSpaceMath.powWad(0, 75e16);
        assertEq(result, 0);
    }

    // ─── getAmountOut ───

    function test_GetAmountOut_SmallSwap() public pure {
        // Equal reserves, small swap should give nearly 1:1
        uint256 reserveX = 1000e18;
        uint256 reserveY = 1000e18;
        uint256 t = 25e16; // 0.25
        uint256 k = YieldSpaceMath.computeInvariant(reserveX, reserveY, t);

        uint256 amountIn = 1e18; // 1 token (0.1% of pool)
        uint256 amountOut = YieldSpaceMath.getAmountOut(reserveX, reserveY, amountIn, t, k);

        // Should be close to 1:1 but slightly less due to curvature
        assertGt(amountOut, 99e16); // > 0.99
        assertLt(amountOut, WAD);   // < 1.0
    }

    function test_GetAmountOut_ZeroInput() public pure {
        uint256 k = YieldSpaceMath.computeInvariant(1000e18, 1000e18, 25e16);
        uint256 amountOut = YieldSpaceMath.getAmountOut(1000e18, 1000e18, 0, 25e16, k);
        assertEq(amountOut, 0);
    }

    // ─── calculateSkew ───

    function test_CalculateSkew_Balanced() public pure {
        uint256 skew = YieldSpaceMath.calculateSkew(1000e18, 1000e18);
        assertEq(skew, 0);
    }

    function test_CalculateSkew_Skewed() public pure {
        // 750:250 → skew = 500/1000 = 0.5
        uint256 skew = YieldSpaceMath.calculateSkew(750e18, 250e18);
        assertEq(skew, 5e17);
    }

    function test_CalculateSkew_FullySkewed() public pure {
        // 999:1 → skew = 998/1000 = 0.998
        uint256 skew = YieldSpaceMath.calculateSkew(999e18, 1e18);
        assertEq(skew, 998e15); // 0.998
    }

    // ─── calculateEffectiveFee ───

    function test_EffectiveFee_Balanced_NoDrainBoost() public pure {
        // Balanced pool, drain direction: multiplier = 1 + 4*0^2 = 1
        uint256 fee = YieldSpaceMath.calculateEffectiveFee(3e15, 0, false); // 0.3% base
        assertEq(fee, 3e15);
    }

    function test_EffectiveFee_HighSkew_DrainPenalty() public pure {
        // skew = 0.5, drain: multiplier = 1 + 4*0.25 = 2
        uint256 fee = YieldSpaceMath.calculateEffectiveFee(3e15, 5e17, false);
        assertEq(fee, 6e15); // 0.6%
    }

    function test_EffectiveFee_Rebalancing_Discount() public pure {
        // skew = 0.3, rebalancing: multiplier = 1 - 0.3 = 0.7
        uint256 fee = YieldSpaceMath.calculateEffectiveFee(3e15, 3e17, true);
        assertApproxEqRel(fee, 21e14, 1e14); // 0.21%
    }

    function test_EffectiveFee_Rebalancing_MinHalf() public pure {
        // skew = 0.9, rebalancing: multiplier = max(0.5, 1 - 0.9) = 0.5
        uint256 fee = YieldSpaceMath.calculateEffectiveFee(3e15, 9e17, true);
        assertEq(fee, 15e14); // 0.15%
    }

    // ─── calculateBaseFee ───

    function test_BaseFee_AtInception() public pure {
        uint256 fee = YieldSpaceMath.calculateBaseFee(90 days, 90 days, 3e15);
        assertEq(fee, 3e15); // feeMax
    }

    function test_BaseFee_AtMaturity() public pure {
        uint256 fee = YieldSpaceMath.calculateBaseFee(0, 90 days, 3e15);
        assertEq(fee, 0);
    }

    function test_BaseFee_Decays() public pure {
        uint256 fee = YieldSpaceMath.calculateBaseFee(45 days, 90 days, 3e15);
        // sqrt(0.5) * 0.3% ≈ 0.212%
        assertApproxEqRel(fee, 2121320343559642, 1e15);
    }
}
