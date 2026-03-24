"use client";

import { useAccount, useReadContracts } from "wagmi";
import { FELIX } from "@snowball/core/src/config/hyperevm";
import { TroveManagerABI } from "@/core/abis";
import { encodeAbiParameters, keccak256, zeroAddress } from "viem";
import type { Address } from "viem";
import type { FelixTrove } from "../types";

// Zero address sentinel — branch not yet deployed
const ZERO = zeroAddress;

// Compute troveId the same way the contract does:
// troveId = uint256(keccak256(abi.encode(sender, owner, ownerIndex)))
function computeTroveId(sender: Address, owner: Address, ownerIndex: bigint): bigint {
  const encoded = encodeAbiParameters(
    [{ type: "address" }, { type: "address" }, { type: "uint256" }],
    [sender, owner, ownerIndex],
  );
  return BigInt(keccak256(encoded));
}

const MAX_OWNER_INDEX = 20;

export function useFelixTroves(branch: "HYPE" = "HYPE") {
  const { address } = useAccount();
  const b = FELIX.branches[branch];

  // Guard: branch not yet deployed
  const isDeployed = b.troveManager !== ZERO;

  // Compute candidate troveIds for ownerIndex 0..MAX_OWNER_INDEX
  const candidateIds: bigint[] = address && isDeployed
    ? Array.from({ length: MAX_OWNER_INDEX }, (_, i) =>
        computeTroveId(address, address, BigInt(i)))
    : [];

  // Check status of each candidate to find active troves
  const { data: statusResults, isLoading: isLoadingStatus } = useReadContracts({
    contracts: candidateIds.map((id) => ({
      address: b.troveManager,
      abi: TroveManagerABI,
      functionName: "getTroveStatus" as const,
      args: [id] as const,
      chainId: 999 as const,
    })),
    query: { enabled: candidateIds.length > 0 },
  });

  const activeTroveIds = candidateIds.filter((_, i) => {
    const r = statusResults?.[i];
    if (r?.status !== "success") return false;
    return Number(r.result as number) === 1; // active
  });

  // Fetch trove details for active troves
  const { data: detailResults, isLoading: isLoadingDetails, refetch } = useReadContracts({
    contracts: activeTroveIds.map((id) => ({
      address: b.troveManager,
      abi: TroveManagerABI,
      functionName: "getLatestTroveData" as const,
      args: [id] as const,
      chainId: 999 as const,
    })),
    query: { enabled: activeTroveIds.length > 0 },
  });

  const troves: FelixTrove[] = [];
  if (detailResults) {
    for (let i = 0; i < activeTroveIds.length; i++) {
      const result = detailResults[i];
      if (result?.status !== "success") continue;

      const data = result.result as {
        entireDebt: bigint;
        entireColl: bigint;
        annualInterestRate: bigint;
      };

      troves.push({
        id: activeTroveIds[i],
        collateral: data.entireColl,
        debt: data.entireDebt,
        interestRate: data.annualInterestRate,
        status: 1,
      });
    }
  }

  return {
    troves,
    isLoading: isLoadingStatus || isLoadingDetails,
    isDeployed,
    refetch,
  };
}
