"use client";

import { useReadContracts } from "wagmi";
import { useAccount } from "wagmi";
import { erc20Abi, type Address } from "viem";
import { MONAD_TESTNET_CHAIN_ID } from "@/core/config/monad";

/**
 * Reads a user's supply (aToken) and borrow (debtToken) positions on Neverland.
 *
 * @param aToken - The aToken address for the market
 * @param debtToken - The variable debt token address for the market
 */
export function useNeverlandPosition(aToken: Address, debtToken: Address) {
  const { address } = useAccount();

  const { data, isLoading } = useReadContracts({
    contracts: [
      {
        address: aToken,
        abi: erc20Abi,
        functionName: "balanceOf",
        args: [address!],
        chainId: MONAD_TESTNET_CHAIN_ID,
      },
      {
        address: debtToken,
        abi: erc20Abi,
        functionName: "balanceOf",
        args: [address!],
        chainId: MONAD_TESTNET_CHAIN_ID,
      },
    ],
    query: {
      enabled: !!address,
      refetchInterval: 15_000,
    },
  });

  const supplyBalance = (data?.[0]?.result as bigint | undefined) ?? 0n;
  const borrowBalance = (data?.[1]?.result as bigint | undefined) ?? 0n;

  return { supplyBalance, borrowBalance, isLoading };
}
