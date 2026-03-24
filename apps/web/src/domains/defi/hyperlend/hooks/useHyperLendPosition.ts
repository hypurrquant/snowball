"use client";

import { useReadContracts } from "wagmi";
import { useAccount } from "wagmi";
import { erc20Abi, type Address } from "viem";

const HYPEREVM_CHAIN_ID = 999;

/**
 * Reads a user's supply (hToken) and borrow (debtToken) positions on HyperLend.
 *
 * @param hToken - The hToken (aToken equivalent) address for the market
 * @param debtToken - The variable debt token address for the market
 */
export function useHyperLendPosition(hToken: Address, debtToken: Address) {
  const { address } = useAccount();

  const { data, isLoading } = useReadContracts({
    contracts: [
      {
        address: hToken,
        abi: erc20Abi,
        functionName: "balanceOf",
        args: [address!],
        chainId: HYPEREVM_CHAIN_ID,
      },
      {
        address: debtToken,
        abi: erc20Abi,
        functionName: "balanceOf",
        args: [address!],
        chainId: HYPEREVM_CHAIN_ID,
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
