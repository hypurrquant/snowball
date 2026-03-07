"use client";

import { useReadContracts, useConnection, useConfig } from "wagmi";
import { useChainWriteContract } from "@/shared/hooks/useChainWriteContract";
import { waitForTransactionReceipt } from "wagmi/actions";
import { LIQUITY } from "@/core/config/addresses";
import { StabilityPoolABI } from "@/core/abis";
import type { SPPosition } from "../types";

export function useStabilityPool(branch: "wCTC" | "lstCTC") {
  const config = useConfig();
  const { address } = useConnection();
  const b = LIQUITY.branches[branch];

  const { data, isLoading, refetch } = useReadContracts({
    contracts: [
      { address: b.stabilityPool, abi: StabilityPoolABI, functionName: "getTotalBoldDeposits" },
      {
        address: b.stabilityPool,
        abi: StabilityPoolABI,
        functionName: "getCompoundedBoldDeposit",
        args: [address!],
      },
      {
        address: b.stabilityPool,
        abi: StabilityPoolABI,
        functionName: "getDepositorCollGain",
        args: [address!],
      },
      {
        address: b.stabilityPool,
        abi: StabilityPoolABI,
        functionName: "getDepositorYieldGain",
        args: [address!],
      },
    ],
    query: { refetchInterval: 10_000 },
  });

  const position: SPPosition = {
    totalDeposits: data?.[0]?.status === "success" ? (data[0].result as bigint) : 0n,
    userDeposit: data?.[1]?.status === "success" ? (data[1].result as bigint) : 0n,
    collGain: data?.[2]?.status === "success" ? (data[2].result as bigint) : 0n,
    yieldGain: data?.[3]?.status === "success" ? (data[3].result as bigint) : 0n,
  };

  const { writeContractAsync, isPending } = useChainWriteContract();

  const waitAndRefetch = async (hash: `0x${string}`) => {
    await waitForTransactionReceipt(config, { hash });
    await refetch();
    return hash;
  };

  const deposit = async (amount: bigint) => {
    const hash = await writeContractAsync({
      address: b.stabilityPool,
      abi: StabilityPoolABI,
      functionName: "provideToSP",
      args: [amount, false],
    });
    return waitAndRefetch(hash);
  };

  const withdraw = async (amount: bigint) => {
    const hash = await writeContractAsync({
      address: b.stabilityPool,
      abi: StabilityPoolABI,
      functionName: "withdrawFromSP",
      args: [amount, true],
    });
    return waitAndRefetch(hash);
  };

  // Claim rewards: use withdrawFromSP(0, doClaim=true) for active depositors,
  // claimAllCollGains() only works when user has NO deposit (stashed coll only)
  const claimRewards = async () => {
    const hasDeposit = position.userDeposit > 0n;
    const hash = hasDeposit
      ? await writeContractAsync({
          address: b.stabilityPool,
          abi: StabilityPoolABI,
          functionName: "withdrawFromSP",
          args: [0n, true],
        })
      : await writeContractAsync({
          address: b.stabilityPool,
          abi: StabilityPoolABI,
          functionName: "claimAllCollGains",
        });
    return waitAndRefetch(hash);
  };

  return { position, isLoading, deposit, withdraw, claimRewards, isPending };
}
