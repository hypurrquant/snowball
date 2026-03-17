"use client";

import { useReadContract } from "wagmi";
import { STAKER } from "@snowball/core/src/config/addresses";
import { SnowballStakerABI } from "@/core/abis";
import type { IncentiveKey, StakerRewardInfo } from "../types";
import type { Address } from "viem";

const ZERO_ADDR = "0x0000000000000000000000000000000000000000";

/**
 * Read pending reward info for a staked position in a specific incentive.
 * Returns the earned reward amount and secondsInsideX128.
 */
export function useStakerRewardInfo(
  incentiveKey: IncentiveKey | undefined,
  tokenId: bigint | undefined,
) {
  const keyTuple = incentiveKey
    ? {
        rewardToken: incentiveKey.rewardToken,
        pool: incentiveKey.pool,
        startTime: incentiveKey.startTime,
        endTime: incentiveKey.endTime,
        refundee: incentiveKey.refundee,
      }
    : undefined;

  const { data, isLoading, refetch } = useReadContract({
    address: STAKER.snowballStaker,
    abi: SnowballStakerABI,
    functionName: "getRewardInfo",
    args: [keyTuple!, tokenId!],
    query: {
      enabled:
        !!incentiveKey &&
        tokenId !== undefined &&
        STAKER.snowballStaker !== ZERO_ADDR,
      refetchInterval: 10_000,
    },
  });

  let rewardInfo: StakerRewardInfo | null = null;

  if (data) {
    const [reward, secondsInsideX128] = data as [bigint, bigint];
    rewardInfo = { reward, secondsInsideX128 };
  }

  return { rewardInfo, isLoading, refetch };
}

/**
 * Read total accrued (unclaimed) rewards for a specific reward token + owner.
 * This is the accumulated amount from all unstake operations, claimable via claimReward.
 */
export function useStakerAccruedRewards(
  rewardToken: Address | undefined,
  owner: Address | undefined,
) {
  const { data, isLoading, refetch } = useReadContract({
    address: STAKER.snowballStaker,
    abi: SnowballStakerABI,
    functionName: "rewards",
    args: [rewardToken!, owner!],
    query: {
      enabled:
        !!rewardToken &&
        !!owner &&
        STAKER.snowballStaker !== ZERO_ADDR,
      refetchInterval: 10_000,
    },
  });

  const accruedRewards = data !== undefined ? (data as bigint) : null;

  return { accruedRewards, isLoading, refetch };
}
