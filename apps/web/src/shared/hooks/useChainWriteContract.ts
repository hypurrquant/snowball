"use client";

import { useWriteContract, useSwitchChain, useAccount } from "wagmi";
import { creditcoinTestnet } from "@/core/config/chain";

/**
 * Wraps wagmi's useWriteContract with automatic chain switching.
 * After switching, omits chainId from the call to avoid stale-state validation errors
 * — wagmi/viem will use the wallet's current chain (which we just switched to).
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
      // Allow React state (chainId) to update after wallet switch
      await new Promise((r) => setTimeout(r, 300));
    }
    // Don't spread chainId — after switching, the wallet is already on the right chain.
    // Passing chainId can cause "chain mismatch" if wagmi state hasn't propagated yet.
    return result.writeContractAsync(variables, options);
  };

  return { ...result, writeContractAsync };
}
