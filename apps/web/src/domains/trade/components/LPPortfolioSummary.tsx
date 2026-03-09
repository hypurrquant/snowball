"use client";

import { StatCard } from "@/shared/components/common/StatCard";
import { DollarSign, Droplets, Coins } from "lucide-react";
import { formatUsdCompact } from "@/shared/lib/utils";

interface LPPortfolioSummaryProps {
  totalValueUsd: number;
  positionCount: number;
  totalFeesUsd: number;
  isLoading?: boolean;
}

export function LPPortfolioSummary({
  totalValueUsd,
  positionCount,
  totalFeesUsd,
  isLoading,
}: LPPortfolioSummaryProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <StatCard
        label="Total Net Value"
        value={formatUsdCompact(totalValueUsd)}
        icon={<DollarSign className="w-4 h-4" />}
        loading={isLoading}
      />
      <StatCard
        label="Active Positions"
        value={String(positionCount)}
        icon={<Droplets className="w-4 h-4" />}
        loading={isLoading}
      />
      <StatCard
        label="Uncollected Fees"
        value={formatUsdCompact(totalFeesUsd)}
        icon={<Coins className="w-4 h-4" />}
        loading={isLoading}
      />
    </div>
  );
}
