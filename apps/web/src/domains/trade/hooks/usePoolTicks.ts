"use client";

import { useMemo } from "react";
import { useReadContracts } from "wagmi";
import { usePool } from "./usePool";
import { sqrtPriceX96ToPrice, tickToPrice, alignTickToSpacing } from "@/core/dex/calculators";
import type { TickDisplayData } from "@/core/dex/types";
import type { Address } from "viem";
import {
  TICK_BITMAP_ABI,
  TICKS_ABI,
  TICK_RANGE,
  computeWordPositions,
  extractInitializedTicks,
  buildEmptyTicks,
} from "../lib/tickUtils";

// --- Hook ---

interface UsePoolTicksReturn {
  ticks: TickDisplayData[];
  currentPrice: number;
  currentTick: number;
  tickSpacing: number;
  isLoading: boolean;
}

export function usePoolTicks(
  token0?: Address,
  token1?: Address,
  token0Decimals: number = 18,
  token1Decimals: number = 18,
): UsePoolTicksReturn {
  const pool = usePool(token0, token1);

  const { currentTick, currentPrice, tickSpacing } = useMemo(() => {
    if (!pool.slot0) {
      const fallbackTick = 0;
      const fallbackPrice = tickToPrice(fallbackTick, token0Decimals, token1Decimals);
      return { currentTick: fallbackTick, currentPrice: fallbackPrice, tickSpacing: 60 };
    }
    const slot0Array = pool.slot0 as readonly [bigint, number, ...unknown[]];
    const sqrtPriceX96 = slot0Array[0];
    const tick = Number(slot0Array[1]);
    const price = sqrtPriceX96ToPrice(sqrtPriceX96, token0Decimals, token1Decimals);
    const spacing = pool.tickSpacing ? Number(pool.tickSpacing) : 60;
    return { currentTick: tick, currentPrice: price, tickSpacing: spacing };
  }, [pool.slot0, pool.tickSpacing, token0Decimals, token1Decimals]);

  // Phase 1: Compute word positions and build bitmap multicall
  const { wordPositions, minTick, maxTick } = useMemo(() => {
    const baseTick = alignTickToSpacing(currentTick, tickSpacing, true);
    const min = baseTick - TICK_RANGE * tickSpacing;
    const max = baseTick + TICK_RANGE * tickSpacing;
    const words = computeWordPositions(min, max, tickSpacing);
    return { wordPositions: words, minTick: min, maxTick: max };
  }, [currentTick, tickSpacing]);

  const bitmapContracts = useMemo(() => {
    if (!pool.poolAddress) return [];
    return wordPositions.map((wordPos) => ({
      address: pool.poolAddress!,
      abi: TICK_BITMAP_ABI,
      functionName: "tickBitmap" as const,
      args: [wordPos] as const,
    }));
  }, [pool.poolAddress, wordPositions]);

  const { data: bitmapResults, isLoading: isBitmapLoading } = useReadContracts({
    contracts: bitmapContracts,
    query: { enabled: bitmapContracts.length > 0, refetchInterval: 30_000 },
  });

  // Extract initialized tick indices from bitmaps
  const initializedTickIndices = useMemo(() => {
    if (!bitmapResults) return [];
    const indices: number[] = [];
    for (let i = 0; i < wordPositions.length; i++) {
      const result = bitmapResults[i];
      if (result?.status !== "success") continue;
      const bitmap = result.result as bigint;
      const ticks = extractInitializedTicks(bitmap, wordPositions[i], tickSpacing, minTick, maxTick);
      indices.push(...ticks);
    }
    return indices.sort((a, b) => a - b);
  }, [bitmapResults, wordPositions, tickSpacing, minTick, maxTick]);

  // Phase 2: Fetch liquidityNet for each initialized tick
  const tickContracts = useMemo(() => {
    if (!pool.poolAddress || initializedTickIndices.length === 0) return [];
    return initializedTickIndices.map((tickIdx) => ({
      address: pool.poolAddress!,
      abi: TICKS_ABI,
      functionName: "ticks" as const,
      args: [tickIdx] as const,
    }));
  }, [pool.poolAddress, initializedTickIndices]);

  const { data: tickResults, isLoading: isTickLoading } = useReadContracts({
    contracts: tickContracts,
    query: { enabled: tickContracts.length > 0, refetchInterval: 30_000 },
  });

  // Build TickDisplayData[] from on-chain tick data
  const ticks = useMemo(() => {
    if (!tickResults || initializedTickIndices.length === 0) {
      return buildEmptyTicks(currentTick, tickSpacing, token0Decimals, token1Decimals);
    }

    // Collect initialized ticks with liquidityNet
    const tickMap = new Map<number, bigint>();
    for (let i = 0; i < initializedTickIndices.length; i++) {
      const res = tickResults[i];
      if (res?.status !== "success") continue;
      const resultArray = res.result as readonly [bigint, bigint, ...unknown[]];
      const liquidityNet = resultArray[1];
      tickMap.set(initializedTickIndices[i], liquidityNet);
    }

    // Reconstruct liquidity distribution by walking through ticks
    const baseTick = alignTickToSpacing(currentTick, tickSpacing, true);
    const displayTicks: TickDisplayData[] = [];
    let cumulativeLiquidity = 0n;

    // Find starting liquidity by summing liquidityNet below minTick
    // (simplified: assume 0 at the range boundary)
    const allSortedTicks = Array.from(tickMap.keys()).sort((a, b) => a - b);

    // Walk from minTick to maxTick, accumulating liquidity
    for (let t = minTick; t < maxTick; t += tickSpacing) {
      if (tickMap.has(t)) {
        cumulativeLiquidity += tickMap.get(t)!;
      }

      const tickNext = t + tickSpacing;
      const absLiq = cumulativeLiquidity < 0n ? -cumulativeLiquidity : cumulativeLiquidity;

      displayTicks.push({
        priceLower: tickToPrice(t, token0Decimals, token1Decimals),
        priceUpper: tickToPrice(tickNext, token0Decimals, token1Decimals),
        liquidityUsd: Number(absLiq) / 1e18,
        liquidityRaw: absLiq.toString(),
        isCurrentTick: currentTick >= t && currentTick < tickNext,
      });
    }

    return displayTicks;
  }, [tickResults, initializedTickIndices, currentTick, tickSpacing, token0Decimals, token1Decimals, minTick, maxTick]);

  return {
    ticks,
    currentPrice,
    currentTick,
    tickSpacing,
    isLoading: pool.isLoading || isBitmapLoading || isTickLoading,
  };
}
