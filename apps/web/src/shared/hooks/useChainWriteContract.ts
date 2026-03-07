"use client";

import { useWriteContract, useSwitchChain } from "wagmi";
import { creditcoinTestnet } from "@/core/config/chain";
import { useAccount } from "wagmi";

/**
 * Wraps wagmi's useWriteContract with automatic chain switching.
 * If the wallet is on the wrong chain, it switches to Creditcoin Testnet before sending the tx.
 */
export function useChainWriteContract() {
  const { chainId } = useAccount();
  const { switchChainAsync } = useSwitchChain();
  const result = useWriteContract();

  const writeContractAsync: typeof result.writeContractAsync = async (
    variables,
    options?,
  ) => {
    if (chainId !== creditcoinTestnet.id) {
      await switchChainAsync({ chainId: creditcoinTestnet.id });
    }
    return result.writeContractAsync(
      { ...variables, chainId: creditcoinTestnet.id } as typeof variables,
      options,
    );
  };

  return { ...result, writeContractAsync };
}
