"use client";

import { useReadContract, useReadContracts } from "wagmi";
import { LIQUITY } from "@/core/config/addresses";
import { TroveManagerABI, MockPriceFeedABI } from "@/core/abis";
import type { TroveData } from "../types";
import type { Address } from "viem";
import { encodeAbiParameters, keccak256 } from "viem";

// Compute troveId the same way the contract does:
// troveId = uint256(keccak256(abi.encode(sender, owner, ownerIndex)))
// For direct user calls, sender == owner
function computeTroveId(sender: Address, owner: Address, ownerIndex: bigint): bigint {
  const encoded = encodeAbiParameters(
    [{ type: "address" }, { type: "address" }, { type: "uint256" }],
    [sender, owner, ownerIndex],
  );
  return BigInt(keccak256(encoded));
}

// Max ownerIndex to scan per user (MVP: typically 1-3 troves)
const MAX_OWNER_INDEX = 100;

export function useTroves(branch: "wCTC" | "lstCTC", owner?: Address) {
  const b = LIQUITY.branches[branch];

  const { data: price } = useReadContract({
    address: b.priceFeed,
    abi: MockPriceFeedABI,
    functionName: "lastGoodPrice",
    query: { refetchInterval: 10_000 },
  });

  // Compute candidate troveIds for ownerIndex 0..MAX_OWNER_INDEX
  const candidateIds = owner
    ? Array.from({ length: MAX_OWNER_INDEX }, (_, i) => computeTroveId(owner, owner, BigInt(i)))
    : [];

  // Check status of each candidate to find which ones exist
  const { data: statusResults } = useReadContracts({
    contracts: candidateIds.map((id) => ({
      address: b.troveManager,
      abi: TroveManagerABI,
      functionName: "getTroveStatus" as const,
      args: [id] as const,
    })),
    query: { enabled: candidateIds.length > 0, refetchInterval: 10_000 },
  });

  // Filter to active troves (status 1 = active)
  const activeTroveIds = candidateIds.filter((_, i) => {
    const r = statusResults?.[i];
    if (r?.status !== "success") return false;
    const status = Number(r.result as number);
    return status === 1; // active
  });

  // Fetch trove details + ICR for active troves
  const { data: detailResults, isLoading, refetch } = useReadContracts({
    contracts: activeTroveIds.flatMap((id) => [
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
    ]),
    query: { enabled: activeTroveIds.length > 0 && !!price, refetchInterval: 10_000 },
  });

  const troves: TroveData[] = [];
  if (detailResults) {
    for (let i = 0; i < activeTroveIds.length; i++) {
      const dataResult = detailResults[i * 2];
      const icrResult = detailResults[i * 2 + 1];

      if (dataResult?.status !== "success") continue;

      const troveData = dataResult.result as {
        entireDebt: bigint;
        entireColl: bigint;
        annualInterestRate: bigint;
      };
      const icr = icrResult?.status === "success"
        ? Number((icrResult.result as bigint) * 100n / (10n ** 18n)) / 100
        : 0;

      troves.push({
        id: activeTroveIds[i],
        coll: troveData.entireColl,
        debt: troveData.entireDebt,
        interestRate: troveData.annualInterestRate,
        icr,
        status: 1,
      });
    }
  }

  // Next available ownerIndex for opening a new trove
  const nextOwnerIndexRaw = owner
    ? candidateIds.findIndex((_, i) => {
        const r = statusResults?.[i];
        if (r?.status !== "success") return true;
        return Number(r.result as number) === 0; // nonExistent
      })
    : 0;
  // findIndex returns -1 when all slots are occupied → fall back to next slot
  const nextOwnerIndex = BigInt(nextOwnerIndexRaw === -1 ? MAX_OWNER_INDEX : nextOwnerIndexRaw);

  return { troves, troveCount: BigInt(troves.length), isLoading, refetch, nextOwnerIndex };
}
