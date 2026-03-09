import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import type { Address } from "viem";
import type { PoolStatsResponse } from "@snowball/core";
import { MOCK_POOLS, apiToPoolListItem } from "../lib/poolListMapper";

export interface PoolListItem {
  name: string;
  token0: Address;
  token1: Address;
  icon0: string;
  icon1: string;
  category: string;
  fee: string;
  tvl: string;
  volume24h: string;
  feesAPR: string;
  change24h: number;
  isTrending: boolean;
}

interface UsePoolListReturn {
  pools: PoolListItem[];
  trending: PoolListItem[];
  isLoading: boolean;
}

const API_ENABLED = typeof window !== "undefined";

async function fetchPools(): Promise<PoolListItem[]> {
  const res = await fetch("/api/pools");
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  const data: PoolStatsResponse = await res.json();
  return data.data.map(apiToPoolListItem);
}

export function usePoolList(): UsePoolListReturn {
  const { data: pools, isLoading } = useQuery({
    queryKey: ["poolList"],
    queryFn: fetchPools,
    enabled: API_ENABLED,
    staleTime: 60_000,
    retry: 1,
  });

  const finalPools = pools ?? MOCK_POOLS;
  const trending = useMemo(
    () => finalPools.filter((p) => p.isTrending),
    [finalPools],
  );

  return {
    pools: finalPools,
    trending,
    isLoading,
  };
}
