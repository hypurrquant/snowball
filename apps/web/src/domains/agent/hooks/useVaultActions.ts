"use client";

import { useWriteContract } from "wagmi";
import { ERC8004 } from "@/core/config/addresses";
import { AgentVaultABI } from "@/core/abis";
import type { Address } from "viem";

export function useVaultActions() {
  const {
    writeContractAsync: depositAsync,
    isPending: isDepositPending,
  } = useWriteContract();

  const {
    writeContractAsync: withdrawAsync,
    isPending: isWithdrawPending,
  } = useWriteContract();

  const deposit = async (token: Address, amount: bigint) => {
    return depositAsync({
      address: ERC8004.agentVault,
      abi: AgentVaultABI,
      functionName: "deposit",
      args: [token, amount],
    });
  };

  const withdraw = async (token: Address, amount: bigint) => {
    return withdrawAsync({
      address: ERC8004.agentVault,
      abi: AgentVaultABI,
      functionName: "withdraw",
      args: [token, amount],
    });
  };

  return {
    deposit,
    withdraw,
    isDepositPending,
    isWithdrawPending,
  };
}
