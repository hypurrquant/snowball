"use client";

import { useConnection, useReadContract, useReadContracts } from "wagmi";
import {
  SnowballOptionsABI,
  OptionsClearingHouseABI,
  OptionsVaultABI,
} from "@/abis";
import { OPTIONS, API_BASE } from "@/config/addresses";
import { useState, useCallback } from "react";

export interface Round {
  id: number;
  startPrice: bigint;
  endPrice: bigint;
  startTime: bigint;
  duration: bigint;
  totalOverAmount: bigint;
  totalUnderAmount: bigint;
  status: number; // 0=Open, 1=Executed, 2=Settled
  totalOrders: bigint;
  settledOrders: bigint;
}

export function useOptions() {
  const { address } = useConnection();

  // Current round
  const { data: currentRound } = useReadContract({
    address: OPTIONS.engine,
    abi: SnowballOptionsABI,
    functionName: "currentRound",
    query: { refetchInterval: 5_000 },
  });

  // Round data
  const { data: roundData } = useReadContract({
    address: OPTIONS.engine,
    abi: SnowballOptionsABI,
    functionName: "rounds",
    args: [currentRound!],
    query: { enabled: currentRound !== undefined, refetchInterval: 5_000 },
  });

  // User balances
  const { data: balances } = useReadContracts({
    contracts: [
      {
        address: OPTIONS.clearingHouse,
        abi: OptionsClearingHouseABI,
        functionName: "balanceOf",
        args: [address!],
      },
      {
        address: OPTIONS.clearingHouse,
        abi: OptionsClearingHouseABI,
        functionName: "escrowOf",
        args: [address!],
      },
    ],
    query: { enabled: !!address, refetchInterval: 10_000 },
  });

  const userBalance =
    balances?.[0]?.status === "success" ? (balances[0].result as bigint) : 0n;
  const userEscrow =
    balances?.[1]?.status === "success" ? (balances[1].result as bigint) : 0n;

  const round: Round | null =
    currentRound !== undefined && roundData
      ? {
        id: Number(currentRound),
        startPrice: (roundData as any)[0] as bigint,
        endPrice: (roundData as any)[1] as bigint,
        startTime: (roundData as any)[2] as bigint,
        duration: (roundData as any)[3] as bigint,
        totalOverAmount: (roundData as any)[4] as bigint,
        totalUnderAmount: (roundData as any)[5] as bigint,
        status: Number((roundData as any)[6]),
        totalOrders: (roundData as any)[7] as bigint,
        settledOrders: (roundData as any)[8] as bigint,
      }
      : null;

  // Submit order via backend API
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submitOrder = useCallback(
    async (params: {
      isOver: boolean;
      amount: string;
      signature: string;
      nonce: number;
    }) => {
      if (!address) return;
      setIsSubmitting(true);
      try {
        const res = await fetch(`${API_BASE}/api/options/order`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            user: address,
            isOver: params.isOver,
            amount: params.amount,
            signature: params.signature,
            nonce: params.nonce,
          }),
        });
        if (!res.ok) throw new Error(await res.text());
        return await res.json();
      } finally {
        setIsSubmitting(false);
      }
    },
    [address]
  );

  return {
    currentRound: currentRound !== undefined ? Number(currentRound) : null,
    round,
    userBalance,
    userEscrow,
    submitOrder,
    isSubmitting,
  };
}
