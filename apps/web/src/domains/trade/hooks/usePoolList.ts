import { useMemo } from "react";
import { TOKENS } from "@/core/config/addresses";
import type { Address } from "viem";

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

const MOCK_POOLS: PoolListItem[] = [
  {
    name: "wCTC / USDC",
    token0: TOKENS.wCTC,
    token1: TOKENS.USDC,
    icon0: "wCTC",
    icon1: "USDC",
    category: "Major",
    fee: "0.3%",
    tvl: "$1.2M",
    volume24h: "$210.5K",
    feesAPR: "18.4%",
    change24h: 5.2,
    isTrending: true,
  },
  {
    name: "wCTC / sbUSD",
    token0: TOKENS.wCTC,
    token1: TOKENS.sbUSD,
    icon0: "wCTC",
    icon1: "sbUSD",
    category: "Major",
    fee: "0.3%",
    tvl: "$820K",
    volume24h: "$98.3K",
    feesAPR: "12.1%",
    change24h: 2.1,
    isTrending: true,
  },
  {
    name: "sbUSD / USDC",
    token0: TOKENS.sbUSD,
    token1: TOKENS.USDC,
    icon0: "sbUSD",
    icon1: "USDC",
    category: "Stablecoin",
    fee: "0.05%",
    tvl: "$340K",
    volume24h: "$62.1K",
    feesAPR: "4.8%",
    change24h: 0.3,
    isTrending: false,
  },
  {
    name: "lstCTC / wCTC",
    token0: TOKENS.lstCTC,
    token1: TOKENS.wCTC,
    icon0: "lstCTC",
    icon1: "wCTC",
    category: "Correlated",
    fee: "0.3%",
    tvl: "$280K",
    volume24h: "$13.3K",
    feesAPR: "8.2%",
    change24h: -0.8,
    isTrending: true,
  },
];

// TODO: BE API 연동 시 useSWR/useQuery로 교체
export function usePoolList(): UsePoolListReturn {
  const trending = useMemo(
    () => MOCK_POOLS.filter((p) => p.isTrending),
    [],
  );

  return {
    pools: MOCK_POOLS,
    trending,
    isLoading: false,
  };
}
