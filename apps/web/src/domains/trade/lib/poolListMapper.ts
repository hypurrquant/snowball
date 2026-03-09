import { TOKENS } from "@/core/config/addresses";
import type { Address } from "viem";
import type { PoolStatsResponse } from "@snowball/core";
import { formatUsdCompact } from "@/shared/lib/utils";
import type { PoolListItem } from "../hooks/usePoolList";

export const MOCK_POOLS: PoolListItem[] = [
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

export function formatPercent(value: number | null): string {
  if (value === null) return "0%";
  return `${(value * 100).toFixed(1)}%`;
}

export function getTokenIcon(address: string): string {
  const addr = address.toLowerCase();
  if (addr === TOKENS.wCTC.toLowerCase()) return "wCTC";
  if (addr === TOKENS.lstCTC.toLowerCase()) return "lstCTC";
  if (addr === TOKENS.sbUSD.toLowerCase()) return "sbUSD";
  if (addr === TOKENS.USDC.toLowerCase()) return "USDC";
  return "?";
}

export function apiToPoolListItem(pool: PoolStatsResponse["data"][number]): PoolListItem {
  return {
    name: pool.name,
    token0: pool.token0 as Address,
    token1: pool.token1 as Address,
    icon0: getTokenIcon(pool.token0),
    icon1: getTokenIcon(pool.token1),
    category: pool.name.includes("sbUSD") && pool.name.includes("USDC") ? "Stablecoin" : "Major",
    fee: `${(pool.fee / 10_000).toFixed(pool.fee % 10_000 === 0 ? 1 : 2)}%`,
    tvl: formatUsdCompact(pool.tvlUsd),
    volume24h: formatUsdCompact(pool.volume24hUsd),
    feesAPR: formatPercent(pool.feeApr),
    change24h: 0,
    isTrending: pool.volume24hUsd > 0,
  };
}
