import { useQuery } from "@tanstack/react-query";
import type { ProtocolStatsResponse } from "@snowball/core/src/volume/types";

interface ProtocolStats {
  tvl: string;
  volume24h: string;
  fees24h: string;
  totalPools: number;
  tvlChange24h: number;
}

interface UseProtocolStatsReturn {
  data: ProtocolStats;
  isLoading: boolean;
}

const MOCK_DATA: ProtocolStats = {
  tvl: "$2.45M",
  volume24h: "$384.2K",
  fees24h: "$1,152",
  totalPools: 4,
  tvlChange24h: 2.3,
};


function formatUsd(value: number): string {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(1)}K`;
  return `$${value.toFixed(0)}`;
}

async function fetchStats(): Promise<ProtocolStats> {
  const res = await fetch("/api/protocol/stats");
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  const json: ProtocolStatsResponse = await res.json();
  return {
    tvl: formatUsd(json.data.tvlUsd),
    volume24h: formatUsd(json.data.volume24hUsd),
    fees24h: formatUsd(json.data.fees24hUsd),
    totalPools: json.data.totalPools,
    tvlChange24h: 0,
  };
}

export function useProtocolStats(): UseProtocolStatsReturn {
  const { data, isLoading } = useQuery({
    queryKey: ["protocolStats"],
    queryFn: fetchStats,
    staleTime: 60_000,
    retry: 1,
  });

  return {
    data: data ?? MOCK_DATA,
    isLoading,
  };
}
