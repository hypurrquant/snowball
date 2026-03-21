"use client";

import { useState } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { StakeDialog } from "./StakeDialog";
import { TOKEN_INFO, TOKENS } from "@snowball/core/src/config/addresses";
import { DEX_POOLS } from "@snowball/core/src/config/pools";
import { formatTokenAmount, formatNumber } from "@/shared/lib/utils";
import { Zap, Users, Calendar, TrendingUp } from "lucide-react";
import type { StakerIncentive } from "@/domains/defi/staker/types";
import type { Address } from "viem";

// Derive a human-readable pool name from a pool address.
// Since we can't resolve token pairs without extra on-chain calls here,
// we do a best-effort match against known token pairs from TOKEN_INFO.
function getRewardTokenSymbol(rewardToken: Address): string {
  const info =
    TOKEN_INFO[rewardToken.toLowerCase()] ?? TOKEN_INFO[rewardToken];
  return info?.symbol ?? rewardToken.slice(0, 6) + "…";
}

function getPoolLabel(poolAddress: Address): string {
  const pool = DEX_POOLS.find(
    (p) => p.poolAddress.toLowerCase() === poolAddress.toLowerCase(),
  );
  if (pool) return pool.name;
  return poolAddress.slice(0, 6) + "…" + poolAddress.slice(-4);
}

function formatDate(ts: bigint): string {
  const date = new Date(Number(ts) * 1000);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function getStatus(startTime: bigint, endTime: bigint): "active" | "starting-soon" | "ended" {
  const now = BigInt(Math.floor(Date.now() / 1000));
  if (endTime <= now) return "ended";
  if (startTime > now) return "starting-soon";
  return "active";
}

function estimateAPR(incentive: StakerIncentive): string {
  // Simple estimate: annualise remaining rewards over duration
  const now = BigInt(Math.floor(Date.now() / 1000));
  const remaining = Number(incentive.endTime - now);
  if (remaining <= 0) return "—";

  const rewardInfo = TOKEN_INFO[incentive.rewardToken.toLowerCase()] ??
    TOKEN_INFO[incentive.rewardToken];
  const priceUsd = rewardInfo?.mockPriceUsd ?? 1;
  const decimals = rewardInfo?.decimals ?? 18;

  const totalRewardHuman =
    Number(incentive.totalRewardUnclaimed) / 10 ** decimals;
  const annualRewardUsd =
    (totalRewardHuman * priceUsd * 365 * 24 * 3600) / remaining;

  // Without TVL data we can't compute real APR — show a placeholder
  if (annualRewardUsd === 0) return "—";
  return `~${formatNumber(annualRewardUsd, 0)} USD/yr`;
}

interface IncentiveCardProps {
  incentive: StakerIncentive;
  loading?: boolean;
  onStakeSuccess?: () => void;
}

export function IncentiveCard({
  incentive,
  loading,
  onStakeSuccess,
}: IncentiveCardProps) {
  const [dialogOpen, setDialogOpen] = useState(false);

  if (loading) {
    return (
      <Card className="bg-bg-card border border-border-hover/40 rounded-2xl flex flex-col h-full p-5 space-y-4">
        <div className="flex items-center gap-3">
          <Skeleton className="w-10 h-10 rounded-xl" />
          <div className="space-y-2">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-3 w-48" />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2 py-3">
          <Skeleton className="h-10 rounded" />
          <Skeleton className="h-10 rounded" />
          <Skeleton className="h-10 rounded" />
        </div>
        <Skeleton className="h-9 w-full rounded" />
      </Card>
    );
  }

  const status = getStatus(incentive.startTime, incentive.endTime);
  const rewardSymbol = getRewardTokenSymbol(incentive.rewardToken);
  const poolLabel = getPoolLabel(incentive.pool);
  const aprEstimate = estimateAPR(incentive);

  const rewardInfo =
    TOKEN_INFO[incentive.rewardToken.toLowerCase()] ??
    TOKEN_INFO[incentive.rewardToken];
  const decimals = rewardInfo?.decimals ?? 18;
  const totalRewardFormatted = formatTokenAmount(
    incentive.totalRewardUnclaimed,
    decimals,
    2,
  );

  const statusBadge = {
    active: <Badge className="bg-green-500/15 text-green-400 border-green-500/30">Active</Badge>,
    "starting-soon": <Badge className="bg-yellow-500/15 text-yellow-400 border-yellow-500/30">Starting Soon</Badge>,
    ended: <Badge variant="secondary">Ended</Badge>,
  }[status];

  return (
    <>
      <Card className="bg-bg-card border border-border-hover/40 rounded-2xl flex flex-col h-full hover:border-ice-400/30 transition-colors">
        <CardHeader className="pb-4">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-ice-500/10 flex items-center justify-center">
                <Zap className="w-5 h-5 text-ice-400" />
              </div>
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  {poolLabel}
                  {statusBadge}
                </CardTitle>
                <CardDescription className="text-sm mt-0.5">
                  Rewards in {rewardSymbol}
                </CardDescription>
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="flex-1 flex flex-col justify-end space-y-5">
          {/* Stats grid */}
          <div className="grid grid-cols-3 gap-2 py-3 border-y border-border/50">
            <div>
              <div className="text-xs text-text-tertiary mb-1 flex items-center gap-1">
                <TrendingUp className="w-3 h-3" /> Est. Annual
              </div>
              <div className="text-sm font-medium text-text-primary">
                {aprEstimate}
              </div>
            </div>

            <div>
              <div className="text-xs text-text-tertiary mb-1 flex items-center gap-1">
                <Users className="w-3 h-3" /> Stakes
              </div>
              <div className="text-sm font-medium text-text-primary">
                {incentive.numberOfStakes}
              </div>
            </div>

            <div>
              <div className="text-xs text-text-tertiary mb-1">Remaining</div>
              <div className="text-sm font-medium text-text-primary">
                {totalRewardFormatted}{" "}
                <span className="text-xs text-text-secondary">{rewardSymbol}</span>
              </div>
            </div>
          </div>

          {/* Period */}
          <div className="flex items-center gap-1.5 text-xs text-text-tertiary">
            <Calendar className="w-3 h-3 shrink-0" />
            <span>
              {formatDate(incentive.startTime)} — {formatDate(incentive.endTime)}
            </span>
          </div>

          {/* Action */}
          <Button
            className="w-full mt-2"
            disabled={status === "ended"}
            onClick={() => setDialogOpen(true)}
          >
            {status === "ended" ? "Ended" : "Stake LP NFT"}
          </Button>
        </CardContent>
      </Card>

      <StakeDialog
        incentive={incentive}
        isOpen={dialogOpen}
        onOpenChange={setDialogOpen}
        onSuccess={onStakeSuccess}
      />
    </>
  );
}
