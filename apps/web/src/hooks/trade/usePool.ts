"use client";

import { useReadContract, useReadContracts } from "wagmi";
import { UniswapV3FactoryABI, UniswapV3PoolABI } from "@/abis";
import { DEX } from "@/config/addresses";
import { sortTokens } from "@/lib/utils";
import type { Address } from "viem";

export function usePool(tokenA?: Address, tokenB?: Address, fee: number = 3000) {
  const [token0, token1] =
    tokenA && tokenB ? sortTokens(tokenA, tokenB) : [undefined, undefined];

  // Get pool address
  const { data: poolAddress, isLoading: isPoolLoading } = useReadContract({
    address: DEX.factory,
    abi: UniswapV3FactoryABI,
    functionName: "getPool",
    args: [token0!, token1!, fee],
    query: { enabled: !!token0 && !!token1 },
  });

  const poolExists =
    !!poolAddress && poolAddress !== "0x0000000000000000000000000000000000000000";

  // Batch: slot0 + liquidity + fee
  const { data: poolData, isLoading: isDataLoading } = useReadContracts({
    contracts: [
      {
        address: poolAddress!,
        abi: UniswapV3PoolABI,
        functionName: "slot0",
      },
      {
        address: poolAddress!,
        abi: UniswapV3PoolABI,
        functionName: "liquidity",
      },
      {
        address: poolAddress!,
        abi: UniswapV3PoolABI,
        functionName: "fee",
      },
    ],
    query: {
      enabled: poolExists,
      refetchInterval: 10_000,
    },
  });

  const slot0 =
    poolData?.[0]?.status === "success" ? poolData[0].result : undefined;
  const liquidity =
    poolData?.[1]?.status === "success" ? poolData[1].result : undefined;
  const poolFee =
    poolData?.[2]?.status === "success" ? poolData[2].result : undefined;

  return {
    poolAddress: poolExists ? poolAddress : undefined,
    token0,
    token1,
    slot0,
    liquidity,
    fee: poolFee,
    isLoading: isPoolLoading || isDataLoading,
  };
}
