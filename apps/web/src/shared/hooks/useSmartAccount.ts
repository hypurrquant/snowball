"use client";

import { useAccount, useReadContract } from "wagmi";
import { useChainWriteContract } from "./useChainWriteContract";
import { useGasSponsor } from "./useGasSponsor";
import type { Address } from "viem";

// Factory addresses per chain
const FACTORY_ADDRESSES: Record<number, Address> = {
  91342: "0xe1a519137818678339e309d51131df53b356a2dc" as Address, // GIWA Sepolia
  102031: "0x6d5d44ba3261c20ca2a8bba155bee8f759e26ee9" as Address, // CC Testnet
};

const FactoryABI = [
  {
    type: "function",
    name: "getAccount",
    inputs: [{ name: "owner", type: "address" }],
    outputs: [{ type: "address" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "createAccount",
    inputs: [{ name: "owner", type: "address" }],
    outputs: [{ type: "address" }],
    stateMutability: "nonpayable",
  },
] as const;

const SimpleAccountABI = [
  {
    type: "function",
    name: "execute",
    inputs: [
      { name: "dest", type: "address" },
      { name: "value", type: "uint256" },
      { name: "data", type: "bytes" },
    ],
    outputs: [{ type: "bytes" }],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "owner",
    inputs: [],
    outputs: [{ type: "address" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "nonce",
    inputs: [],
    outputs: [{ type: "uint256" }],
    stateMutability: "view",
  },
] as const;

export function useSmartAccount() {
  const { address: eoaAddress, chainId } = useAccount();
  const {
    isAvailable: gasSponsorAvailable,
    paymasterAddress,
    entryPointAddress,
  } = useGasSponsor();

  const factoryAddress = chainId ? FACTORY_ADDRESSES[chainId] : undefined;
  const isFactoryDeployed =
    factoryAddress &&
    factoryAddress !== "0x0000000000000000000000000000000000000000";

  // Read existing smart account address
  const { data: smartAccountAddress } = useReadContract({
    address: factoryAddress as Address,
    abi: FactoryABI,
    functionName: "getAccount",
    args: eoaAddress ? [eoaAddress] : undefined,
    query: {
      enabled: !!eoaAddress && !!isFactoryDeployed,
    },
  });

  const hasSmartAccount =
    smartAccountAddress &&
    smartAccountAddress !== "0x0000000000000000000000000000000000000000";

  const { writeContractAsync, isPending } = useChainWriteContract();

  // Create smart account
  const createSmartAccount = async () => {
    if (!eoaAddress || !factoryAddress || !isFactoryDeployed) return;
    const hash = await writeContractAsync({
      address: factoryAddress as Address,
      abi: FactoryABI,
      functionName: "createAccount",
      args: [eoaAddress],
    });
    return hash;
  };

  // Execute via smart account (gasless if paymaster available)
  const executeSponsoredTx = async (
    dest: Address,
    value: bigint,
    data: `0x${string}`,
  ) => {
    if (!hasSmartAccount || !smartAccountAddress)
      throw new Error("No smart account");

    if (gasSponsorAvailable && paymasterAddress && entryPointAddress) {
      // Send UserOp to bundler API
      const response = await fetch("/api/bundler/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chainId,
          userOp: {
            sender: smartAccountAddress,
            callData: data, // encoded execute() call
            paymasterAndData: paymasterAddress,
          },
        }),
      });
      const result = (await response.json()) as { hash: string };
      return result.hash;
    } else {
      // Fallback: direct call through smart account
      const hash = await writeContractAsync({
        address: smartAccountAddress as Address,
        abi: SimpleAccountABI,
        functionName: "execute",
        args: [dest, value, data],
      });
      return hash;
    }
  };

  return {
    eoaAddress,
    smartAccountAddress: hasSmartAccount
      ? (smartAccountAddress as Address)
      : undefined,
    hasSmartAccount: !!hasSmartAccount,
    isFactoryDeployed: !!isFactoryDeployed,
    gasSponsorAvailable,
    createSmartAccount,
    executeSponsoredTx,
    isPending,
  };
}
