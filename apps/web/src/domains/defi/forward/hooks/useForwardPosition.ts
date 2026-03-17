"use client";

import { useReadContract } from "wagmi";
import { FORWARD } from "@snowball/core/src/config/addresses";
import { ForwardExchangeABI } from "@/core/abis";
import type { ForwardPosition } from "../types";

const ZERO_ADDR = "0x0000000000000000000000000000000000000000";

export function useForwardPosition(tokenId: bigint | undefined) {
  const { data, isLoading, refetch } = useReadContract({
    address: FORWARD.exchange,
    abi: ForwardExchangeABI,
    functionName: "getPosition",
    args: [tokenId!],
    query: {
      enabled: tokenId !== undefined && FORWARD.exchange !== ZERO_ADDR,
      refetchInterval: 10_000,
    },
  });

  let position: ForwardPosition | null = null;

  if (data && tokenId !== undefined) {
    const p = data as any;
    position = {
      tokenId,
      marketId: p.marketId,
      notional: p.notional,
      forwardRate: p.forwardRate,
      maturityTime: p.maturityTime,
      collateral: p.collateral,
      counterparty: p.counterparty,
      originalOwner: p.originalOwner,
      isLong: p.isLong,
      settled: p.settled,
      locked: p.locked,
      pairedTokenId: 0n, // fetched separately if needed
    };
  }

  return { position, isLoading, refetch };
}
