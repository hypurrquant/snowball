"use client";

import { useReadContracts, useChainId } from "wagmi";
import { AavePoolABI, AaveOracleABI } from "@/core/abis";
import { rayRateToAPY } from "../../aave/lib/aaveMath";
import type { AaveMarket } from "../../aave/types";
import type { Address } from "viem";

// HyperLend addresses (Aave V3 fork on HyperEVM chainId 999)
const HYPERLEND_POOL = "0x00A89d7a5A02160f20150EbEA7a2b5E4879A1A8b" as const;
const HYPERLEND_ORACLE = "0xC9Fb4fbE842d57EAc1dF3e641a281827493A630e" as const;
const HYPEREVM_CHAIN_ID = 999;

interface HyperLendMarketConfig {
  symbol: string;
  underlying: Address;
  decimals: number;
  hToken: Address;
  debtToken: Address;
}

const HYPERLEND_MARKETS: HyperLendMarketConfig[] = [
  {
    symbol: "wHYPE",
    underlying: "0x5555555555555555555555555555555555555555",
    decimals: 18,
    hToken: "0x0D745EAA9E70bb8B6e2a0317f85F1d536616bD34",
    debtToken: "0x747d0d4Ba0a2083651513cd008deb95075683e82",
  },
  {
    symbol: "USDT0",
    underlying: "0xB8CE59FC3717ada4C02eaDF9682A9e934F625ebb",
    decimals: 6,
    hToken: "0x10982ad645D5A112606534d8567418Cf64c14cB5",
    debtToken: "0x1EF897622D62335e7FC88Fb0605FbBa28eC0b01d",
  },
  {
    symbol: "USDC",
    underlying: "0x6d3cC56DFC016151eE2613BdDe0e03Af9ba885CC",
    decimals: 6,
    hToken: "0x744E4f26ee30213989216E1632D9BE3547C4885b",
    debtToken: "0xD612513cB3b2C52abCD6d4b338374C09AdA4657d",
  },
  {
    symbol: "USDe",
    underlying: "0x5d3a1Ff2b6BAb83b63cd9AD0787074081a52ef34",
    decimals: 18,
    hToken: "0x333819c04975554260AaC119948562a0E24C2bd6",
    debtToken: "0x1EFA0f7A12cEF73e23dE30b7013a252231Ea50f9",
  },
  {
    symbol: "UBTC",
    underlying: "0x9fdbda0A5B8f74D32b9F2B2e81E1F5a8A3F3b6E1",
    decimals: 8,
    hToken: "0xd2012c6DfF7634f9513A56a1871b93e4505EA851",
    debtToken: "0xE16a14972bcDE3f9Bd637502C86384533F27DA07",
  },
];

export function useHyperLendMarkets() {
  const chainId = useChainId();
  const isHyperEVM = chainId === HYPEREVM_CHAIN_ID;

  const contracts = HYPERLEND_MARKETS.flatMap((m) => [
    {
      address: HYPERLEND_POOL,
      abi: AavePoolABI,
      functionName: "getReserveData" as const,
      args: [m.underlying] as [Address],
    },
    {
      address: HYPERLEND_ORACLE,
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
    for (let i = 0; i < HYPERLEND_MARKETS.length; i++) {
      const market = HYPERLEND_MARKETS[i];
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
