"use client";

import { useReadContract } from "wagmi";
import { SnowballLendABI } from "@/core/abis";
import { LEND } from "@/core/config/addresses";
import { toAssetsDown, calculateHealthFactor, calculateLiquidationPrice } from "../lib/morphoMath";
import type { MorphoPosition } from "../types";
import type { Address } from "viem";

export function useMorphoPosition(
  marketId: `0x${string}`,
  user?: Address,
) {
  const { data: marketData } = useReadContract({
    address: LEND.snowballLend,
    abi: SnowballLendABI,
    functionName: "market",
    args: [marketId],
    query: { refetchInterval: 10_000 },
  });

  const { data: positionData, isLoading, refetch } = useReadContract({
    address: LEND.snowballLend,
    abi: SnowballLendABI,
    functionName: "position",
    args: [marketId, user!],
    query: { enabled: !!user, refetchInterval: 10_000 },
  });

  let position: MorphoPosition | null = null;

  if (positionData && marketData) {
    const [supplyShares, borrowShares, collateral] = positionData as [bigint, bigint, bigint];
    const [totalSupplyAssets, totalSupplyShares, totalBorrowAssets, totalBorrowShares] =
      marketData as [bigint, bigint, bigint, bigint, bigint, bigint];

    const supplyAssets = toAssetsDown(supplyShares, totalSupplyAssets, totalSupplyShares);
    const borrowAssets = toAssetsDown(borrowShares, totalBorrowAssets, totalBorrowShares);

    // Find the market config to get lltv + oracle price
    const marketConfig = LEND.markets.find((m) => m.id === marketId);
    const lltv = marketConfig?.lltv ?? 0n;

    // Approximate collateral value = collateral (assuming 1:1 for simplicity in non-oracle cases)
    const healthFactor = calculateHealthFactor(collateral, borrowAssets, lltv);
    const liquidationPrice = calculateLiquidationPrice(collateral, borrowAssets, lltv);

    position = {
      supplyShares,
      borrowShares,
      collateral,
      supplyAssets,
      borrowAssets,
      healthFactor,
      liquidationPrice,
    };
  }

  return { position, isLoading, refetch };
}
