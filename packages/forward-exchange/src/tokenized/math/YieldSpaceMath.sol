// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {UD60x18, ud, unwrap, UNIT as WAD_UD} from "@prb/math/UD60x18.sol";

/// @title YieldSpaceMath
/// @notice Core math library for Yield Space AMM curve: x^(1-t) + y^(1-t) = k
/// @dev All values use WAD (1e18) fixed-point. Uses PRBMath UD60x18 for pow/sqrt.
library YieldSpaceMath {
    uint256 internal constant WAD = 1e18;

    error MathOverflow();
    error ZeroReserve();
    error InsufficientOutput();

    /// @notice Compute base^exp using PRBMath UD60x18.pow
    /// @param base Base value (WAD)
    /// @param exp Exponent value (WAD)
    /// @return result base^exp (WAD)
    function powWad(uint256 base, uint256 exp) internal pure returns (uint256) {
        if (base == 0) return 0;
        if (exp == 0) return WAD;
        if (base == WAD) return WAD;
        return unwrap(ud(base).pow(ud(exp)));
    }

    /// @notice Calculate time-weighted curvature parameter t
    /// @dev t = t_min + (t_max - t_min) * sqrt(timeToMaturity / totalLifetime)
    /// @param timeToMaturity Seconds until maturity
    /// @param totalLifetime Total pool lifetime in seconds
    /// @param tMax Maximum curvature (WAD), e.g., 0.25e18
    /// @param tMin Minimum curvature floor (WAD), e.g., 0.05e18
    /// @return t Current curvature parameter (WAD)
    function calculateT(
        uint256 timeToMaturity,
        uint256 totalLifetime,
        uint256 tMax,
        uint256 tMin
    ) internal pure returns (uint256 t) {
        if (timeToMaturity == 0) return tMin;
        if (timeToMaturity >= totalLifetime) return tMax;

        // ratio = timeToMaturity / totalLifetime (WAD)
        uint256 ratio = timeToMaturity * WAD / totalLifetime;
        // sqrtRatio = sqrt(ratio) using PRBMath
        uint256 sqrtRatio = unwrap(ud(ratio).sqrt());
        // t = tMin + (tMax - tMin) * sqrtRatio / WAD
        uint256 range = tMax - tMin;
        t = tMin + range * sqrtRatio / WAD;
    }

    /// @notice Compute the Yield Space invariant k = x^(1-t) + y^(1-t)
    /// @param reserveX fToken reserve (WAD)
    /// @param reserveY sfToken reserve (WAD)
    /// @param t Curvature parameter (WAD)
    /// @return k Invariant value (WAD-scaled)
    function computeInvariant(
        uint256 reserveX,
        uint256 reserveY,
        uint256 t
    ) internal pure returns (uint256 k) {
        if (reserveX == 0 || reserveY == 0) revert ZeroReserve();
        uint256 oneMinusT = WAD - t; // 1 - t in WAD
        uint256 xPow = powWad(reserveX, oneMinusT);
        uint256 yPow = powWad(reserveY, oneMinusT);
        k = xPow + yPow;
    }

    /// @notice Calculate swap output given input amount
    /// @dev Δy = y - (k - (x + Δx)^(1-t))^(1/(1-t))
    /// @param reserveIn Reserve of input token (WAD)
    /// @param reserveOut Reserve of output token (WAD)
    /// @param amountIn Input amount after fee (WAD)
    /// @param t Curvature parameter (WAD)
    /// @param k Invariant value
    /// @return amountOut Output amount (WAD)
    function getAmountOut(
        uint256 reserveIn,
        uint256 reserveOut,
        uint256 amountIn,
        uint256 t,
        uint256 k
    ) internal pure returns (uint256 amountOut) {
        if (reserveIn == 0 || reserveOut == 0) revert ZeroReserve();
        if (amountIn == 0) return 0;

        uint256 oneMinusT = WAD - t;
        // newReserveIn = reserveIn + amountIn
        uint256 newReserveIn = reserveIn + amountIn;
        // newReserveIn^(1-t)
        uint256 newInPow = powWad(newReserveIn, oneMinusT);
        // k - newInPow must be positive
        if (k <= newInPow) revert InsufficientOutput();
        uint256 remainder = k - newInPow;
        // newReserveOut = remainder^(1/(1-t))
        uint256 invOneMinusT = WAD * WAD / oneMinusT; // 1/(1-t) in WAD
        uint256 newReserveOut = powWad(remainder, invOneMinusT);
        // amountOut = reserveOut - newReserveOut
        if (reserveOut <= newReserveOut) revert InsufficientOutput();
        amountOut = reserveOut - newReserveOut;
    }

    /// @notice Calculate pool skew: |x - y| / (x + y)
    /// @param x fToken reserve (WAD)
    /// @param y sfToken reserve (WAD)
    /// @return skew Skew value (WAD), 0 = balanced, WAD = fully skewed
    function calculateSkew(uint256 x, uint256 y) internal pure returns (uint256 skew) {
        if (x + y == 0) return 0;
        uint256 diff = x > y ? x - y : y - x;
        skew = diff * WAD / (x + y);
    }

    /// @notice Calculate effective fee with skew multiplier
    /// @dev Drain direction: multiplier = 1 + 4*skew^2/WAD
    ///      Rebalance direction: multiplier = max(0.5, 1 - skew)
    /// @param baseFee Base fee (WAD), e.g., 0.003e18 for 0.3%
    /// @param skew Current pool skew (WAD)
    /// @param isRebalancing True if trade reduces skew
    /// @return fee Effective fee (WAD)
    function calculateEffectiveFee(
        uint256 baseFee,
        uint256 skew,
        bool isRebalancing
    ) internal pure returns (uint256 fee) {
        uint256 multiplier;
        if (isRebalancing) {
            // multiplier = max(0.5, 1 - skew)
            if (WAD > skew) {
                multiplier = WAD - skew;
            } else {
                multiplier = WAD / 2;
            }
            if (multiplier < WAD / 2) {
                multiplier = WAD / 2;
            }
        } else {
            // multiplier = 1 + 4 * skew^2 / WAD
            multiplier = WAD + 4 * skew * skew / WAD;
        }
        fee = baseFee * multiplier / WAD;
    }

    /// @notice Calculate time-decaying base fee: feeMax * sqrt(T / T_total)
    /// @param timeToMaturity Seconds until maturity
    /// @param totalLifetime Total pool lifetime in seconds
    /// @param feeMax Maximum fee (WAD)
    /// @return baseFee Current base fee (WAD)
    function calculateBaseFee(
        uint256 timeToMaturity,
        uint256 totalLifetime,
        uint256 feeMax
    ) internal pure returns (uint256 baseFee) {
        if (timeToMaturity == 0) return 0;
        if (timeToMaturity >= totalLifetime) return feeMax;
        uint256 ratio = timeToMaturity * WAD / totalLifetime;
        uint256 sqrtRatio = unwrap(ud(ratio).sqrt());
        baseFee = feeMax * sqrtRatio / WAD;
    }
}
