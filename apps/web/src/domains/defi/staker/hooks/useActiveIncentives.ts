"use client";

import { useEffect, useState, useCallback } from "react";
import { usePublicClient } from "wagmi";
import { encodeAbiParameters, parseAbiParameters, keccak256 } from "viem";
import { STAKER } from "@snowball/core/src/config/addresses";
import { SnowballStakerABI } from "@/core/abis";
import type { StakerIncentive } from "../types";

const ZERO_ADDR = "0x0000000000000000000000000000000000000000";

const INCENTIVE_KEY_TYPE = parseAbiParameters(
  "(address rewardToken, address pool, uint256 startTime, uint256 endTime, address refundee)",
);

const REFETCH_INTERVAL_MS = 30_000;

// Staker deployment block on Creditcoin Testnet — skip scanning earlier blocks
const STAKER_DEPLOY_BLOCK = 4_436_000n;

/**
 * Fetches active incentives from on-chain IncentiveCreated event logs.
 * For each event, reads current incentive state and filters to active ones
 * (endTime > now AND totalRewardUnclaimed > 0).
 */
export function useActiveIncentives() {
  const publicClient = usePublicClient();
  const [incentives, setIncentives] = useState<StakerIncentive[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchIncentives = useCallback(async () => {
    if (!publicClient || STAKER.snowballStaker === ZERO_ADDR) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);

      const logs = await publicClient.getLogs({
        address: STAKER.snowballStaker as `0x${string}`,
        event: {
          type: "event",
          name: "IncentiveCreated",
          inputs: [
            { name: "rewardToken", type: "address", indexed: true },
            { name: "pool", type: "address", indexed: true },
            { name: "startTime", type: "uint256", indexed: false },
            { name: "endTime", type: "uint256", indexed: false },
            { name: "refundee", type: "address", indexed: false },
            { name: "reward", type: "uint256", indexed: false },
          ],
        },
        fromBlock: STAKER_DEPLOY_BLOCK,
        toBlock: "latest",
      });

      const now = BigInt(Math.floor(Date.now() / 1000));

      const results = await Promise.all(
        logs.map(async (log: any) => {
          const { rewardToken, pool, startTime, endTime, refundee } =
            log.args as {
              rewardToken: `0x${string}`;
              pool: `0x${string}`;
              startTime: bigint;
              endTime: bigint;
              refundee: `0x${string}`;
            };

          const keyTuple = { rewardToken, pool, startTime, endTime, refundee };

          const incentiveId = keccak256(
            encodeAbiParameters(INCENTIVE_KEY_TYPE, [keyTuple]),
          );

          const state = await publicClient.readContract({
            address: STAKER.snowballStaker as `0x${string}`,
            abi: SnowballStakerABI,
            functionName: "incentives",
            args: [incentiveId],
          });

          const [totalRewardUnclaimed, totalSecondsClaimedX128, numberOfStakes] =
            state as [bigint, bigint, bigint];

          if (endTime <= now || totalRewardUnclaimed === 0n) {
            return null;
          }

          return {
            id: incentiveId,
            rewardToken,
            pool,
            startTime,
            endTime,
            refundee,
            totalRewardUnclaimed,
            totalSecondsClaimedX128,
            numberOfStakes: Number(numberOfStakes),
          } satisfies StakerIncentive;
        }),
      );

      setIncentives(results.filter((x: StakerIncentive | null): x is StakerIncentive => x !== null));
    } catch (err) {
      console.error("[useActiveIncentives] fetch failed:", err);
      setIncentives([]);
    } finally {
      setIsLoading(false);
    }
  }, [publicClient]);

  useEffect(() => {
    fetchIncentives();
    const interval = setInterval(fetchIncentives, REFETCH_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [fetchIncentives]);

  return { incentives, isLoading, refetch: fetchIncentives };
}
