import type { Address, PublicClient } from "viem";
import { TroveManagerABI, AddRemoveManagersABI, ActivePoolABI } from "../abis";
import type { AgentConfig, LiquitySnapshot } from "../types";

export async function observeLiquity(
  publicClient: PublicClient,
  config: AgentConfig,
  user: Address,
  troveId: bigint
): Promise<LiquitySnapshot> {
  // Always fetch market avg rate (independent of user trove)
  const avgInterestRate = await fetchAvgInterestRate(publicClient, config);

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
      address: config.liquity.troveManager,
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
      address: config.liquity.troveManager,
      abi: TroveManagerABI,
      functionName: "getTroveStatus",
      args: [troveId],
    }) as Promise<number>,
    publicClient.readContract({
      address: config.liquity.borrowerOperations,
      abi: AddRemoveManagersABI,
      functionName: "addManagerOf",
      args: [troveId],
    }) as Promise<Address>,
    publicClient.readContract({
      address: config.liquity.borrowerOperations,
      abi: AddRemoveManagersABI,
      functionName: "getInterestIndividualDelegateOf",
      args: [troveId],
    }) as Promise<Address>,
  ]);

  const hasTrove = troveStatus === 1; // 1 = active

  return {
    troveId,
    hasTrove,
    collateral: troveData.entireColl,
    debt: troveData.entireDebt,
    annualInterestRate: troveData.annualInterestRate,
    lastInterestRateAdjTime: troveData.lastInterestRateAdjTime,
    avgInterestRate,
    isAddManager: addManager.toLowerCase() === config.agentVault.toLowerCase(),
    isInterestDelegate: interestDelegate.toLowerCase() === config.agentVault.toLowerCase(),
  };
}

async function fetchAvgInterestRate(
  publicClient: PublicClient,
  config: AgentConfig,
): Promise<bigint> {
  try {
    const [weightedSum, recordedDebt] = await Promise.all([
      publicClient.readContract({
        address: config.liquity.activePool,
        abi: ActivePoolABI,
        functionName: "aggWeightedDebtSum",
      }) as Promise<bigint>,
      publicClient.readContract({
        address: config.liquity.activePool,
        abi: ActivePoolABI,
        functionName: "aggRecordedDebt",
      }) as Promise<bigint>,
    ]);
    if (recordedDebt === 0n) return 0n;
    return weightedSum / recordedDebt; // 1e18 scale (same as annualInterestRate)
  } catch {
    return 0n;
  }
}
