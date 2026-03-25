"use client";

import { useReadContracts, useChainId } from "wagmi";
import { AavePoolABI, AaveOracleABI } from "@/core/abis";
import { rayRateToAPY } from "../../aave/lib/aaveMath";
import type { AaveMarket } from "../../aave/types";
import type { Address } from "viem";
import { HYPERLEND, HYPEREVM_CHAIN_ID } from "@/core/config/hyperevm";

export function useHyperLendMarkets() {
  const chainId = useChainId();
  const isHyperEVM = chainId === HYPEREVM_CHAIN_ID;

  const contracts = HYPERLEND.markets.flatMap((m) => [
    {
      address: HYPERLEND.pool,
      abi: AavePoolABI,
      functionName: "getReserveData" as const,
      args: [m.underlying] as [Address],
    },
    {
      address: HYPERLEND.oracle,
      abi: AaveOracleABI,
      functionName: "getAssetPrice" as const,
      args: [m.underlying] as [Address],
    },
  ]);

  const { data, isLoading, refetch } = useReadContracts({
    contracts,
    query: {
      refetchInterval: 15_000,
      enabled: isHyperEVM,
    },
  });

  const markets: AaveMarket[] = [];

  if (data) {
    for (let i = 0; i < HYPERLEND.markets.length; i++) {
      const market = HYPERLEND.markets[i];
      const reserveData = data[i * 2]?.result as
        | {
            currentLiquidityRate: bigint;
            currentVariableBorrowRate: bigint;
            aTokenAddress: Address;
            variableDebtTokenAddress: Address;
          }
        | undefined;
      const priceData = data[i * 2 + 1]?.result as bigint | undefined;

      if (!reserveData) continue;

      markets.push({
        symbol: market.symbol,
        underlying: market.underlying,
        decimals: market.decimals,
        aTokenAddress: reserveData.aTokenAddress ?? market.hToken,
        variableDebtTokenAddress:
          reserveData.variableDebtTokenAddress ?? market.debtToken,
        totalSupply: 0n,
        totalBorrow: 0n,
        supplyAPY: rayRateToAPY(reserveData.currentLiquidityRate ?? 0n),
        borrowAPY: rayRateToAPY(reserveData.currentVariableBorrowRate ?? 0n),
        ltv: 0,
        liquidationThreshold: 0,
        isActive: true,
        isFrozen: false,
        price: priceData ?? 0n,
      });
    }
  }

  return { markets, isLoading, isHyperEVM, refetch };
}
