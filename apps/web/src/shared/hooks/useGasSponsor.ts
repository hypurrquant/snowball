"use client";

import { useAccount } from "wagmi";

// ERC-4337 Paymaster addresses per chain
const PAYMASTER_ADDRESSES: Record<number, string> = {
  91342: "0x0742e48a1a6b7938cd88ae15c611d80451cceff0", // GIWA Sepolia
  102031: "0xd8b227b78a8ce95bbdd58dde5d920923d26b80df", // CC Testnet
};

const ENTRYPOINT_ADDRESSES: Record<number, string> = {
  91342: "0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789", // GIWA Sepolia
  102031: "0xae40e6c0f3ed4d13db35b7c3febeefe9614468ba", // CC Testnet (SimpleEntryPoint)
};

export function useGasSponsor() {
  const { chainId } = useAccount();

  const paymasterAddress = chainId ? PAYMASTER_ADDRESSES[chainId] : undefined;
  const entryPointAddress = chainId ? ENTRYPOINT_ADDRESSES[chainId] : undefined;
  const isAvailable = !!paymasterAddress && !!entryPointAddress;

  return {
    isAvailable,
    paymasterAddress,
    entryPointAddress,
    chainId,
  };
}
