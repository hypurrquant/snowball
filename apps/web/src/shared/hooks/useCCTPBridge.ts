"use client";

import { useAccount } from "wagmi";
import { useChainWriteContract } from "./useChainWriteContract";
import { CCTP_CHAINS, getCCTPChain } from "@/core/config/cctp";
import type { Address } from "viem";

const TokenMessengerABI = [
  {
    type: "function",
    name: "depositForBurn",
    inputs: [
      { name: "amount", type: "uint256" },
      { name: "destinationDomain", type: "uint32" },
      { name: "mintRecipient", type: "bytes32" },
      { name: "burnToken", type: "address" },
    ],
    outputs: [{ name: "nonce", type: "uint64" }],
    stateMutability: "nonpayable",
  },
] as const;

export function useCCTPBridge() {
  const { address, chainId } = useAccount();
  const { writeContractAsync, isPending } = useChainWriteContract(chainId);

  const sourceChain = chainId ? getCCTPChain(chainId) : undefined;
  const isSourceSupported = !!sourceChain;

  const availableDestinations = CCTP_CHAINS.filter((c) => c.chainId !== chainId);

  const bridge = async (destChainId: number, amount: bigint) => {
    if (!sourceChain || !address) throw new Error("Source chain not supported");
    const dest = getCCTPChain(destChainId);
    if (!dest) throw new Error("Destination not supported");

    // Convert address to bytes32 (pad to 32 bytes)
    const mintRecipient =
      `0x000000000000000000000000${address.slice(2)}` as `0x${string}`;

    const hash = await writeContractAsync({
      address: sourceChain.tokenMessenger,
      abi: TokenMessengerABI,
      functionName: "depositForBurn",
      args: [amount, dest.domain, mintRecipient as Address, sourceChain.usdc],
    });
    return hash;
  };

  return {
    isSourceSupported,
    sourceChain,
    availableDestinations,
    bridge,
    isPending,
  };
}
