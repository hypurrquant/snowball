"use client";

import { useReadContract, useReadContracts } from "wagmi";
import { SnowballFactoryABI, SnowballPoolABI, DynamicFeePluginABI } from "@/abis";
import { DEX } from "@/config/addresses";
import { sortTokens } from "@/lib/utils";
import type { Address } from "viem";

export function usePool(tokenA?: Address, tokenB?: Address) {
  const [token0, token1] =
    tokenA && tokenB ? sortTokens(tokenA, tokenB) : [undefined, undefined];

  // Get pool address
  const { data: poolAddress, isLoading: isPoolLoading } = useReadContract({
    address: DEX.snowballFactory,
    abi: SnowballFactoryABI,
    functionName: "poolByPair",
    args: [token0!, token1!],
    query: { enabled: !!token0 && !!token1 },
  });

  const poolExists =
    !!poolAddress && poolAddress !== "0x0000000000000000000000000000000000000000";

  // Batch: globalState + liquidity + dynamic fee
  const { data: poolData, isLoading: isDataLoading } = useReadContracts({
    contracts: [
      {
        address: poolAddress!,
        abi: SnowballPoolABI,
        functionName: "globalState",
      },
      {
        address: poolAddress!,
        abi: SnowballPoolABI,
        functionName: "liquidity",
      },
      {
        address: DEX.dynamicFeePlugin,
        abi: DynamicFeePluginABI,
        functionName: "getFee",
        args: [poolAddress!],
      },
    ],
    query: {
      enabled: poolExists,
      refetchInterval: 10_000,
    },
  });

  const globalState =
    poolData?.[0]?.status === "success" ? poolData[0].result : undefined;
  const liquidity =
    poolData?.[1]?.status === "success" ? poolData[1].result : undefined;
  const dynamicFee =
    poolData?.[2]?.status === "success" ? poolData[2].result : undefined;

  return {
    poolAddress: poolExists ? poolAddress : undefined,
    token0,
    token1,
    globalState,
    liquidity,
    dynamicFee,
    isLoading: isPoolLoading || isDataLoading,
  };
}
