"use client";

import { useReadContract } from "wagmi";
import { LIQUITY } from "@/core/config/addresses";
import { MultiTroveGetterABI, SortedTrovesABI, MockPriceFeedABI, TroveManagerABI } from "@/core/abis";
import { computeCR } from "../lib/liquityMath";

export interface SystemTrove {
  id: bigint;
  entireDebt: bigint;
  entireColl: bigint;
  annualInterestRate: bigint;
  icr: number;
  stake: bigint;
  lastDebtUpdateTime: bigint;
  interestBatchManager: string;
}

const BRANCH_INDEX: Record<string, bigint> = { wCTC: 0n, lstCTC: 1n };

export function useAllTroves(branch: "wCTC" | "lstCTC", count = 50) {
  const b = LIQUITY.branches[branch];
  const collIndex = BRANCH_INDEX[branch];

  // Get total trove count
  const { data: size } = useReadContract({
    address: b.sortedTroves,
    abi: SortedTrovesABI,
    functionName: "getSize",
    query: { refetchInterval: 15_000 },
  });

  // Get price for ICR calculation
  const { data: price } = useReadContract({
    address: b.priceFeed,
    abi: MockPriceFeedABI,
    functionName: "lastGoodPrice",
    query: { refetchInterval: 15_000 },
  });

  const totalCount = Number(size ?? 0n);
  const fetchCount = Math.min(totalCount, count);

  // Fetch sorted troves (descending by interest rate, startIdx=0)
  const { data: rawTroves, isLoading, refetch } = useReadContract({
    address: LIQUITY.shared.multiTroveGetter,
    abi: MultiTroveGetterABI,
    functionName: "getMultipleSortedTroves",
    args: [collIndex, 0n, BigInt(fetchCount)],
    query: { enabled: fetchCount > 0, refetchInterval: 15_000 },
  });

  const troves: SystemTrove[] = [];
  if (rawTroves && price) {
    for (const t of rawTroves as readonly any[]) {
      const icr = computeCR(t.entireColl, t.entireDebt, price as bigint);
      troves.push({
        id: t.id,
        entireDebt: t.entireDebt,
        entireColl: t.entireColl,
        annualInterestRate: t.annualInterestRate,
        icr,
        stake: t.stake,
        lastDebtUpdateTime: t.lastDebtUpdateTime,
        interestBatchManager: t.interestBatchManager,
      });
    }
  }

  return { troves, totalCount, isLoading, refetch };
}
