/**
 * Uniswap V3 price/tick calculation utilities (React-free)
 * Ported from @hq/core/dex/pool/utils/calculators.ts
 */

/** sqrtPriceX96 -> human-readable price */
export function sqrtPriceX96ToPrice(
  sqrtPriceX96: bigint,
  decimals0: number,
  decimals1: number,
): number {
  const Q96 = 2n ** 96n;
  const price = Number(sqrtPriceX96) / Number(Q96);
  return price * price * 10 ** (decimals0 - decimals1);
}

/** tick -> price */
export function tickToPrice(tick: number, decimals0: number, decimals1: number): number {
  return 1.0001 ** tick * 10 ** (decimals0 - decimals1);
}

/** price -> tick */
export function priceToTick(price: number, decimals0: number, decimals1: number): number {
  const adjusted = price / 10 ** (decimals0 - decimals1);
  return Math.floor(Math.log(adjusted) / Math.log(1.0001));
}

/** tick -> sqrtPrice (number, not Q96) */
export function tickToSqrtPrice(tick: number): number {
  return Math.pow(1.0001, tick / 2);
}

/** Snap tick to tickSpacing boundary */
export function alignTickToSpacing(tick: number, tickSpacing: number, roundDown: boolean = true): number {
  if (roundDown) {
    return Math.floor(tick / tickSpacing) * tickSpacing;
  }
  return Math.ceil(tick / tickSpacing) * tickSpacing;
}

/**
 * Calculate underlying token amounts for a Uniswap V3 position.
 *
 * Formulas (standard Uniswap V3):
 * - Below range (currentTick < tickLower):
 *     amount0 = L * (1/sqrtPl - 1/sqrtPu), amount1 = 0
 * - Above range (currentTick >= tickUpper):
 *     amount0 = 0, amount1 = L * (sqrtPu - sqrtPl)
 * - In range (tickLower <= currentTick < tickUpper):
 *     amount0 = L * (1/sqrtP - 1/sqrtPu), amount1 = L * (sqrtP - sqrtPl)
 */
export function getPositionAmounts(
  liquidity: bigint,
  tickLower: number,
  tickUpper: number,
  currentTick: number,
  decimals0: number,
  decimals1: number,
): { amount0: number; amount1: number } {
  const L = Number(liquidity);
  if (L === 0) return { amount0: 0, amount1: 0 };

  const sqrtPl = tickToSqrtPrice(tickLower);
  const sqrtPu = tickToSqrtPrice(tickUpper);

  let amount0 = 0;
  let amount1 = 0;

  if (currentTick < tickLower) {
    // Below range: all in token0
    amount0 = L * (1 / sqrtPl - 1 / sqrtPu);
  } else if (currentTick >= tickUpper) {
    // Above range: all in token1
    amount1 = L * (sqrtPu - sqrtPl);
  } else {
    // In range
    const sqrtP = tickToSqrtPrice(currentTick);
    amount0 = L * (1 / sqrtP - 1 / sqrtPu);
    amount1 = L * (sqrtP - sqrtPl);
  }

  // Convert from raw sqrt-price space to human-readable with decimals
  amount0 = amount0 / 10 ** decimals0;
  amount1 = amount1 / 10 ** decimals1;

  return { amount0, amount1 };
}

/** Format price for compact display */
export function formatPriceCompact(price: number): string {
  if (price === 0) return '0';
  if (price < 0.0001) return price.toExponential(2);
  if (price < 1) return price.toPrecision(4);
  if (price < 1000) return price.toFixed(4);
  return price.toFixed(2);
}
