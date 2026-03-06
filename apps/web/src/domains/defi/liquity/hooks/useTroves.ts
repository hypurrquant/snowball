"use client";

import { useReadContract, useReadContracts } from "wagmi";
import { LIQUITY } from "@/core/config/addresses";
import { TroveManagerABI, TroveNFTABI, MockPriceFeedABI } from "@/core/abis";
import type { TroveData } from "../types";
import type { Address } from "viem";

export function useTroves(branch: "wCTC" | "lstCTC", owner?: Address) {
  const b = LIQUITY.branches[branch];

  const { data: nftBalance } = useReadContract({
    address: b.troveNFT,
    abi: TroveNFTABI,
    functionName: "balanceOf",
    args: [owner!],
    query: { enabled: !!owner, refetchInterval: 10_000 },
  });

  const { data: price } = useReadContract({
    address: b.priceFeed,
    abi: MockPriceFeedABI,
    functionName: "lastGoodPrice",
    query: { refetchInterval: 10_000 },
  });

  const count = Number(nftBalance ?? 0n);
  const indices = Array.from({ length: count }, (_, i) => i);

  // Fetch trove IDs owned by this user
  const { data: idResults } = useReadContracts({
    contracts: indices.map((i) => ({
      address: b.troveNFT,
      abi: TroveNFTABI,
      functionName: "tokenOfOwnerByIndex" as const,
      args: [owner!, BigInt(i)] as const,
    })),
    query: { enabled: count > 0 && !!owner, refetchInterval: 10_000 },
  });

  const troveIds = (idResults ?? [])
    .filter((r) => r.status === "success")
    .map((r) => r.result as bigint);

  // Fetch trove details + ICR for each ID
  const { data: detailResults, isLoading, refetch } = useReadContracts({
    contracts: troveIds.flatMap((id) => [
      {
        address: b.troveManager,
        abi: TroveManagerABI,
        functionName: "getLatestTroveData" as const,
        args: [id] as const,
      },
      {
        address: b.troveManager,
        abi: TroveManagerABI,
        functionName: "getCurrentICR" as const,
        args: [id, price ?? 0n] as const,
      },
      {
        address: b.troveManager,
        abi: TroveManagerABI,
        functionName: "getTroveStatus" as const,
        args: [id] as const,
      },
    ]),
    query: { enabled: troveIds.length > 0 && !!price, refetchInterval: 10_000 },
  });

  const troves: TroveData[] = [];
  if (detailResults) {
    for (let i = 0; i < troveIds.length; i++) {
      const dataResult = detailResults[i * 3];
      const icrResult = detailResults[i * 3 + 1];
      const statusResult = detailResults[i * 3 + 2];

      if (dataResult?.status !== "success") continue;

      const troveData = dataResult.result as {
        entireDebt: bigint;
        entireColl: bigint;
        annualInterestRate: bigint;
      };
      const icr = icrResult?.status === "success"
        ? Number((icrResult.result as bigint) * 100n / (10n ** 18n)) / 100
        : 0;
      const status = statusResult?.status === "success"
        ? Number(statusResult.result as number)
        : 0;

      troves.push({
        id: troveIds[i],
        coll: troveData.entireColl,
        debt: troveData.entireDebt,
        interestRate: troveData.annualInterestRate,
        icr,
        status,
      });
    }
  }

  return { troves, troveCount: BigInt(count), isLoading, refetch };
}
