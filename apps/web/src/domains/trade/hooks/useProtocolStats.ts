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

// TODO: BE API 연동 시 useSWR/useQuery로 교체
export function useProtocolStats(): UseProtocolStatsReturn {
  return {
    data: {
      tvl: "$2.45M",
      volume24h: "$384.2K",
      fees24h: "$1,152",
      totalPools: 4,
      tvlChange24h: 2.3,
    },
    isLoading: false,
  };
}
