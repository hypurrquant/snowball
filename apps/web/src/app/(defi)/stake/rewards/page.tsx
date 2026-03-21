"use client";

import { useAccount } from "wagmi";
import { Gift, Coins, CheckCircle2 } from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
} from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { TxPipelineModal } from "@/shared/components/ui/tx-pipeline-modal";
import { useTxPipeline } from "@/shared/hooks/useTxPipeline";
import { useStakerAccruedRewards } from "@/domains/defi/staker/hooks/useStakerRewards";
import { useStakerActions } from "@/domains/defi/staker/hooks/useStakerActions";
import { TOKENS, TOKEN_INFO } from "@snowball/core/src/config/addresses";
import { formatTokenAmount } from "@/shared/lib/utils";
import type { Address } from "viem";

// Known reward tokens with metadata
const REWARD_TOKENS: { address: Address; symbol: string; decimals: number; mockPriceUsd: number }[] =
  [
    {
      address: TOKENS.wCTC,
      symbol: TOKEN_INFO[TOKENS.wCTC].symbol,
      decimals: TOKEN_INFO[TOKENS.wCTC].decimals,
      mockPriceUsd: TOKEN_INFO[TOKENS.wCTC].mockPriceUsd,
    },
    {
      address: TOKENS.lstCTC,
      symbol: TOKEN_INFO[TOKENS.lstCTC].symbol,
      decimals: TOKEN_INFO[TOKENS.lstCTC].decimals,
      mockPriceUsd: TOKEN_INFO[TOKENS.lstCTC].mockPriceUsd,
    },
    {
      address: TOKENS.sbUSD,
      symbol: TOKEN_INFO[TOKENS.sbUSD].symbol,
      decimals: TOKEN_INFO[TOKENS.sbUSD].decimals,
      mockPriceUsd: TOKEN_INFO[TOKENS.sbUSD].mockPriceUsd,
    },
    {
      address: TOKENS.USDC,
      symbol: TOKEN_INFO[TOKENS.USDC].symbol,
      decimals: TOKEN_INFO[TOKENS.USDC].decimals,
      mockPriceUsd: TOKEN_INFO[TOKENS.USDC].mockPriceUsd,
    },
  ];

// Single reward row — reads accrued rewards and renders claim UI
function RewardRow({
  token,
  owner,
  onClaim,
  isPending,
}: {
  token: (typeof REWARD_TOKENS)[number];
  owner: Address;
  onClaim: (rewardToken: Address, amount: bigint) => void;
  isPending: boolean;
}) {
  const { accruedRewards, isLoading } = useStakerAccruedRewards(token.address, owner);

  const amount = accruedRewards ?? 0n;
  const hasReward = amount > 0n;
  const humanAmount = hasReward
    ? formatTokenAmount(amount, token.decimals, 6)
    : "0";
  const usdValue = hasReward
    ? (Number(amount) / 10 ** token.decimals) * token.mockPriceUsd
    : 0;

  return (
    <div className="flex items-center justify-between rounded-xl bg-bg-input p-4">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-ice-400/10">
          <Coins className="h-4 w-4 text-ice-400" />
        </div>
        <div>
          <p className="text-sm font-medium text-text-primary">{token.symbol}</p>
          {isLoading ? (
            <div className="mt-0.5 h-3.5 w-20 animate-pulse rounded bg-bg-card" />
          ) : (
            <p className="text-xs text-text-tertiary">
              {humanAmount} {token.symbol}
              {hasReward && usdValue > 0 && (
                <span className="ml-1 text-text-secondary">
                  ≈ ${usdValue.toFixed(2)}
                </span>
              )}
            </p>
          )}
        </div>
      </div>
      <Button
        size="sm"
        variant={hasReward ? "default" : "secondary"}
        disabled={isPending || !hasReward || isLoading}
        onClick={() => onClaim(token.address, amount)}
      >
        {hasReward ? (
          <>
            <Gift className="mr-1.5 h-3.5 w-3.5" />
            Claim
          </>
        ) : (
          <>
            <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
            Claimed
          </>
        )}
      </Button>
    </div>
  );
}

// Collect all accrued rewards per token to enable "Claim All"
function useAllAccruedRewards(owner: Address | undefined) {
  const r0 = useStakerAccruedRewards(TOKENS.wCTC, owner);
  const r1 = useStakerAccruedRewards(TOKENS.lstCTC, owner);
  const r2 = useStakerAccruedRewards(TOKENS.sbUSD, owner);
  const r3 = useStakerAccruedRewards(TOKENS.USDC, owner);

  const rewards = [
    { token: REWARD_TOKENS[0], amount: r0.accruedRewards ?? 0n },
    { token: REWARD_TOKENS[1], amount: r1.accruedRewards ?? 0n },
    { token: REWARD_TOKENS[2], amount: r2.accruedRewards ?? 0n },
    { token: REWARD_TOKENS[3], amount: r3.accruedRewards ?? 0n },
  ].filter((r) => r.amount > 0n);

  const isLoading = r0.isLoading || r1.isLoading || r2.isLoading || r3.isLoading;

  return { rewards, isLoading };
}

export default function RewardsPage() {
  const { address, isConnected } = useAccount();
  const pipeline = useTxPipeline();
  const { claimReward, isPending } = useStakerActions();
  const { rewards: allRewards, isLoading: isLoadingAll } = useAllAccruedRewards(address);

  const handleClaim = async (rewardToken: Address, amount: bigint) => {
    if (!address) return;
    await pipeline.run(
      [{ id: "claim", type: "claim" as const, label: "Claim Reward" }],
      {
        claim: async () => {
          const h = await claimReward(rewardToken, address, amount);
          return h as `0x${string}`;
        },
      },
    );
  };

  const handleClaimAll = async () => {
    if (!address || allRewards.length === 0) return;
    const steps = allRewards.map((r, i) => ({
      id: `claim-${i}`,
      type: "claim" as const,
      label: `Claim ${r.token.symbol}`,
    }));
    const executors = Object.fromEntries(
      allRewards.map((r, i) => [
        `claim-${i}`,
        async () => {
          const h = await claimReward(r.token.address, address, r.amount);
          return h as `0x${string}`;
        },
      ]),
    );
    await pipeline.run(steps, executors);
  };

  if (!isConnected) {
    return (
      <div className="rounded-xl border border-dashed border-border p-12 text-center">
        <Gift className="mx-auto mb-3 h-8 w-8 text-text-tertiary" />
        <p className="text-text-secondary">Connect your wallet to view rewards.</p>
      </div>
    );
  }

  const hasAnyReward = allRewards.length > 0;
  const totalUsd = allRewards.reduce(
    (sum, r) =>
      sum + (Number(r.amount) / 10 ** r.token.decimals) * r.token.mockPriceUsd,
    0,
  );

  return (
    <div className="space-y-6">
      {/* Summary */}
      <Card className="bg-bg-card/60 backdrop-blur-xl border-border">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">Accrued Rewards</CardTitle>
              <CardDescription className="text-text-tertiary">
                Rewards accumulate when you unstake from incentives
              </CardDescription>
            </div>
            {hasAnyReward && (
              <div className="text-right">
                <p className="text-lg font-semibold text-ice-400">
                  ${totalUsd.toFixed(2)}
                </p>
                <p className="text-xs text-text-tertiary">Total claimable</p>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {REWARD_TOKENS.map((token) => (
            <RewardRow
              key={token.address}
              token={token}
              owner={address!}
              onClaim={handleClaim}
              isPending={isPending}
            />
          ))}

          {hasAnyReward && (
            <Button
              className="mt-2 w-full"
              variant="default"
              disabled={isPending || isLoadingAll}
              onClick={handleClaimAll}
            >
              <Gift className="mr-2 h-4 w-4" />
              Claim All ({allRewards.length} token{allRewards.length > 1 ? "s" : ""})
            </Button>
          )}

          {!hasAnyReward && !isLoadingAll && (
            <div className="rounded-lg bg-bg-input/50 p-4 text-center text-sm text-text-tertiary">
              No rewards to claim. Stake LP NFTs and unstake to accrue rewards.
            </div>
          )}
        </CardContent>
      </Card>

      <TxPipelineModal
        open={pipeline.showTxModal}
        onClose={() => pipeline.reset()}
        steps={pipeline.txSteps}
        phase={pipeline.txPhase}
        title="Claim Rewards"
      />
    </div>
  );
}
