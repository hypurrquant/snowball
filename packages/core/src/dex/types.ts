/**
 * DEX pool types (React-free)
 * Simplified from @hq/core PoolDTO for snowball
 */

/** Tick display data for liquidity histogram */
export interface TickDisplayData {
  priceLower: number;
  priceUpper: number;
  liquidityUsd: number;
  liquidityRaw: string;
  isCurrentTick: boolean;
}

/** Pool on-chain state from slot0 + liquidity */
export interface PoolState {
  sqrtPriceX96: bigint;
  currentTick: number;
  liquidity: bigint;
  fee: number;
  tickSpacing: number;
}
