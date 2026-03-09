"use client";

import { useWaitForTransactionReceipt } from "wagmi";
import { useChainWriteContract } from "@/shared/hooks/useChainWriteContract";
import { ERC8004 } from "@/core/config/addresses";
import { ReputationRegistryABI } from "@/core/abis";
import { GENERAL_TAG } from "../lib/constants";

export function useSubmitReview() {
  const {
    data: hash,
    writeContractAsync,
    isPending,
    reset,
  } = useChainWriteContract();

  const { data: receipt, isLoading: isConfirming } =
    useWaitForTransactionReceipt({ hash });

  const submitReview = async (params: {
    agentId: bigint;
    score: number; // 1-5 integer, will be scaled to 100-500
    comment: string;
  }) => {
    const scaledScore = BigInt(params.score * 100);
    return writeContractAsync({
      address: ERC8004.reputationRegistry,
      abi: ReputationRegistryABI,
      functionName: "submitReview",
      args: [params.agentId, scaledScore, params.comment, GENERAL_TAG],
    });
  };

  return {
    submitReview,
    isPending,
    isConfirming,
    isSuccess: !!receipt,
    hash,
    reset,
  };
}
