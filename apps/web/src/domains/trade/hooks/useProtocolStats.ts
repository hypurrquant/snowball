import { useQuery } from "@tanstack/react-query";
import { fetchStats, MOCK_DATA } from "../lib/statsApi";
import type { ProtocolStats } from "../lib/statsApi";

interface UseProtocolStatsReturn {
  data: ProtocolStats;
  isLoading: boolean;
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
