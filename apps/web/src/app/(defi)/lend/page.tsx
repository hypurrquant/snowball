"use client";

import Link from "next/link";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/common/StatCard";
import { useLendMarkets } from "@/hooks/defi/useLendMarkets";
import { formatTokenAmount, formatNumber } from "@/lib/utils";
import { Landmark, TrendingUp, Percent, DollarSign } from "lucide-react";

export default function LendPage() {
  const { markets, isLoading } = useLendMarkets();

  const totalSupply = markets.reduce((acc, m) => acc + m.totalSupply, 0n);
  const totalBorrow = markets.reduce((acc, m) => acc + m.totalBorrow, 0n);

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Supply"
          value={formatTokenAmount(totalSupply, 18, 2)}
          icon={<DollarSign className="w-5 h-5 text-[#3b82f6]" />}
          loading={isLoading}
        />
        <StatCard
          label="Total Borrow"
          value={formatTokenAmount(totalBorrow, 18, 2)}
          icon={<TrendingUp className="w-5 h-5 text-[#60a5fa]" />}
          loading={isLoading}
        />
        <StatCard
          label="Markets"
          value={String(markets.length)}
          icon={<Landmark className="w-5 h-5 text-[#93c5fd]" />}
          loading={isLoading}
        />
        <StatCard
          label="Avg. Utilization"
          value={
            markets.length > 0
              ? `${formatNumber(
                markets.reduce((acc, m) => acc + m.utilization, 0) /
                markets.length
              )}%`
              : "—"
          }
          icon={<Percent className="w-5 h-5 text-[#3b82f6]" />}
          loading={isLoading}
        />
      </div>

      <div className="flex items-center justify-between mb-2">
        <h2 className="text-xl font-bold flex items-center gap-2 text-white">
          <Landmark className="w-5 h-5 text-[#60a5fa]" />
          Lending Markets
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {markets.map((m) => (
          <Link
            key={m.id}
            href={`/lend/markets?id=${m.id}`}
            className="block group"
          >
            <Card className="bg-[#141525]/60 backdrop-blur-xl border-[#1F2037] hover:border-[#60a5fa]/30 transition-all duration-300 group-hover:-translate-y-1 group-hover:shadow-[0_8px_32px_rgba(96,165,250,0.15)] h-full">
              <CardContent className="p-5 flex flex-col h-full gap-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[#1C1D30] flex items-center justify-center text-[#60a5fa]">
                      <Landmark className="w-5 h-5" />
                    </div>
                    <span className="font-semibold text-lg text-white group-hover:text-[#60a5fa] transition-colors">{m.name}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 bg-[#1C1D30]/50 rounded-xl p-3 border border-transparent group-hover:border-white/5 transition-colors">
                  <div>
                    <div className="text-xs text-[#8B8D97] mb-1">Supply APY</div>
                    <div className="text-[#22c55e] font-mono font-medium">{formatNumber(m.supplyAPY)}%</div>
                  </div>
                  <div>
                    <div className="text-xs text-[#8B8D97] mb-1">Borrow APR</div>
                    <div className="text-[#eab308] font-mono font-medium">{formatNumber(m.borrowAPR)}%</div>
                  </div>
                </div>

                <div className="mt-auto space-y-2 pt-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-[#8B8D97]">Utilization</span>
                    <span className="font-mono text-white">{formatNumber(m.utilization)}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-[#1C1D30] overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-[#60a5fa] to-[#3b82f6] rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(100, Math.max(0, m.utilization))}%` }}
                    />
                  </div>

                  <div className="flex justify-between text-xs pt-1 border-t border-[#1F2037] mt-3 pt-3">
                    <span className="text-[#8B8D97]">Available to borrow</span>
                    <span className="font-mono text-[#F5F5F7]">
                      ${formatTokenAmount(m.totalSupply - m.totalBorrow, 18, 2)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
