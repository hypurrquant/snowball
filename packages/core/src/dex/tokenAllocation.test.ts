/**
 * tokenAllocation.ts unit tests
 * Run: npx tsx packages/core/src/dex/tokenAllocation.test.ts
 */

import {
  calcCoefficients,
  calcOtherTokenAmount,
  calcMaxAmountsFromBalances,
} from './tokenAllocation';

let passed = 0;
let failed = 0;

function assert(condition: boolean, label: string) {
  if (condition) {
    passed++;
  } else {
    failed++;
    console.error(`  FAIL: ${label}`);
  }
}

function assertApprox(actual: number, expected: number, tolerance: number, label: string) {
  if (expected === 0) {
    assert(actual === 0, label);
    return;
  }
  const diff = Math.abs(actual - expected) / Math.abs(expected);
  assert(diff <= tolerance, `${label} (actual=${actual}, expected=${expected}, diff=${(diff * 100).toFixed(4)}%)`);
}

// ─── calcCoefficients ───

console.log('calcCoefficients:');

// In-range: currentTick=0, tickLower=-600, tickUpper=600
const inRange = calcCoefficients(0, -600, 600);
assert(inRange !== null, 'in-range returns non-null');
assert(inRange!.case === 'in_range', 'in-range case');
assert(inRange!.c0 > 0, 'in-range c0 > 0');
assert(inRange!.c1 > 0, 'in-range c1 > 0');

// Below: currentTick=-1000, tickLower=-600, tickUpper=600
const below = calcCoefficients(-1000, -600, 600);
assert(below !== null, 'below returns non-null');
assert(below!.case === 'below', 'below case');
assert(below!.c0 === 1, 'below c0 === 1');
assert(below!.c1 === 0, 'below c1 === 0');

// Above: currentTick=1000, tickLower=-600, tickUpper=600
const above = calcCoefficients(1000, -600, 600);
assert(above !== null, 'above returns non-null');
assert(above!.case === 'above', 'above case');
assert(above!.c0 === 0, 'above c0 === 0');
assert(above!.c1 === 1, 'above c1 === 1');

// Zero-width range: tickLower === tickUpper → null
const zeroWidth = calcCoefficients(0, 600, 600);
assert(zeroWidth === null, 'zero-width returns null');

// Negative-width range: tickLower > tickUpper → null
const negWidth = calcCoefficients(0, 600, -600);
assert(negWidth === null, 'negative-width returns null');

// Extreme ticks: overflow guard
const extreme = calcCoefficients(800000, 790000, 810000);
// Should either return null or have finite coefficients
if (extreme !== null) {
  assert(isFinite(extreme.c0) && isFinite(extreme.c1), 'extreme ticks have finite coefficients');
}

// ─── calcOtherTokenAmount ───

console.log('calcOtherTokenAmount:');

// In-range: token0=100 → token1
const coeff = calcCoefficients(0, -600, 600)!;
const derived1 = calcOtherTokenAmount(100, true, coeff);
assert(derived1 > 0, 'token0→token1 > 0');

// Reverse: token1 → token0
const derived0 = calcOtherTokenAmount(derived1, false, coeff);
assertApprox(derived0, 100, 0.001, 'round-trip token0→token1→token0 ≈ 100');

// Below: token0 input → token1 = 0
const derived1Below = calcOtherTokenAmount(100, true, below!);
assert(derived1Below === 0, 'below: token0→token1 = 0');

// Above: token1 input → token0 = 0
const derived0Above = calcOtherTokenAmount(100, false, above!);
assert(derived0Above === 0, 'above: token1→token0 = 0');

// Zero input
assert(calcOtherTokenAmount(0, true, coeff) === 0, 'zero input → 0');
assert(calcOtherTokenAmount(-1, true, coeff) === 0, 'negative input → 0');
assert(calcOtherTokenAmount(NaN, true, coeff) === 0, 'NaN input → 0');

// ─── calcMaxAmountsFromBalances ───

console.log('calcMaxAmountsFromBalances:');

// In-range: balance0=1000, balance1=500
const max = calcMaxAmountsFromBalances(1000, 500, coeff);
assert(max.amount0 > 0 && max.amount0 <= 1000, 'max amount0 in range');
assert(max.amount1 > 0 && max.amount1 <= 500, 'max amount1 in range');

// Verify ratio matches coefficient ratio
const expectedRatio = coeff.c1 / coeff.c0;
const actualRatio = max.amount1 / max.amount0;
assertApprox(actualRatio, expectedRatio, 0.001, 'max ratio matches c1/c0');

// Below: only token0
const maxBelow = calcMaxAmountsFromBalances(1000, 500, below!);
assert(maxBelow.amount0 === 1000, 'below: max amount0 = balance0');
assert(maxBelow.amount1 === 0, 'below: max amount1 = 0');

// Above: only token1
const maxAbove = calcMaxAmountsFromBalances(1000, 500, above!);
assert(maxAbove.amount0 === 0, 'above: max amount0 = 0');
assert(maxAbove.amount1 === 500, 'above: max amount1 = balance1');

// Zero balances
const maxZero = calcMaxAmountsFromBalances(0, 0, coeff);
assert(maxZero.amount0 === 0 && maxZero.amount1 === 0, 'zero balances → zero amounts');

// ─── Summary ───

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) {
  process.exit(1);
}
console.log('All tests passed!');
