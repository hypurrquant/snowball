import { tickToPrice, alignTickToSpacing } from "@/core/dex/calculators";
import type { TickDisplayData } from "@/core/dex/types";

// --- ABI fragments for tick bitmap + ticks ---

export const TICK_BITMAP_ABI = [
  {
    name: "tickBitmap",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "wordPos", type: "int16" }],
    outputs: [{ name: "bitmap", type: "uint256" }],
  },
] as const;

export const TICKS_ABI = [
  {
    name: "ticks",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "tick", type: "int24" }],
    outputs: [
      { name: "liquidityGross", type: "uint128" },
      { name: "liquidityNet", type: "int128" },
      { name: "feeGrowthOutside0X128", type: "uint256" },
      { name: "feeGrowthOutside1X128", type: "uint256" },
      { name: "tickCumulativeOutside", type: "int56" },
      { name: "secondsPerLiquidityOutsideX128", type: "uint160" },
      { name: "secondsOutside", type: "uint32" },
      { name: "initialized", type: "bool" },
    ],
  },
] as const;

// tickSpacing steps on each side (+-72,000 ticks)
export const TICK_RANGE = 1200;

// --- Bitmap word position helpers (UniswapV3 pattern) ---

export function computeWordPositions(minTick: number, maxTick: number, tickSpacing: number): number[] {
  const divisor = tickSpacing * 256;
  const minWord = Math.floor(minTick / divisor);
  const maxWord = Math.floor(maxTick / divisor);
  const positions: number[] = [];
  for (let word = minWord; word <= maxWord; word++) {
    positions.push(word);
  }
  return positions;
}

export function extractInitializedTicks(
  bitmap: bigint,
  wordPos: number,
  tickSpacing: number,
  minTick: number,
  maxTick: number,
): number[] {
  const ticks: number[] = [];
  for (let bit = 0; bit < 256; bit++) {
    if (((bitmap >> BigInt(bit)) & 1n) === 0n) continue;
    const tick = (wordPos * 256 + bit) * tickSpacing;
    if (tick >= minTick && tick <= maxTick) {
      ticks.push(tick);
    }
  }
  return ticks;
}

/** Empty ticks when no on-chain data exists */
export function buildEmptyTicks(
  currentTick: number,
  tickSpacing: number,
  decimals0: number,
  decimals1: number,
): TickDisplayData[] {
  const baseTick = alignTickToSpacing(currentTick, tickSpacing, true);
  const ticks: TickDisplayData[] = [];
  for (let i = -40; i < 40; i++) {
    const tick = baseTick + i * tickSpacing;
    const tickNext = tick + tickSpacing;
    ticks.push({
      priceLower: tickToPrice(tick, decimals0, decimals1),
      priceUpper: tickToPrice(tickNext, decimals0, decimals1),
      liquidityUsd: 0,
      liquidityRaw: "0",
      isCurrentTick: currentTick >= tick && currentTick < tickNext,
    });
  }
  return ticks;
}
