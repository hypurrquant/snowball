"use client";

import { useReadContracts, useAccount } from "wagmi";
import { FORWARD } from "@snowball/core/src/config/addresses";
import { ForwardVaultABI } from "@/core/abis";
import type { ForwardVaultBalance } from "../types";

const ZERO_ADDR = "0x0000000000000000000000000000000000000000";

export function useForwardVault() {
  const { address } = useAccount();

  const { data, isLoading, refetch } = useReadContracts({
    contracts: [
      {
        address: FORWARD.vault,
        abi: ForwardVaultABI,
        functionName: "freeBalance",
        args: [address!],
      },
      {
        address: FORWARD.vault,
        abi: ForwardVaultABI,
        functionName: "lockedBalance",
        args: [address!],
      },
    ],
    query: {
      enabled: !!address && FORWARD.vault !== ZERO_ADDR,
      refetchInterval: 10_000,
    },
  });

  let balance: ForwardVaultBalance | null = null;

  if (data?.[0]?.result !== undefined && data?.[1]?.result !== undefined) {
    balance = {
      free: data[0].result as bigint,
      locked: data[1].result as bigint,
    };
  }

  return { balance, isLoading, refetch };
}
