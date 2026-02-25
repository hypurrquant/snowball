"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { TOKENS } from "@/config/contracts";
import { usePool } from "@/hooks/usePool";
import { Address, formatUnits } from "viem";

// 4 initial pools
const INITIAL_POOLS = [
  { name: "wCTC / USDC", token0: TOKENS.wCTC, token1: TOKENS.USDC, category: "Major" },
  { name: "wCTC / sbUSD", token0: TOKENS.wCTC, token1: TOKENS.sbUSD, category: "Major" },
  { name: "sbUSD / USDC", token0: TOKENS.sbUSD, token1: TOKENS.USDC, category: "Stablecoin" },
  { name: "lstCTC / wCTC", token0: TOKENS.lstCTC, token1: TOKENS.wCTC, category: "Correlated" },
];

function PoolRow({ pool }: { pool: typeof INITIAL_POOLS[0] }) {
  const { dynamicFee, liquidity } = usePool(pool.token0, pool.token1);

  return (
    <Link href={`/pool/${pool.token0}-${pool.token1}`}>
      <div className="grid grid-cols-5 items-center p-4 hover:bg-bg-input/50 transition-colors cursor-pointer border-b border-border/50 last:border-0">
        <div className="font-medium">
          <span className="flex items-center gap-2">
            <div className="flex -space-x-2">
              <div className="w-6 h-6 rounded-full bg-accent-primary/20 border border-border" />
              <div className="w-6 h-6 rounded-full bg-success/20 border border-border" />
            </div>
            {pool.name}
          </span>
        </div>
        <div className="text-text-secondary">
          <span className="px-2 py-1 rounded-full bg-bg-input text-xs">{pool.category}</span>
        </div>
        <div className="text-text-primary">
          {dynamicFee !== undefined ? `${(Number(dynamicFee) / 10000).toFixed(2)}%` : "-"}
        </div>
        <div className="text-text-primary">
          {liquidity != null ? formatUnits(liquidity as bigint, 18).slice(0, 8) : "-"} <span className="text-xs text-text-secondary">LP</span>
        </div>
        <div className="text-right">
          <Button variant="outline" size="sm">Deposit</Button>
        </div>
      </div>
    </Link>
  );
}

export default function PoolsPage() {
  return (
    <main className="container mx-auto max-w-5xl py-12 px-4">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Pools</h1>
        <Link href="/pool/add">
          <Button className="bg-accent-primary text-bg-primary hover:bg-accent-primary/90">+ New Position</Button>
        </Link>
      </div>

      <Card className="bg-bg-card border-border shadow-md overflow-hidden">
        <div className="grid grid-cols-5 p-4 bg-bg-input/30 text-sm font-medium text-text-secondary border-b border-border">
          <div>Pool Pair</div>
          <div>Category</div>
          <div>Dynamic Fee</div>
          <div>Liquidity (On-Chain)</div>
          <div className="text-right">Actions</div>
        </div>

        <div className="flex flex-col">
          {INITIAL_POOLS.map((pool, idx) => (
            <PoolRow key={idx} pool={pool} />
          ))}
        </div>
      </Card>
    </main>
  );
}
