"use client";

import Link from "next/link";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TOKENS, TOKEN_INFO } from "@/config/addresses";
import { usePool } from "@/hooks/trade/usePool";
import { formatTokenAmount } from "@/lib/utils";
import { Plus, Droplets } from "lucide-react";
import type { Address } from "viem";

import Image from "next/image";

interface PoolDef {
  name: string;
  token0: Address;
  token1: Address;
  category: string;
  icon0: string;
  icon1: string;
}

const INITIAL_POOLS: PoolDef[] = [
  { name: "wCTC / USDC", token0: TOKENS.wCTC, token1: TOKENS.USDC, category: "Major", icon0: "wCTC", icon1: "USDC" },
  { name: "wCTC / sbUSD", token0: TOKENS.wCTC, token1: TOKENS.sbUSD, category: "Major", icon0: "wCTC", icon1: "sbUSD" },
  { name: "sbUSD / USDC", token0: TOKENS.sbUSD, token1: TOKENS.USDC, category: "Stablecoin", icon0: "sbUSD", icon1: "USDC" },
  { name: "lstCTC / wCTC", token0: TOKENS.lstCTC, token1: TOKENS.wCTC, category: "Correlated", icon0: "lstCTC", icon1: "wCTC" },
];

function PoolRow({ pool }: { pool: PoolDef }) {
  const { dynamicFee, liquidity, isLoading } = usePool(pool.token0, pool.token1);

  return (
    <Link
      href={`/pool/${pool.token0}-${pool.token1}`}
      className="grid grid-cols-2 lg:grid-cols-[1fr_120px_100px_120px_100px] items-center gap-4 px-4 py-4 rounded-xl hover:bg-[#1a2035] transition-all duration-300 group mt-2"
    >
      {/* Pair */}
      <div className="flex items-center gap-3">
        <div className="flex -space-x-3 drop-shadow-lg">
          <Image src={`/tokens/${pool.icon0}.svg`} alt={pool.icon0} width={32} height={32} className="rounded-full ring-2 ring-[#0A0B14] z-10 bg-[#141525]" />
          <Image src={`/tokens/${pool.icon1}.svg`} alt={pool.icon1} width={32} height={32} className="rounded-full ring-2 ring-[#0A0B14] bg-[#141525]" />
        </div>
        <span className="font-semibold text-white group-hover:text-[#60a5fa] transition-colors">{pool.name}</span>
      </div>

      {/* Category */}
      <Badge variant="secondary" className="hidden lg:inline-flex w-fit bg-[#1C1D30] text-[#8B8D97] border border-transparent group-hover:border-white/5">
        {pool.category}
      </Badge>

      {/* Fee */}
      <span className="text-sm font-mono text-[#22c55e] lg:text-right">
        {isLoading ? "—" : dynamicFee !== undefined ? `${Number(dynamicFee) / 100}%` : "—"}
      </span>

      {/* Liquidity */}
      <span className="text-sm font-mono text-white lg:text-right hidden lg:block">
        {isLoading
          ? "—"
          : liquidity !== undefined
            ? `$${formatTokenAmount(liquidity as bigint, 18, 2)}`
            : "—"}
      </span>

      {/* Action */}
      <div className="text-right mt-2 lg:mt-0 col-span-2 lg:col-span-1">
        <Button variant="secondary" size="sm" className="w-full lg:w-auto bg-[#3b82f6] text-white hover:bg-[#2563eb] border-0 shadow-[0_0_15px_rgba(59,130,246,0.3)] hover:shadow-[0_0_20px_rgba(59,130,246,0.5)] transition-all">
          <span>Deposit</span>
        </Button>
      </div>
    </Link>
  );
}

export default function PoolPage() {
  return (
    <div className="max-w-5xl mx-auto px-4 py-8 relative">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-2xl h-[300px] bg-[#60a5fa]/5 rounded-[100%] blur-[100px] pointer-events-none -z-10" />

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2 text-white">
          <Droplets className="w-6 h-6 text-[#60a5fa]" />
          Liquidity Pools
        </h1>
        <Button asChild className="bg-white text-black hover:bg-gray-200">
          <Link href="/pool/add">
            <Plus className="w-4 h-4 mr-1" />
            New Position
          </Link>
        </Button>
      </div>

      <Card className="bg-[#141525]/60 backdrop-blur-xl border-[#1F2037] shadow-xl overflow-hidden">
        <CardContent className="p-0">
          {/* Header row */}
          <div className="hidden lg:grid grid-cols-[1fr_120px_100px_120px_100px] gap-4 px-8 py-4 bg-[#1C1D30]/50 text-xs font-semibold text-[#8B8D97] uppercase tracking-wider border-b border-[#1F2037]">
            <span>Pool Pair</span>
            <span>Category</span>
            <span className="text-right">Dynamic Fee</span>
            <span className="text-right">TVL</span>
            <span />
          </div>

          {/* Rows */}
          <div className="p-4 flex flex-col gap-1">
            {INITIAL_POOLS.map((pool) => (
              <PoolRow key={pool.name} pool={pool} />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
