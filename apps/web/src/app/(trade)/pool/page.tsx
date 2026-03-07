"use client";

import Link from "next/link";
import Image from "next/image";
import { Card, CardContent } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import { StatCard } from "@/shared/components/common/StatCard";
import { useProtocolStats } from "@/domains/trade/hooks/useProtocolStats";
import { usePoolList, type PoolListItem } from "@/domains/trade/hooks/usePoolList";
import { Plus, Droplets, DollarSign, BarChart3, TrendingUp, Flame, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { MyPositionsBanner } from "@/domains/trade/components/MyPositionsBanner";

/* ── Trending Pool Card ── */
function TrendingPoolCard({ pool }: { pool: PoolListItem }) {
  const isPositive = pool.change24h >= 0;

  return (
    <Link
      href={`/pool/${pool.token0}-${pool.token1}`}
      className="min-w-[260px] flex-shrink-0 snap-start card card-hover group"
    >
      <div className="flex items-center gap-3 mb-3">
        <div className="flex -space-x-2">
          <Image src={`/tokens/${pool.icon0}.svg`} alt={pool.icon0} width={28} height={28} className="rounded-full ring-2 ring-bg-primary z-10 bg-bg-card" />
          <Image src={`/tokens/${pool.icon1}.svg`} alt={pool.icon1} width={28} height={28} className="rounded-full ring-2 ring-bg-primary bg-bg-card" />
        </div>
        <span className="font-semibold text-white group-hover:text-ice-400 transition-colors">{pool.name}</span>
      </div>
      <div className="grid grid-cols-2 gap-2 text-sm">
        <div>
          <span className="text-text-tertiary text-xs">TVL</span>
          <div className="font-mono text-white">{pool.tvl}</div>
        </div>
        <div>
          <span className="text-text-tertiary text-xs">APR</span>
          <div className="font-mono text-success">{pool.feesAPR}</div>
        </div>
      </div>
      <div className="mt-3 flex items-center gap-1 text-xs">
        {isPositive ? (
          <ArrowUpRight className="w-3 h-3 text-success" />
        ) : (
          <ArrowDownRight className="w-3 h-3 text-danger" />
        )}
        <span className={isPositive ? "text-success" : "text-danger"}>
          {isPositive ? "+" : ""}{pool.change24h}%
        </span>
        <span className="text-text-tertiary ml-1">24h</span>
      </div>
    </Link>
  );
}

/* ── Pool Table Row ── */
function PoolRow({ pool }: { pool: PoolListItem }) {
  return (
    <Link
      href={`/pool/${pool.token0}-${pool.token1}`}
      className="grid grid-cols-2 lg:grid-cols-[1fr_100px_80px_100px_100px_80px_100px] items-center gap-4 px-4 py-4 rounded-xl hover:bg-bg-hover transition-all duration-300 group mt-2"
    >
      {/* Pair */}
      <div className="flex items-center gap-3">
        <div className="flex -space-x-3 drop-shadow-lg">
          <Image src={`/tokens/${pool.icon0}.svg`} alt={pool.icon0} width={32} height={32} className="rounded-full ring-2 ring-bg-primary z-10 bg-bg-card" />
          <Image src={`/tokens/${pool.icon1}.svg`} alt={pool.icon1} width={32} height={32} className="rounded-full ring-2 ring-bg-primary bg-bg-card" />
        </div>
        <span className="font-semibold text-white group-hover:text-ice-400 transition-colors">{pool.name}</span>
      </div>

      {/* Category */}
      <Badge variant="secondary" className="hidden lg:inline-flex w-fit bg-bg-input text-text-secondary border border-transparent group-hover:border-white/5">
        {pool.category}
      </Badge>

      {/* Fee */}
      <span className="text-sm font-mono text-success lg:text-right">
        {pool.fee}
      </span>

      {/* TVL */}
      <span className="text-sm font-mono text-white lg:text-right hidden lg:block">
        {pool.tvl}
      </span>

      {/* 24h Volume */}
      <span className="text-sm font-mono text-white lg:text-right hidden lg:block">
        {pool.volume24h}
      </span>

      {/* Fees APR */}
      <span className="text-sm font-mono text-success lg:text-right hidden lg:block">
        {pool.feesAPR}
      </span>

      {/* Action */}
      <div className="text-right mt-2 lg:mt-0 col-span-2 lg:col-span-1">
        <Button variant="secondary" size="sm" className="w-full lg:w-auto bg-ice-500 text-white hover:bg-ice-600 border-0 shadow-[0_0_15px_rgba(59,130,246,0.3)] hover:shadow-[0_0_20px_rgba(59,130,246,0.5)] transition-all">
          <span>Deposit</span>
        </Button>
      </div>
    </Link>
  );
}

/* ── Page ── */
export default function PoolPage() {
  const { data: stats, isLoading: statsLoading } = useProtocolStats();
  const { pools, trending, isLoading: poolsLoading } = usePoolList();

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 relative space-y-6">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-2xl h-[300px] bg-ice-400/5 rounded-[100%] blur-[100px] pointer-events-none -z-10" />

      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2 text-white">
          <Droplets className="w-6 h-6 text-ice-400" />
          Liquidity Pools
        </h1>
        <Button asChild className="bg-white text-black hover:bg-gray-200">
          <Link href="/pool/add">
            <Plus className="w-4 h-4 mr-1" />
            New Position
          </Link>
        </Button>
      </div>

      {/* My Positions Banner */}
      <MyPositionsBanner />

      {/* Protocol Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Value Locked"
          value={stats.tvl}
          icon={<DollarSign className="w-4 h-4" />}
          sub={<span className="text-success">+{stats.tvlChange24h}% 24h</span>}
          loading={statsLoading}
        />
        <StatCard
          label="24h Volume"
          value={stats.volume24h}
          icon={<BarChart3 className="w-4 h-4" />}
          loading={statsLoading}
        />
        <StatCard
          label="24h Fees"
          value={stats.fees24h}
          icon={<TrendingUp className="w-4 h-4" />}
          loading={statsLoading}
        />
        <StatCard
          label="Total Pools"
          value={String(stats.totalPools)}
          icon={<Droplets className="w-4 h-4" />}
          loading={statsLoading}
        />
      </div>

      {/* Trending Pools */}
      {trending.length > 0 && (
        <div>
          <h2 className="flex items-center gap-2 text-sm font-semibold text-text-secondary uppercase tracking-wider mb-3">
            <Flame className="w-4 h-4 text-warning" />
            Trending Pools
          </h2>
          <div className="flex gap-4 overflow-x-auto pb-2 snap-x snap-mandatory scrollbar-thin">
            {trending.map((pool) => (
              <TrendingPoolCard key={pool.name} pool={pool} />
            ))}
          </div>
        </div>
      )}

      {/* Pool Table */}
      <Card className="bg-bg-card/60 backdrop-blur-xl border-border shadow-xl overflow-hidden">
        <CardContent className="p-0">
          {/* Header row */}
          <div className="hidden lg:grid grid-cols-[1fr_100px_80px_100px_100px_80px_100px] gap-4 px-8 py-4 bg-bg-input/50 text-xs font-semibold text-text-secondary uppercase tracking-wider border-b border-border">
            <span>Pool Pair</span>
            <span>Category</span>
            <span className="text-right">Fee</span>
            <span className="text-right">TVL</span>
            <span className="text-right">24h Volume</span>
            <span className="text-right">APR</span>
            <span />
          </div>

          {/* Rows */}
          <div className="p-4 flex flex-col gap-1">
            {pools.map((pool) => (
              <PoolRow key={pool.name} pool={pool} />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
