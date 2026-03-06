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

/** Format price for compact display */
export function formatPriceCompact(price: number): string {
  if (price === 0) return '0';
  if (price < 0.0001) return price.toExponential(2);
  if (price < 1) return price.toPrecision(4);
  if (price < 1000) return price.toFixed(4);
  return price.toFixed(2);
}
