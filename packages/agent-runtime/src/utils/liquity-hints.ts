import type { PublicClient } from "viem";
import { HintHelpersABI, SortedTrovesABI } from "../abis";
import type { LiquityBranchConfig } from "../types";

/**
 * Calculate upperHint and lowerHint for adjustTroveInterestRate.
 * Follows the same pattern as FE's useTroveActions.ts → HintHelpers.
 */
export async function findHints(
  publicClient: PublicClient,
  branchConfig: LiquityBranchConfig,
  newInterestRate: bigint,
  branchIdx: bigint = 0n
): Promise<{ upperHint: bigint; lowerHint: bigint }> {
  const numTrials = 15n;
  const randomSeed = BigInt(Math.floor(Math.random() * 1e10));

  // 1. Get approximate hint from HintHelpers
  const [approxHint] = await publicClient.readContract({
    address: branchConfig.hintHelpers,
    abi: HintHelpersABI,
    functionName: "getApproxHint",
    args: [branchIdx, newInterestRate, numTrials, randomSeed],
  }) as readonly [bigint, bigint, bigint];

  // 2. Find exact insert position from SortedTroves
  const [upperHint, lowerHint] = await publicClient.readContract({
    address: branchConfig.sortedTroves,
    abi: SortedTrovesABI,
    functionName: "findInsertPosition",
    args: [newInterestRate, approxHint, approxHint],
  }) as readonly [bigint, bigint];

  return { upperHint, lowerHint };
}
