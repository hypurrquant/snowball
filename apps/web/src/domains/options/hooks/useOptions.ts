"use client";

import { useConnection, useReadContract, useReadContracts } from "wagmi";
import {
  SnowballOptionsABI,
  OptionsClearingHouseABI,
} from "@/core/abis";
import { OPTIONS, API_BASE } from "@/core/config/addresses";
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
    functionName: "currentRoundId",
    query: { refetchInterval: 5_000 },
  });

  // Round data
  const { data: roundData } = useReadContract({
    address: OPTIONS.engine,
    abi: SnowballOptionsABI,
    functionName: "getRound",
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
        startPrice: (roundData as any).lockPrice as bigint,
        endPrice: (roundData as any).closePrice as bigint,
        startTime: (roundData as any).lockTimestamp as bigint,
        duration: (roundData as any).duration as bigint,
        totalOverAmount: (roundData as any).totalOverAmount as bigint,
        totalUnderAmount: (roundData as any).totalUnderAmount as bigint,
        status: Number((roundData as any).status),
        totalOrders: (roundData as any).orderCount as bigint,
        settledOrders: 0n,
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
