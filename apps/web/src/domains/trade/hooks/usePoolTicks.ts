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
      return { currentTick: 0, currentPrice: 0, tickSpacing: 60 };
    }
    // slot0 returns [sqrtPriceX96, tick, ...]
    const slot0Array = pool.slot0 as readonly [bigint, number, ...unknown[]];
    const sqrtPriceX96 = slot0Array[0];
    const tick = Number(slot0Array[1]);
    const price = sqrtPriceX96ToPrice(sqrtPriceX96, token0Decimals, token1Decimals);
    const spacing = pool.tickSpacing ? Number(pool.tickSpacing) : 60;
    return { currentTick: tick, currentPrice: price, tickSpacing: spacing };
  }, [pool.slot0, pool.tickSpacing, token0Decimals, token1Decimals]);

  const ticks = useMemo(() => {
    if (!currentPrice || currentTick === 0) return [];
    return generateMockTicks(currentTick, tickSpacing, token0Decimals, token1Decimals);
  }, [currentTick, tickSpacing, token0Decimals, token1Decimals, currentPrice]);

  return {
    ticks,
    currentPrice,
    currentTick,
    tickSpacing,
    isLoading: pool.isLoading,
  };
}

/**
 * Generate mock tick liquidity data with a realistic distribution.
 * Creates a bell curve centered on currentTick with some random variation
 * to mimic real liquidity distribution patterns.
 */
function generateMockTicks(
  currentTick: number,
  tickSpacing: number,
  decimals0: number,
  decimals1: number,
): TickDisplayData[] {
  const baseTick = alignTickToSpacing(currentTick, tickSpacing, true);
  const range = 40; // ticks on each side
  const ticks: TickDisplayData[] = [];

  // Seeded pseudo-random for consistency across renders
  const seed = Math.abs(currentTick) % 1000;
  let rng = seed + 1;
  const random = () => {
    rng = (rng * 16807 + 0) % 2147483647;
    return rng / 2147483647;
  };

  const peakLiquidity = 50000; // USD

  for (let i = -range; i < range; i++) {
    const tick = baseTick + i * tickSpacing;
    const tickNext = tick + tickSpacing;

    // Bell curve: liquidity peaks at current tick, decays with distance
    const distance = Math.abs(i) / range;
    const bellCurve = Math.exp(-4 * distance * distance);
    // Add randomness (20-40% variation)
    const noise = 0.6 + random() * 0.4;
    const liquidityUsd = peakLiquidity * bellCurve * noise;

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
