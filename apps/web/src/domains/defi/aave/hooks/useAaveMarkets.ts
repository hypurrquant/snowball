"use client";

import { useReadContracts } from "wagmi";
import { AAVE } from "@snowball/core/src/config/addresses";
import { AavePoolABI, AaveDataProviderABI, AaveOracleABI } from "@/core/abis";
import { rayRateToAPY } from "../lib/aaveMath";
import type { AaveMarket } from "../types";

export function useAaveMarkets() {
  const markets = AAVE.markets;

  const contracts = markets.flatMap((m) => [
    {
      address: AAVE.pool,
      abi: AavePoolABI,
      functionName: "getReserveData" as const,
      args: [m.underlying],
    },
    {
      address: AAVE.dataProvider,
      abi: AaveDataProviderABI,
      functionName: "getReserveConfigurationData" as const,
      args: [m.underlying],
    },
    {
      address: AAVE.oracle,
      abi: AaveOracleABI,
      functionName: "getAssetPrice" as const,
      args: [m.underlying],
    },
  ]);

  const { data, isLoading, refetch } = useReadContracts({
    contracts,
    query: { refetchInterval: 15_000, enabled: AAVE.pool !== "0x0000000000000000000000000000000000000000" },
  });

  const result: AaveMarket[] = [];

  if (data) {
    for (let i = 0; i < markets.length; i++) {
      const reserveData = data[i * 3]?.result as any;
      const configData = data[i * 3 + 1]?.result as any;
      const priceData = data[i * 3 + 2]?.result as any;

      if (!reserveData || !configData) continue;

      result.push({
        symbol: markets[i].symbol,
        underlying: markets[i].underlying,
        decimals: markets[i].decimals,
        aTokenAddress: reserveData.aTokenAddress,
        variableDebtTokenAddress: reserveData.variableDebtTokenAddress,
        totalSupply: 0n, // computed from aToken totalSupply
        totalBorrow: 0n, // computed from debtToken totalSupply
        supplyAPY: rayRateToAPY(reserveData.currentLiquidityRate ?? 0n),
        borrowAPY: rayRateToAPY(reserveData.currentVariableBorrowRate ?? 0n),
        ltv: Number(configData.ltv ?? 0n) / 100,
        liquidationThreshold: Number(configData.liquidationThreshold ?? 0n) / 100,
        isActive: configData.isActive ?? false,
        isFrozen: configData.isFrozen ?? false,
        price: priceData ?? 0n,
      });
    }
  }

  return { markets: result, isLoading, refetch };
}
