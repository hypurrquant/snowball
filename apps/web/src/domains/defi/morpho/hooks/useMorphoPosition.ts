"use client";

import { useReadContract } from "wagmi";
import { SnowballLendABI } from "@/core/abis";
import { LEND } from "@/core/config/addresses";
import { toAssetsDown, calculateHealthFactor, calculateLiquidationPrice } from "../lib/morphoMath";
import { ORACLE_SCALE } from "../lib/constants";
import type { MorphoPosition } from "../types";
import type { Address } from "viem";

export function useMorphoPosition(
  marketId: `0x${string}`,
  user?: Address,
  oraclePrice?: bigint,
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

    const marketConfig = LEND.markets.find((m) => m.id === marketId);
    const lltv = marketConfig?.lltv ?? 0n;

    // Convert collateral amount to value using oracle price (18 decimals, MockOracle)
    const collateralValue = oraclePrice && oraclePrice > 0n
      ? (collateral * oraclePrice) / ORACLE_SCALE
      : collateral;
    const healthFactor = calculateHealthFactor(collateralValue, borrowAssets, lltv);
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
