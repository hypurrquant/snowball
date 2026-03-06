"use client";

import { useReadContracts } from "wagmi";
import { LIQUITY } from "@/core/config/addresses";
import {
  TroveManagerABI,
  MockPriceFeedABI,
  BorrowerOperationsABI,
} from "@/core/abis";
import type { BranchStats } from "../types";
import { computeCR } from "../lib/liquityMath";

export function useLiquityBranch(branch: "wCTC" | "lstCTC") {
  const b = LIQUITY.branches[branch];

  const { data, isLoading } = useReadContracts({
    contracts: [
      { address: b.troveManager, abi: TroveManagerABI, functionName: "getEntireBranchColl" },
      { address: b.troveManager, abi: TroveManagerABI, functionName: "getEntireBranchDebt" },
      { address: b.priceFeed, abi: MockPriceFeedABI, functionName: "lastGoodPrice" },
      { address: b.borrowerOperations, abi: BorrowerOperationsABI, functionName: "MCR" },
      { address: b.borrowerOperations, abi: BorrowerOperationsABI, functionName: "CCR" },
    ],
    query: { refetchInterval: 10_000 },
  });

  const totalColl = data?.[0]?.status === "success" ? (data[0].result as bigint) : 0n;
  const totalDebt = data?.[1]?.status === "success" ? (data[1].result as bigint) : 0n;
  const price = data?.[2]?.status === "success" ? (data[2].result as bigint) : 0n;
  const mcr = data?.[3]?.status === "success" ? (data[3].result as bigint) : 0n;
  const ccr = data?.[4]?.status === "success" ? (data[4].result as bigint) : 0n;
  const tcr = computeCR(totalColl, totalDebt, price);

  const stats: BranchStats = { totalColl, totalDebt, price, tcr, mcr, ccr };

  return { stats, isLoading };
}
