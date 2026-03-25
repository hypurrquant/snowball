"use client";

import { useReadContracts, useChainId } from "wagmi";
import { AavePoolABI, AaveOracleABI } from "@/core/abis";
import { rayRateToAPY } from "../../aave/lib/aaveMath";
import type { AaveMarket } from "../../aave/types";
import type { Address } from "viem";
import { NEVERLAND, MONAD_TESTNET_CHAIN_ID, MONAD_TOKENS } from "@/core/config/monad";

const NEVERLAND_MARKETS: {
  symbol: string;
  underlying: Address;
  decimals: number;
}[] = [
  { symbol: "WMON", underlying: MONAD_TOKENS.WMON, decimals: 18 },
  { symbol: "USDC", underlying: MONAD_TOKENS.USDC, decimals: 6 },
  { symbol: "WETH", underlying: MONAD_TOKENS.WETH, decimals: 18 },
  { symbol: "WBTC", underlying: MONAD_TOKENS.WBTC, decimals: 8 },
  { symbol: "USDT0", underlying: MONAD_TOKENS.USDT0, decimals: 6 },
];

export function useNeverlandMarkets() {
  const chainId = useChainId();
  const isMonad = chainId === MONAD_TESTNET_CHAIN_ID;

  const contracts = NEVERLAND_MARKETS.flatMap((m) => [
    {
      address: NEVERLAND.pool,
      abi: AavePoolABI,
      functionName: "getReserveData" as const,
      args: [m.underlying] as [Address],
    },
    {
      address: NEVERLAND.oracle,
      abi: AaveOracleABI,
      functionName: "getAssetPrice" as const,
      args: [m.underlying] as [Address],
    },
  ]);

  const { data, isLoading, refetch } = useReadContracts({
    contracts,
    query: {
      refetchInterval: 15_000,
      enabled: isMonad,
    },
  });

  const markets: AaveMarket[] = [];

  if (data) {
    for (let i = 0; i < NEVERLAND_MARKETS.length; i++) {
      const market = NEVERLAND_MARKETS[i];
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
        aTokenAddress: reserveData.aTokenAddress,
        variableDebtTokenAddress: reserveData.variableDebtTokenAddress,
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

  return { markets, isLoading, isMonad, refetch };
}
