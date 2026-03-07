/**
 * Token allocation math for Uniswap V3 concentrated liquidity.
 * Pure math module (React-free).
 *
 * All amount inputs/outputs are human-readable numbers (not bigint/wei).
 * bigint ↔ number conversion is the hook's responsibility.
 */

import { tickToSqrtPrice } from './calculators';

// ────────────────────────────────────────────
// Types
// ────────────────────────────────────────────

export interface TickCoefficients {
  c0: number; // token0 coefficient: (sqrtPu - sqrtP) / (sqrtPu * sqrtP)
  c1: number; // token1 coefficient: sqrtP - sqrtPl
  case: 'in_range' | 'below' | 'above';
}

// ────────────────────────────────────────────
// Core functions
// ────────────────────────────────────────────

/**
 * Calculate tick coefficients for a given tick range.
 *
 * - in_range (tickLower <= currentTick < tickUpper): both tokens needed
 * - below (currentTick < tickLower): token0 only
 * - above (currentTick >= tickUpper): token1 only
 */
export function calcCoefficients(
  currentTick: number,
  tickLower: number,
  tickUpper: number,
): TickCoefficients | null {
  // Invalid range guard
  if (tickLower >= tickUpper) {
    return null;
  }

  if (currentTick >= tickUpper) {
    return { c0: 0, c1: 1, case: 'above' };
  }

  if (currentTick < tickLower) {
    return { c0: 1, c1: 0, case: 'below' };
  }

  // In-range
  const sqrtP = tickToSqrtPrice(currentTick);
  const sqrtPl = tickToSqrtPrice(tickLower);
  const sqrtPu = tickToSqrtPrice(tickUpper);

  const c0 = (sqrtPu - sqrtP) / (sqrtPu * sqrtP);
  const c1 = sqrtP - sqrtPl;

  // Overflow guard for extreme ticks
  if (!isFinite(c0) || !isFinite(c1) || c0 < 0 || c1 < 0) {
    return null;
  }

  return { c0, c1, case: 'in_range' };
}

/**
 * Calculate the other token amount given one token input.
 *
 * token0 input → token1 = amount * (c1/c0)
 * token1 input → token0 = amount * (c0/c1)
 *
 * @param amount - human-readable amount (number)
 * @param isToken0 - true if input is token0
 * @param coeff - tick coefficients
 * @returns paired token amount (number, human-readable)
 */
export function calcOtherTokenAmount(
  amount: number,
  isToken0: boolean,
  coeff: TickCoefficients,
): number {
  if (!isFinite(amount) || amount <= 0) return 0;

  // Single-token case: other token is always 0
  if (coeff.case === 'below' || coeff.case === 'above') return 0;

  const { c0, c1 } = coeff;
  if (c0 <= 0 || c1 <= 0) return 0;

  const ratio = isToken0 ? c1 / c0 : c0 / c1;
  const result = amount * ratio;

  return isFinite(result) ? result : 0;
}

/**
 * Calculate max amounts from both balances while maintaining ratio.
 *
 * L = min(balance0/c0, balance1/c1)
 * amount0 = L * c0, amount1 = L * c1
 *
 * @param balance0 - human-readable balance of token0
 * @param balance1 - human-readable balance of token1
 * @param coeff - tick coefficients
 * @returns { amount0, amount1 } human-readable
 */
export function calcMaxAmountsFromBalances(
  balance0: number,
  balance1: number,
  coeff: TickCoefficients,
): { amount0: number; amount1: number } {
  // Single-token cases
  if (coeff.case === 'below') {
    return { amount0: balance0, amount1: 0 };
  }
  if (coeff.case === 'above') {
    return { amount0: 0, amount1: balance1 };
  }

  // In-range
  const { c0, c1 } = coeff;
  if (c0 <= 0 || c1 <= 0) {
    return { amount0: 0, amount1: 0 };
  }

  const L0 = balance0 / c0;
  const L1 = balance1 / c1;
  const L = Math.min(L0, L1);

  const amount0 = L * c0;
  const amount1 = L * c1;

  return {
    amount0: Math.min(amount0, balance0),
    amount1: Math.min(amount1, balance1),
  };
}
