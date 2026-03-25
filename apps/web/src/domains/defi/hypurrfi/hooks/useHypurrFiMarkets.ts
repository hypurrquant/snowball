"use client";

import { useReadContracts, useChainId } from "wagmi";
import { AavePoolABI, AaveOracleABI } from "@/core/abis";
import { rayRateToAPY } from "../../aave/lib/aaveMath";
import type { AaveMarket } from "../../aave/types";
import type { Address } from "viem";
import { HYPURRFI, HYPEREVM_CHAIN_ID, HYPEREVM_TOKENS } from "@/core/config/hyperevm";

const HYPURRFI_MARKETS: {
  symbol: string;
  underlying: Address;
  decimals: number;
}[] = [
  { symbol: "wHYPE", underlying: HYPEREVM_TOKENS.WHYPE, decimals: 18 },
  { symbol: "USDT0", underlying: HYPEREVM_TOKENS.USDT0, decimals: 6 },
  { symbol: "USDC", underlying: HYPEREVM_TOKENS.USDC, decimals: 6 },
  { symbol: "USDe", underlying: HYPEREVM_TOKENS.USDe, decimals: 18 },
  { symbol: "UBTC", underlying: HYPEREVM_TOKENS.UBTC, decimals: 8 },
  { symbol: "UETH", underlying: HYPEREVM_TOKENS.UETH, decimals: 18 },
  { symbol: "kHYPE", underlying: HYPEREVM_TOKENS.kHYPE, decimals: 18 },
  { symbol: "wstHYPE", underlying: HYPEREVM_TOKENS.wstHYPE, decimals: 18 },
];

export function useHypurrFiMarkets() {
  const chainId = useChainId();
  const isHyperEVM = chainId === HYPEREVM_CHAIN_ID;

  const contracts = HYPURRFI_MARKETS.flatMap((m) => [
    {
      address: HYPURRFI.pool,
      abi: AavePoolABI,
      functionName: "getReserveData" as const,
      args: [m.underlying] as [Address],
    },
    {
      address: HYPURRFI.oracle,
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
    for (let i = 0; i < HYPURRFI_MARKETS.length; i++) {
      const market = HYPURRFI_MARKETS[i];
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

  return { markets, isLoading, isHyperEVM, refetch };
}
