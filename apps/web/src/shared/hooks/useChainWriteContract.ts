"use client";

import { useWriteContract, useSwitchChain } from "wagmi";
import { creditcoinTestnet } from "@/core/config/chain";
import { useAccount } from "wagmi";

/**
 * Wraps wagmi's useWriteContract with automatic chain switching.
 * @param targetChainId - Chain to execute TX on. Defaults to Creditcoin Testnet.
 */
export function useChainWriteContract(targetChainId?: number) {
  const target = targetChainId ?? creditcoinTestnet.id;
  const { chainId } = useAccount();
  const { switchChainAsync } = useSwitchChain();
  const result = useWriteContract();

  const writeContractAsync: typeof result.writeContractAsync = async (
    variables,
    options?,
  ) => {
    if (chainId !== target) {
      await switchChainAsync({ chainId: target as 102031 });
    }
    return result.writeContractAsync(
      { ...variables, chainId: target } as typeof variables,
      options,
    );
  };

  return { ...result, writeContractAsync };
}
