import type { ProtocolStatsResponse } from "@snowball/core";
import { formatUsdCompact } from "@/shared/lib/utils";

export interface ProtocolStats {
  tvl: string;
  volume24h: string;
  fees24h: string;
  totalPools: number;
  tvlChange24h: number;
}

export const MOCK_DATA: ProtocolStats = {
  tvl: "$2.45M",
  volume24h: "$384.2K",
  fees24h: "$1,152",
  totalPools: 4,
  tvlChange24h: 2.3,
};

export async function fetchStats(): Promise<ProtocolStats> {
  const res = await fetch("/api/protocol/stats");
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  const json: ProtocolStatsResponse = await res.json();
  return {
    tvl: formatUsdCompact(json.data.tvlUsd),
    volume24h: formatUsdCompact(json.data.volume24hUsd),
    fees24h: formatUsdCompact(json.data.fees24hUsd),
    totalPools: json.data.totalPools,
    tvlChange24h: 0,
  };
}
