"use client";

import { StatCard } from "@/shared/components/common/StatCard";
import { DollarSign, Droplets, Coins } from "lucide-react";

interface LPPortfolioSummaryProps {
  totalValueUsd: number;
  positionCount: number;
  totalFeesUsd: number;
  isLoading?: boolean;
}

function formatUsd(value: number): string {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(2)}K`;
  return `$${value.toFixed(2)}`;
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
        value={formatUsd(totalValueUsd)}
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
        value={formatUsd(totalFeesUsd)}
        icon={<Coins className="w-4 h-4" />}
        loading={isLoading}
      />
    </div>
  );
}
