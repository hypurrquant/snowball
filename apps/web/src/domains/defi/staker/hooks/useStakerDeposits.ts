"use client";

import { useReadContracts } from "wagmi";
import { STAKER } from "@snowball/core/src/config/addresses";
import { SnowballStakerABI } from "@/core/abis";
import type { StakerDeposit } from "../types";
import type { Address } from "viem";

const ZERO_ADDR = "0x0000000000000000000000000000000000000000";

/**
 * Read deposit info for multiple LP NFT tokenIds from the staker.
 * Returns owner, numberOfStakes, tickLower, tickUpper for each.
 */
export function useStakerDeposits(tokenIds: bigint[]) {
  const contracts = tokenIds.map((tokenId) => ({
    address: STAKER.snowballStaker,
    abi: SnowballStakerABI,
    functionName: "deposits" as const,
    args: [tokenId] as const,
  }));

  const { data, isLoading, refetch } = useReadContracts({
    contracts,
    query: {
      enabled: tokenIds.length > 0 && STAKER.snowballStaker !== ZERO_ADDR,
      refetchInterval: 10_000,
    },
  });

  const deposits: StakerDeposit[] = [];

  if (data) {
    for (let i = 0; i < data.length; i++) {
      const result = data[i];
      if (result?.result) {
        const [owner, numberOfStakes, tickLower, tickUpper] = result.result as [
          Address,
          number,
          number,
          number,
        ];
        deposits.push({
          tokenId: tokenIds[i],
          owner,
          numberOfStakes: Number(numberOfStakes),
          tickLower,
          tickUpper,
        });
      }
    }
  }

  return { deposits, isLoading, refetch };
}
