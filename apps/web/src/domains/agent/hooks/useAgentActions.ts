"use client";

import { useChainWriteContract } from "@/shared/hooks/useChainWriteContract";
import { ERC8004 } from "@/core/config/addresses";
import { IdentityRegistryABI } from "@/core/abis";

export function useAgentActions() {
  const {
    writeContractAsync,
    isPending,
  } = useChainWriteContract();

  const activate = async (agentId: bigint) => {
    return writeContractAsync({
      address: ERC8004.identityRegistry,
      abi: IdentityRegistryABI,
      functionName: "activateAgent",
      args: [agentId],
    });
  };

  const deactivate = async (agentId: bigint) => {
    return writeContractAsync({
      address: ERC8004.identityRegistry,
      abi: IdentityRegistryABI,
      functionName: "deactivateAgent",
      args: [agentId],
    });
  };

  return { activate, deactivate, isPending };
}
