"use client";

import { useReadContract } from "wagmi";
import { useAccount } from "wagmi";
import { AAVE } from "@snowball/core/src/config/addresses";
import { AavePoolABI } from "@/core/abis";
import { parseHealthFactor } from "../lib/aaveMath";
import type { AaveUserPosition } from "../types";

export function useAavePosition() {
  const { address } = useAccount();

  const { data, isLoading, refetch } = useReadContract({
    address: AAVE.pool,
    abi: AavePoolABI,
    functionName: "getUserAccountData",
    args: [address!],
    query: {
      enabled: !!address && AAVE.pool !== "0x0000000000000000000000000000000000000000",
      refetchInterval: 10_000,
    },
  });

  let position: AaveUserPosition | null = null;

  if (data) {
    const [totalCollateralBase, totalDebtBase, availableBorrowsBase, currentLiquidationThreshold, ltv, healthFactor] = data as [bigint, bigint, bigint, bigint, bigint, bigint];
    position = {
      totalCollateralBase,
      totalDebtBase,
      availableBorrowsBase,
      currentLiquidationThreshold: Number(currentLiquidationThreshold) / 100,
      ltv: Number(ltv) / 100,
      healthFactor: parseHealthFactor(healthFactor),
    };
  }

  return { position, isLoading, refetch };
}
