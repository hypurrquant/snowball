import type { Address, PublicClient } from "viem";
import { TroveManagerABI, AddRemoveManagersABI, ActivePoolABI } from "../abis";
import type { LiquityBranchConfig, LiquitySnapshot } from "../types";

export async function observeLiquity(
  publicClient: PublicClient,
  branchConfig: LiquityBranchConfig,
  agentVault: Address,
  user: Address,
  troveId: bigint
): Promise<LiquitySnapshot> {
  const avgInterestRate = await fetchAvgInterestRate(publicClient, branchConfig);

  if (troveId === 0n) {
    return {
      troveId: 0n,
      hasTrove: false,
      collateral: 0n,
      debt: 0n,
      annualInterestRate: 0n,
      lastInterestRateAdjTime: 0n,
      avgInterestRate,
      isAddManager: false,
      isInterestDelegate: false,
    };
  }

  const [troveData, troveStatus, addManager, interestDelegate] = await Promise.all([
    publicClient.readContract({
      address: branchConfig.troveManager,
      abi: TroveManagerABI,
      functionName: "getLatestTroveData",
      args: [troveId],
    }) as Promise<{
      entireDebt: bigint;
      entireColl: bigint;
      annualInterestRate: bigint;
      lastInterestRateAdjTime: bigint;
    }>,
    publicClient.readContract({
      address: branchConfig.troveManager,
      abi: TroveManagerABI,
      functionName: "getTroveStatus",
      args: [troveId],
    }) as Promise<number>,
    publicClient.readContract({
      address: branchConfig.borrowerOperations,
      abi: AddRemoveManagersABI,
      functionName: "addManagerOf",
      args: [troveId],
    }) as Promise<Address>,
    publicClient.readContract({
      address: branchConfig.borrowerOperations,
      abi: AddRemoveManagersABI,
      functionName: "getInterestIndividualDelegateOf",
      args: [troveId],
    }) as Promise<Address>,
  ]);

  const hasTrove = troveStatus === 1;

  return {
    troveId,
    hasTrove,
    collateral: troveData.entireColl,
    debt: troveData.entireDebt,
    annualInterestRate: troveData.annualInterestRate,
    lastInterestRateAdjTime: troveData.lastInterestRateAdjTime,
    avgInterestRate,
    isAddManager: addManager.toLowerCase() === agentVault.toLowerCase(),
    isInterestDelegate: interestDelegate.toLowerCase() === agentVault.toLowerCase(),
  };
}

async function fetchAvgInterestRate(
  publicClient: PublicClient,
  branchConfig: LiquityBranchConfig,
): Promise<bigint> {
  try {
    const [weightedSum, recordedDebt] = await Promise.all([
      publicClient.readContract({
        address: branchConfig.activePool,
        abi: ActivePoolABI,
        functionName: "aggWeightedDebtSum",
      }) as Promise<bigint>,
      publicClient.readContract({
        address: branchConfig.activePool,
        abi: ActivePoolABI,
        functionName: "aggRecordedDebt",
      }) as Promise<bigint>,
    ]);
    if (recordedDebt === 0n) return 0n;
    return weightedSum / recordedDebt;
  } catch {
    return 0n;
  }
}
