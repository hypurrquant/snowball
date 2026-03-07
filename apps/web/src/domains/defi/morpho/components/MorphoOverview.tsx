"use client";

import { useMorphoMarkets } from "../hooks/useMorphoMarkets";
import { formatTokenAmount, formatNumber } from "@/shared/lib/utils";
import { Landmark, TrendingUp, Activity, Shield } from "lucide-react";

function MetricBlock({
  label,
  value,
  sub,
  accent,
  icon,
}: {
  label: string;
  value: string;
  sub?: string;
  accent: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-1.5 text-xs text-text-tertiary">
        <span className={accent}>{icon}</span>
        {label}
      </div>
      <div className="text-lg font-bold text-white font-mono">{value}</div>
      {sub && <div className="text-xs text-text-secondary">{sub}</div>}
    </div>
  );
}

function UtilizationRing({ percent, size = 48 }: { percent: number; size?: number }) {
  const r = (size - 6) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (circ * Math.min(percent, 100)) / 100;
  const color =
    percent > 80 ? "stroke-red-400" : percent > 50 ? "stroke-amber-400" : "stroke-emerald-400";

  return (
    <svg width={size} height={size} className="-rotate-90">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="currentColor" strokeWidth={4} className="text-white/5" />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        strokeWidth={4}
        strokeLinecap="round"
        strokeDasharray={circ}
        strokeDashoffset={offset}
        className={`${color} transition-all duration-700`}
      />
    </svg>
  );
}

function MarketTile({ market }: { market: ReturnType<typeof useMorphoMarkets>["markets"][number] }) {
  const available = market.totalSupply - market.totalBorrow;

  return (
    <div className="relative group rounded-xl bg-white/[0.02] border border-white/[0.06] p-4 hover:border-ice-400/20 transition-all duration-300">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <span className="font-semibold text-sm text-white">{market.name}</span>
        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/5 text-text-tertiary">
          LLTV {formatNumber(Number(market.lltv) / 1e16)}%
        </span>
      </div>

      {/* Utilization ring + rates */}
      <div className="flex items-center gap-4">
        <div className="relative flex-shrink-0">
          <UtilizationRing percent={market.utilization} />
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-[10px] font-mono font-bold text-white">
              {formatNumber(market.utilization)}%
            </span>
          </div>
        </div>

        <div className="flex-1 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-text-tertiary">Supply APY</span>
            <span className="text-xs font-mono text-emerald-400">{formatNumber(market.supplyAPY)}%</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-text-tertiary">Borrow APR</span>
            <span className="text-xs font-mono text-amber-400">{formatNumber(market.borrowAPR)}%</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-text-tertiary">Available</span>
            <span className="text-xs font-mono text-white">{formatTokenAmount(available, 18, 1)}</span>
          </div>
        </div>
      </div>

      {/* Supply/Borrow stacked bar */}
      <div className="mt-3 h-1.5 rounded-full bg-white/5 overflow-hidden flex">
        {market.totalSupply > 0n && (
          <>
            <div
              className="h-full bg-ice-400/60 transition-all duration-700"
              style={{ width: `${100 - market.utilization}%` }}
            />
            <div
              className="h-full bg-amber-400/60 transition-all duration-700"
              style={{ width: `${market.utilization}%` }}
            />
          </>
        )}
      </div>
    </div>
  );
}

function OverviewSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="rounded-2xl bg-bg-card border border-border p-6 h-[140px]" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="rounded-xl bg-bg-card border border-border h-[130px]" />
        ))}
      </div>
    </div>
  );
}

export function MorphoOverview() {
  const { markets, isLoading } = useMorphoMarkets();

  if (isLoading) return <OverviewSkeleton />;

  const totalSupply = markets.reduce((sum, m) => sum + m.totalSupply, 0n);
  const totalBorrow = markets.reduce((sum, m) => sum + m.totalBorrow, 0n);
  const avgUtilization =
    markets.length > 0
      ? markets.reduce((sum, m) => sum + m.utilization, 0) / markets.length
      : 0;
  const bestSupplyAPY = markets.length > 0 ? Math.max(...markets.map((m) => m.supplyAPY)) : 0;

  const supplyNum = Number(totalSupply);
  const borrowNum = Number(totalBorrow);
  const borrowRatio = supplyNum > 0 ? (borrowNum / supplyNum) * 100 : 0;

  return (
    <div className="space-y-4">
      {/* Protocol Banner */}
      <div className="relative overflow-hidden rounded-2xl border border-white/[0.06] bg-gradient-to-br from-bg-card via-bg-card to-ice-950/30 p-6">
        {/* Decorative glow */}
        <div className="absolute -top-20 -right-20 w-60 h-60 bg-ice-500/[0.07] rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-violet-500/[0.04] rounded-full blur-3xl pointer-events-none" />

        <div className="relative">
          {/* Metrics row */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            <MetricBlock
              icon={<Landmark className="w-3.5 h-3.5" />}
              label="Total Supplied"
              value={formatTokenAmount(totalSupply, 18, 1)}
              accent="text-ice-400"
            />
            <MetricBlock
              icon={<TrendingUp className="w-3.5 h-3.5" />}
              label="Total Borrowed"
              value={formatTokenAmount(totalBorrow, 18, 1)}
              accent="text-amber-400"
            />
            <MetricBlock
              icon={<Activity className="w-3.5 h-3.5" />}
              label="Avg Utilization"
              value={`${formatNumber(avgUtilization)}%`}
              accent="text-emerald-400"
            />
            <MetricBlock
              icon={<Shield className="w-3.5 h-3.5" />}
              label="Best Supply APY"
              value={`${formatNumber(bestSupplyAPY)}%`}
              accent="text-violet-400"
            />
          </div>

          {/* Supply/Borrow ratio bar */}
          <div className="mt-5 space-y-1.5">
            <div className="flex justify-between text-[11px] text-text-tertiary">
              <span>Protocol Liquidity</span>
              <span className="font-mono">{formatNumber(borrowRatio)}% utilized</span>
            </div>
            <div className="h-2.5 rounded-full bg-white/[0.04] overflow-hidden flex">
              <div
                className="h-full bg-gradient-to-r from-ice-400/80 to-ice-500/80 rounded-l-full transition-all duration-700"
                style={{ width: `${Math.max(100 - borrowRatio, 0)}%` }}
              />
              {borrowRatio > 0 && (
                <div
                  className="h-full bg-gradient-to-r from-amber-400/80 to-amber-500/80 rounded-r-full transition-all duration-700"
                  style={{ width: `${borrowRatio}%` }}
                />
              )}
            </div>
            <div className="flex justify-between text-[10px]">
              <span className="text-ice-400 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-ice-400 inline-block" />
                Available
              </span>
              <span className="text-amber-400 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block" />
                Borrowed
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Per-market tiles */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {markets.map((m) => (
          <MarketTile key={m.id} market={m} />
        ))}
      </div>
    </div>
  );
}
