"use client";

import Link from "next/link";
import { TrendingUp, Landmark, Zap } from "lucide-react";
import { Card, CardContent } from "@/shared/components/ui/card";
import { Badge } from "@/shared/components/ui/badge";
import { useUnifiedSupplyMarkets } from "@/domains/defi/unified/hooks/useUnifiedSupplyMarkets";
import { formatNumber, formatTokenAmount } from "@/shared/lib/utils";
import type { UnifiedSupplyMarket } from "@/domains/defi/unified/types";

function ProtocolBadge({ protocol }: { protocol: "morpho" | "aave" }) {
  if (protocol === "morpho") {
    return (
      <Badge className="bg-ice-400/15 text-ice-400 border-ice-400/30 text-xs font-medium">
        <Landmark className="w-3 h-3 mr-1" />
        Morpho
      </Badge>
    );
  }
  return (
    <Badge className="bg-purple-500/15 text-purple-400 border-purple-500/30 text-xs font-medium">
      <Zap className="w-3 h-3 mr-1" />
      Aave
    </Badge>
  );
}

function MarketRow({ market }: { market: UnifiedSupplyMarket }) {
  const href = market.protocol === "morpho" ? "/morpho/supply" : "/aave/supply";

  return (
    <Link href={href}>
      <div className="group bg-bg-card/60 backdrop-blur-xl border border-border hover:border-ice-400/30 rounded-xl p-4 flex items-center gap-4 transition-all duration-200 cursor-pointer">
        {/* Asset icon */}
        <div className="w-10 h-10 rounded-full bg-bg-input flex items-center justify-center text-ice-400 shrink-0">
          <span className="text-sm font-bold">
            {market.assetSymbol.slice(0, 2).toUpperCase()}
          </span>
        </div>

        {/* Asset name + protocol */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-white">{market.assetSymbol}</span>
            <ProtocolBadge protocol={market.protocol} />
          </div>
          <p className="text-xs text-text-secondary mt-0.5">
            LTV {formatNumber(market.ltv, 0)}%
          </p>
        </div>

        {/* Supply APY */}
        <div className="text-right shrink-0">
          <div className="text-xs text-text-secondary mb-0.5">Supply APY</div>
          <div className="text-success font-mono font-semibold text-base">
            {formatNumber(market.supplyAPY)}%
          </div>
        </div>

        {/* Total Supply */}
        <div className="text-right shrink-0 hidden sm:block">
          <div className="text-xs text-text-secondary mb-0.5">Total Supply</div>
          <div className="font-mono text-sm text-white">
            {formatTokenAmount(market.totalSupply, market.assetDecimals, 2)}{" "}
            <span className="text-text-secondary">{market.assetSymbol}</span>
          </div>
        </div>

        {/* Arrow */}
        <div className="text-text-secondary group-hover:text-ice-400 transition-colors shrink-0 text-lg">
          →
        </div>
      </div>
    </Link>
  );
}

function SkeletonRow() {
  return (
    <div className="bg-bg-card/60 border border-border rounded-xl p-4 flex items-center gap-4 animate-pulse">
      <div className="w-10 h-10 rounded-full bg-bg-input shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-4 bg-bg-input rounded w-24" />
        <div className="h-3 bg-bg-input rounded w-16" />
      </div>
      <div className="text-right space-y-2 shrink-0">
        <div className="h-3 bg-bg-input rounded w-16" />
        <div className="h-5 bg-bg-input rounded w-14" />
      </div>
      <div className="text-right space-y-2 shrink-0 hidden sm:block">
        <div className="h-3 bg-bg-input rounded w-20" />
        <div className="h-4 bg-bg-input rounded w-24" />
      </div>
      <div className="w-4 h-4 bg-bg-input rounded shrink-0" />
    </div>
  );
}

export default function EarnSupplyPage() {
  const { markets, isLoading } = useUnifiedSupplyMarkets();

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 relative space-y-6">
      {/* Background glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-2xl h-[300px] bg-ice-400/5 rounded-[100%] blur-[100px] pointer-events-none -z-10" />

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2 text-white">
          <TrendingUp className="w-6 h-6 text-ice-400" />
          Supply Markets
        </h1>
        <p className="text-text-secondary mt-1 text-sm">
          Compare lending rates across protocols
        </p>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <Card className="bg-bg-card/60 border-border">
          <CardContent className="p-4">
            <div className="text-xs text-text-secondary mb-1">Total Markets</div>
            <div className="text-xl font-bold text-white">
              {isLoading ? "—" : markets.length}
            </div>
          </CardContent>
        </Card>
        <Card className="bg-bg-card/60 border-border">
          <CardContent className="p-4">
            <div className="text-xs text-text-secondary mb-1">Best APY</div>
            <div className="text-xl font-bold text-success font-mono">
              {isLoading || markets.length === 0
                ? "—"
                : `${formatNumber(markets[0].supplyAPY)}%`}
            </div>
          </CardContent>
        </Card>
        <Card className="bg-bg-card/60 border-border col-span-2 sm:col-span-1">
          <CardContent className="p-4">
            <div className="text-xs text-text-secondary mb-1">Protocols</div>
            <div className="flex items-center gap-2 mt-1">
              <Badge className="bg-ice-400/15 text-ice-400 border-ice-400/30 text-xs">Morpho</Badge>
              <Badge className="bg-purple-500/15 text-purple-400 border-purple-500/30 text-xs">Aave</Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Market list */}
      <div className="space-y-2">
        {isLoading ? (
          <>
            <SkeletonRow />
            <SkeletonRow />
            <SkeletonRow />
            <SkeletonRow />
          </>
        ) : markets.length === 0 ? (
          <div className="bg-bg-card/60 border border-border rounded-xl p-10 text-center">
            <p className="text-text-secondary">No supply markets available yet.</p>
          </div>
        ) : (
          markets.filter((m) => m.isActive).map((market) => (
            <MarketRow
              key={`${market.protocol}-${market.asset}`}
              market={market}
            />
          ))
        )}
      </div>
    </div>
  );
}
