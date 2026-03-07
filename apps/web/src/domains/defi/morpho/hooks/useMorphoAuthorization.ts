"use client";

import { useConfig } from "wagmi";
import { useChainWriteContract } from "@/shared/hooks/useChainWriteContract";
import { readContract, waitForTransactionReceipt } from "wagmi/actions";
import { LEND } from "@/core/config/addresses";
import { MorphoAuthorizationABI } from "@/core/abis";
import type { Address } from "viem";

export function useMorphoAuthorization() {
  const config = useConfig();
  const { writeContractAsync, isPending } = useChainWriteContract();

  const setAuthorization = async (authorized: Address, newIsAuthorized: boolean) => {
    const hash = await writeContractAsync({
      address: LEND.snowballLend,
      abi: MorphoAuthorizationABI,
      functionName: "setAuthorization",
      args: [authorized, newIsAuthorized],
    });
    await waitForTransactionReceipt(config, { hash });
    return hash;
  };

  const checkIsAuthorized = async (authorizer: Address, authorized: Address): Promise<boolean> => {
    const result = await readContract(config, {
      address: LEND.snowballLend,
      abi: MorphoAuthorizationABI,
      functionName: "isAuthorized",
      args: [authorizer, authorized],
    });
    return result as boolean;
  };

  return {
    setAuthorization,
    checkIsAuthorized,
    isPending,
  };
}
