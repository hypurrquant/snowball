"use client";

import { useWaitForTransactionReceipt } from "wagmi";
import { useChainWriteContract } from "@/shared/hooks/useChainWriteContract";
import { decodeEventLog } from "viem";
import { ERC8004 } from "@/core/config/addresses";
import { IdentityRegistryABI } from "@/core/abis";

export function useRegisterAgent() {
  const {
    data: hash,
    writeContractAsync,
    isPending,
    reset,
  } = useChainWriteContract();

  const { data: receipt, isLoading: isConfirming } =
    useWaitForTransactionReceipt({ hash });

  const register = async (params: {
    name: string;
    agentType: string;
    endpoint: `0x${string}`;
    tokenURI: string;
  }) => {
    return writeContractAsync({
      address: ERC8004.identityRegistry,
      abi: IdentityRegistryABI,
      functionName: "registerAgent",
      args: [params.name, params.agentType, params.endpoint, params.tokenURI],
    });
  };

  // Parse AgentRegistered event from receipt to get agentId
  const agentId = (() => {
    if (!receipt?.logs) return undefined;
    for (const log of receipt.logs) {
      try {
        const event = decodeEventLog({
          abi: IdentityRegistryABI,
          data: log.data,
          topics: log.topics,
        });
        if (event.eventName === "AgentRegistered") {
          return (event.args as { agentId: bigint }).agentId;
        }
      } catch {
        // not our event
      }
    }
    return undefined;
  })();

  return {
    register,
    isPending,
    isConfirming,
    isSuccess: !!receipt,
    agentId,
    hash,
    reset,
  };
}
