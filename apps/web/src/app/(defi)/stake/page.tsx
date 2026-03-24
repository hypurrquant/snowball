"use client";

import { useState, useEffect } from "react";
import { useAccount } from "wagmi";
import { StatCard } from "@/shared/components/common/StatCard";
import { StakeDialog } from "@/domains/defi/staker/components/StakeDialog";
import { CreateIncentiveForm } from "@/domains/defi/staker/components/CreateIncentiveForm";
import { useActiveIncentives } from "@/domains/defi/staker/hooks/useActiveIncentives";
import { useStakerActions } from "@/domains/defi/staker/hooks/useStakerActions";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { TOKEN_INFO } from "@snowball/core/src/config/addresses";
import { DEX_POOLS } from "@snowball/core/src/config/pools";
import { formatTokenAmount, formatNumber } from "@/shared/lib/utils";
import { Zap, Users, Lock, ChevronDown, ChevronUp, Megaphone } from "lucide-react";
import type { StakerIncentive } from "@/domains/defi/staker/types";
import type { Address } from "viem";

// ─── Pool TVL from server API ───

interface PoolData {
  poolAddress: string;
  tvlUsd: number;
}

function usePoolTvl() {
  const [pools, setPools] = useState<PoolData[]>([]);
  useEffect(() => {
    fetch("/api/pools")
      .then((r) => r.json())
      .then((res) => setPools(res.data ?? []))
      .catch(() => {});
  }, []);
  return pools;
}

function getPoolName(poolAddress: Address): string {
  const pool = DEX_POOLS.find(
    (p) => p.poolAddress.toLowerCase() === poolAddress.toLowerCase(),
  );
  return pool?.name ?? `${poolAddress.slice(0, 6)}…${poolAddress.slice(-4)}`;
}

function getRewardSymbol(rewardToken: Address): string {
  const info = TOKEN_INFO[rewardToken.toLowerCase()] ?? TOKEN_INFO[rewardToken];
  return info?.symbol ?? `${rewardToken.slice(0, 6)}…`;
}

function getStatus(startTime: bigint, endTime: bigint): "active" | "starting-soon" | "ended" {
  const now = BigInt(Math.floor(Date.now() / 1000));
  if (endTime <= now) return "ended";
  if (startTime > now) return "starting-soon";
  return "active";
}

function formatDate(ts: bigint): string {
  return new Date(Number(ts) * 1000).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function estimateAPY(incentive: StakerIncentive, poolTvl: number | undefined): string {
  const now = BigInt(Math.floor(Date.now() / 1000));
  const remaining = Number(incentive.endTime - now);
  if (remaining <= 0) return "—";
  const info = TOKEN_INFO[incentive.rewardToken.toLowerCase()] ?? TOKEN_INFO[incentive.rewardToken];
  const price = info?.mockPriceUsd ?? 1;
  const decimals = info?.decimals ?? 18;
  const rewardHuman = Number(incentive.totalRewardUnclaimed) / 10 ** decimals;
  const annualRewardUsd = (rewardHuman * price * 365 * 24 * 3600) / remaining;
  if (annualRewardUsd === 0) return "—";
  if (poolTvl && poolTvl > 0) {
    const apy = (annualRewardUsd / poolTvl) * 100;
    return `${formatNumber(apy, 1)}%`;
  }
  return `$${formatNumber(annualRewardUsd, 0)}/yr`;
}

export default function StakePage() {
  const { isConnected } = useAccount();
  const { incentives, isLoading, refetch } = useActiveIncentives();
  const { createIncentive } = useStakerActions(refetch);
  const poolTvlData = usePoolTvl();
  const [bribeOpen, setBribeOpen] = useState(false);
  const [stakeTarget, setStakeTarget] = useState<StakerIncentive | null>(null);

  const activeCount = incentives.length;
  const totalStakers = incentives.reduce((sum, inc) => sum + inc.numberOfStakes, 0);
  const totalTvl = poolTvlData.reduce((sum, p) => sum + p.tvlUsd, 0);

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard
          label="Total TVL"
          value={totalTvl > 0 ? `$${formatNumber(totalTvl, 0)}` : "—"}
          sub="across all pools"
          icon={<Lock className="w-4 h-4" />}
          loading={isLoading}
        />
        <StatCard
          label="Active Incentives"
          value={isLoading ? "—" : String(activeCount)}
          sub="reward programs"
          icon={<Zap className="w-4 h-4" />}
          loading={isLoading}
        />
        <StatCard
          label="Total Stakers"
          value={isLoading ? "—" : String(totalStakers)}
          sub="across all incentives"
          icon={<Users className="w-4 h-4" />}
          loading={isLoading}
        />
      </div>

      {/* Incentive Table */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-text-primary">Active Incentives</h2>
          <span className="text-xs text-text-tertiary">Stake LP NFTs to earn rewards</span>
        </div>

        {!isConnected ? (
          <div className="rounded-xl border border-dashed border-border/60 p-8 text-center">
            <Zap className="mx-auto mb-3 h-8 w-8 text-text-tertiary" />
            <p className="text-sm text-text-secondary">
              Connect your wallet to view active incentives and stake your LP positions.
            </p>
          </div>
        ) : isLoading ? (
          <div className="rounded-xl border border-border bg-bg-card/60 backdrop-blur-xl overflow-hidden">
            <div className="p-4 space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-14 w-full rounded-lg" />
              ))}
            </div>
          </div>
        ) : incentives.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border/60 p-10 text-center">
            <Zap className="mx-auto mb-3 h-8 w-8 text-text-tertiary" />
            <p className="text-sm font-medium text-text-secondary">No active incentives</p>
            <p className="mt-1 text-xs text-text-tertiary">
              Incentive programs will appear here when created on-chain.
            </p>
          </div>
        ) : (
          <div className="rounded-xl border border-border bg-bg-card/60 backdrop-blur-xl overflow-hidden">
            <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b border-border text-text-tertiary text-left">
                  <th className="py-3 px-4 font-medium">Pool</th>
                  <th className="py-3 px-4 font-medium">Reward</th>
                  <th className="py-3 px-4 font-medium text-right">APY</th>
                  <th className="py-3 px-4 font-medium text-right">Remaining</th>
                  <th className="py-3 px-4 font-medium text-right">Stakes</th>
                  <th className="py-3 px-4 font-medium">Period</th>
                  <th className="py-3 px-4 font-medium text-center">Status</th>
                  <th className="py-3 px-4 font-medium text-right"></th>
                </tr>
              </thead>
              <tbody>
                {incentives.map((inc) => {
                  const status = getStatus(inc.startTime, inc.endTime);
                  const rewardSymbol = getRewardSymbol(inc.rewardToken);
                  const info = TOKEN_INFO[inc.rewardToken.toLowerCase()] ?? TOKEN_INFO[inc.rewardToken];
                  const decimals = info?.decimals ?? 18;
                  const matchedPool = poolTvlData.find(
                    (p) => p.poolAddress.toLowerCase() === inc.pool.toLowerCase(),
                  );
                  const tvl = matchedPool?.tvlUsd;

                  return (
                    <tr
                      key={inc.id}
                      className="border-b border-border/50 hover:bg-bg-input/30 transition-colors"
                    >
                      {/* Pool */}
                      <td className="py-3 px-4">
                        <span className="font-medium text-white">{getPoolName(inc.pool)}</span>
                      </td>

                      {/* Reward Token */}
                      <td className="py-3 px-4">
                        <Badge className="bg-ice-400/15 text-ice-400 border-ice-400/30 text-xs">
                          {rewardSymbol}
                        </Badge>
                      </td>

                      {/* Est. Annual */}
                      <td className="py-3 px-4 text-right font-mono text-ice-400">
                        {estimateAPY(inc, tvl)}
                      </td>

                      {/* Remaining */}
                      <td className="py-3 px-4 text-right font-mono text-white">
                        {formatTokenAmount(inc.totalRewardUnclaimed, decimals, 2)}{" "}
                        <span className="text-text-tertiary text-xs">{rewardSymbol}</span>
                      </td>

                      {/* Stakes */}
                      <td className="py-3 px-4 text-right text-text-secondary">
                        {inc.numberOfStakes}
                      </td>

                      {/* Period */}
                      <td className="py-3 px-4 text-xs text-text-tertiary whitespace-nowrap">
                        {formatDate(inc.startTime)} — {formatDate(inc.endTime)}
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4 text-center">
                        {status === "active" && (
                          <Badge className="bg-green-500/15 text-green-400 border-green-500/30 text-xs">Active</Badge>
                        )}
                        {status === "starting-soon" && (
                          <Badge className="bg-yellow-500/15 text-yellow-400 border-yellow-500/30 text-xs">Soon</Badge>
                        )}
                        {status === "ended" && (
                          <Badge variant="secondary" className="text-xs">Ended</Badge>
                        )}
                      </td>

                      {/* Action */}
                      <td className="py-3 px-4 text-right">
                        <Button
                          size="sm"
                          disabled={status === "ended"}
                          onClick={() => setStakeTarget(inc)}
                        >
                          Stake
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            </div>
          </div>
        )}
      </section>

      {/* Bribe — footer section */}
      {isConnected && (
        <section className="border-t border-border/30 pt-6">
          <button
            onClick={() => setBribeOpen(!bribeOpen)}
            className="flex w-full items-center justify-between rounded-xl bg-bg-card/40 border border-border/40 px-5 py-4 hover:border-ice-400/20 transition-colors"
          >
            <div className="flex items-center gap-3">
              <Megaphone className="h-5 w-5 text-ice-400" />
              <div className="text-left">
                <p className="text-sm font-medium text-text-primary">Bribe</p>
                <p className="text-xs text-text-tertiary">
                  Add rewards to any pool to attract liquidity
                </p>
              </div>
            </div>
            {bribeOpen ? (
              <ChevronUp className="h-4 w-4 text-text-tertiary" />
            ) : (
              <ChevronDown className="h-4 w-4 text-text-tertiary" />
            )}
          </button>

          {bribeOpen && (
            <div className="mt-4 rounded-xl border border-border/40 bg-bg-card/30 p-5">
              <CreateIncentiveForm onCreateIncentive={createIncentive} onSuccess={refetch} />
            </div>
          )}
        </section>
      )}

      {/* Stake Dialog */}
      {stakeTarget && (
        <StakeDialog
          incentive={stakeTarget}
          isOpen={!!stakeTarget}
          onOpenChange={(open) => { if (!open) setStakeTarget(null); }}
          onSuccess={refetch}
        />
      )}
    </div>
  );
}
