"use client";

import { useMemo } from "react";
import { usePool } from "./usePool";
import { sqrtPriceX96ToPrice, tickToPrice, alignTickToSpacing } from "@/core/dex/calculators";
import type { TickDisplayData } from "@/core/dex/types";
import type { Address } from "viem";

interface UsePoolTicksReturn {
  ticks: TickDisplayData[];
  currentPrice: number;
  currentTick: number;
  tickSpacing: number;
  isLoading: boolean;
}

/**
 * Pool ticks hook: real pool state from chain + mock tick liquidity distribution.
 *
 * slot0 (sqrtPriceX96, tick) and liquidity come from on-chain.
 * Tick-level liquidity distribution is mocked with a realistic bell-curve shape
 * centered around the current tick.
 */
export function usePoolTicks(
  token0?: Address,
  token1?: Address,
  token0Decimals: number = 18,
  token1Decimals: number = 18,
): UsePoolTicksReturn {
  const pool = usePool(token0, token1);

  const { currentTick, currentPrice, tickSpacing } = useMemo(() => {
    if (!pool.slot0) {
      // Fallback: use tick 0 so mock ticks still render
      const fallbackTick = 0;
      const fallbackPrice = tickToPrice(fallbackTick, token0Decimals, token1Decimals);
      return { currentTick: fallbackTick, currentPrice: fallbackPrice, tickSpacing: 60 };
    }
    // slot0 returns [sqrtPriceX96, tick, ...]
    const slot0Array = pool.slot0 as readonly [bigint, number, ...unknown[]];
    const sqrtPriceX96 = slot0Array[0];
    const tick = Number(slot0Array[1]);
    const price = sqrtPriceX96ToPrice(sqrtPriceX96, token0Decimals, token1Decimals);
    const spacing = pool.tickSpacing ? Number(pool.tickSpacing) : 60;
    return { currentTick: tick, currentPrice: price, tickSpacing: spacing };
  }, [pool.slot0, pool.tickSpacing, token0Decimals, token1Decimals]);

  // Use token addresses as seed for unique per-pool distribution
  const pairSeed = useMemo(() => {
    if (!token0 || !token1) return 0;
    let h = 0;
    const s = (token0 + token1).toLowerCase();
    for (let i = 0; i < s.length; i++) {
      h = ((h << 5) - h + s.charCodeAt(i)) | 0;
    }
    return Math.abs(h);
  }, [token0, token1]);

  const ticks = useMemo(() => {
    return generateMockTicks(currentTick, tickSpacing, token0Decimals, token1Decimals, pairSeed);
  }, [currentTick, tickSpacing, token0Decimals, token1Decimals, pairSeed]);

  return {
    ticks,
    currentPrice,
    currentTick,
    tickSpacing,
    isLoading: false, // ticks are always mock-generated, never truly "loading"
  };
}

/**
 * Generate mock tick liquidity data with a realistic distribution.
 * Creates a bell curve centered on currentTick with some random variation
 * to mimic real liquidity distribution patterns.
 */
/**
 * Distribution shape profiles for variety across pools.
 * Each profile defines how liquidity is distributed around the current tick.
 */
type DistProfile = {
  shape: "bell" | "bimodal" | "skewLeft" | "skewRight" | "flat";
  peakLiquidity: number;
  noiseRange: [number, number]; // [min, max] multiplier
};

const DIST_PROFILES: DistProfile[] = [
  { shape: "bell", peakLiquidity: 50000, noiseRange: [0.6, 1.0] },
  { shape: "bimodal", peakLiquidity: 40000, noiseRange: [0.5, 1.0] },
  { shape: "skewLeft", peakLiquidity: 45000, noiseRange: [0.7, 1.0] },
  { shape: "skewRight", peakLiquidity: 55000, noiseRange: [0.5, 0.9] },
  { shape: "flat", peakLiquidity: 30000, noiseRange: [0.4, 1.0] },
];

function shapeValue(shape: DistProfile["shape"], i: number, range: number): number {
  const d = i / range; // -1 to +1
  const abs = Math.abs(d);
  switch (shape) {
    case "bell":
      return Math.exp(-4 * abs * abs);
    case "bimodal": {
      const left = Math.exp(-12 * (d + 0.4) * (d + 0.4));
      const right = Math.exp(-12 * (d - 0.4) * (d - 0.4));
      return Math.max(left, right);
    }
    case "skewLeft":
      return Math.exp(-3 * (d + 0.2) * (d + 0.2));
    case "skewRight":
      return Math.exp(-3 * (d - 0.2) * (d - 0.2));
    case "flat":
      return 0.5 + 0.5 * Math.exp(-1.5 * abs * abs);
  }
}

function generateMockTicks(
  currentTick: number,
  tickSpacing: number,
  decimals0: number,
  decimals1: number,
  pairSeed: number,
): TickDisplayData[] {
  const baseTick = alignTickToSpacing(currentTick, tickSpacing, true);
  const range = 40; // ticks on each side
  const ticks: TickDisplayData[] = [];

  // Pick distribution profile based on pair seed
  const profile = DIST_PROFILES[pairSeed % DIST_PROFILES.length];

  // Seeded pseudo-random for consistency across renders
  let rng = (pairSeed || 1) + 1;
  const random = () => {
    rng = (rng * 16807 + 0) % 2147483647;
    return rng / 2147483647;
  };

  for (let i = -range; i < range; i++) {
    const tick = baseTick + i * tickSpacing;
    const tickNext = tick + tickSpacing;

    const curve = shapeValue(profile.shape, i, range);
    const [noiseMin, noiseMax] = profile.noiseRange;
    const noise = noiseMin + random() * (noiseMax - noiseMin);
    const liquidityUsd = profile.peakLiquidity * curve * noise;

    ticks.push({
      priceLower: tickToPrice(tick, decimals0, decimals1),
      priceUpper: tickToPrice(tickNext, decimals0, decimals1),
      liquidityUsd: Math.max(100, liquidityUsd),
      liquidityRaw: Math.floor(liquidityUsd * 1e18).toString(),
      isCurrentTick: currentTick >= tick && currentTick < tickNext,
    });
  }

  return ticks;
}
