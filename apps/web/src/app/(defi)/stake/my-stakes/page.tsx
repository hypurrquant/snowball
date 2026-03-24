"use client";

import { useState, useEffect, useCallback } from "react";
import { useAccount, usePublicClient } from "wagmi";
import Link from "next/link";
import {
  Coins,
  ArrowUpFromLine,
  ArrowDownToLine,
  DollarSign,
  Layers,
  AlertCircle,
} from "lucide-react";
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
import { useStakerDeposits } from "@/domains/defi/staker/hooks/useStakerDeposits";
import { useStakerActions } from "@/domains/defi/staker/hooks/useStakerActions";
import { useActiveIncentives } from "@/domains/defi/staker/hooks/useActiveIncentives";
import { TOKEN_INFO, STAKER } from "@snowball/core/src/config/addresses";
import { formatTokenAmount } from "@/shared/lib/utils";
import type { IncentiveKey } from "@/domains/defi/staker/types";
import type { Address } from "viem";

// Fetch tokenIds that this user deposited into the staker by scanning DepositTransferred events
function useStakedTokenIds(owner: Address | undefined) {
  const publicClient = usePublicClient();
  const [tokenIds, setTokenIds] = useState<bigint[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetch = useCallback(async () => {
    if (!publicClient || !owner) {
      setTokenIds([]);
      return;
    }
    setIsLoading(true);
    try {
      // DepositTransferred(uint256 tokenId, address oldOwner, address newOwner)
      // Deposited = newOwner is staker, oldOwner is user
      // Withdrawn = oldOwner is staker, newOwner is user
      const depositedLogs = await publicClient.getLogs({
        address: STAKER.snowballStaker as `0x${string}`,
        event: {
          type: "event",
          name: "DepositTransferred",
          inputs: [
            { name: "tokenId", type: "uint256", indexed: true },
            { name: "oldOwner", type: "address", indexed: true },
            { name: "newOwner", type: "address", indexed: true },
          ],
        },
        args: { newOwner: STAKER.snowballStaker as `0x${string}`, oldOwner: owner },
        fromBlock: 4_436_000n,
        toBlock: "latest",
      });

      const withdrawnLogs = await publicClient.getLogs({
        address: STAKER.snowballStaker as `0x${string}`,
        event: {
          type: "event",
          name: "DepositTransferred",
          inputs: [
            { name: "tokenId", type: "uint256", indexed: true },
            { name: "oldOwner", type: "address", indexed: true },
            { name: "newOwner", type: "address", indexed: true },
          ],
        },
        args: { oldOwner: STAKER.snowballStaker as `0x${string}`, newOwner: owner },
        fromBlock: 4_436_000n,
        toBlock: "latest",
      });

      const depositedSet = new Set<string>(
        depositedLogs.map((l: any) => (l.args as { tokenId: bigint }).tokenId.toString()),
      );
      const withdrawnSet = new Set<string>(
        withdrawnLogs.map((l: any) => (l.args as { tokenId: bigint }).tokenId.toString()),
      );

      // Still staked = deposited but not withdrawn
      const staked = [...depositedSet].filter((id) => !withdrawnSet.has(id));
      setTokenIds(staked.map(BigInt));
    } catch {
      setTokenIds([]);
    } finally {
      setIsLoading(false);
    }
  }, [publicClient, owner]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { tokenIds, isLoading, refetch: fetch };
}

export default function MyStakesPage() {
  const { address, isConnected } = useAccount();
  const pipeline = useTxPipeline();

  const { tokenIds, isLoading: isLoadingTokenIds, refetch: refetchTokenIds } =
    useStakedTokenIds(address);
  const { deposits, isLoading: isLoadingDeposits, refetch: refetchDeposits } =
    useStakerDeposits(tokenIds);
  const { incentives } = useActiveIncentives();
  const { unstakeToken, collectFee, withdrawToken, isPending } = useStakerActions(() => {
    refetchTokenIds();
    refetchDeposits();
  });

  const isLoading = isLoadingTokenIds || isLoadingDeposits;

  // Find matching incentive for a deposit (by pool match — simplified)
  const getIncentiveForDeposit = (tokenId: bigint): IncentiveKey | undefined => {
    return incentives[0]
      ? {
          rewardToken: incentives[0].rewardToken,
          pool: incentives[0].pool,
          startTime: incentives[0].startTime,
          endTime: incentives[0].endTime,
          refundee: incentives[0].refundee,
        }
      : undefined;
  };

  const handleUnstake = async (tokenId: bigint) => {
    const incentiveKey = getIncentiveForDeposit(tokenId);
    if (!incentiveKey) return;
    await pipeline.run(
      [{ id: "unstake", type: "unstake" as const, label: "Unstake LP NFT" }],
      {
        unstake: async () => {
          const h = await unstakeToken(incentiveKey, tokenId);
          return h as `0x${string}`;
        },
      },
    );
  };

  const handleCollectFee = async (tokenId: bigint) => {
    if (!address) return;
    await pipeline.run(
      [{ id: "collect", type: "collect" as const, label: "Collect Fees" }],
      {
        collect: async () => {
          const h = await collectFee(tokenId, address);
          return h as `0x${string}`;
        },
      },
    );
  };

  const handleWithdraw = async (tokenId: bigint) => {
    if (!address) return;
    await pipeline.run(
      [{ id: "withdraw", type: "withdraw" as const, label: "Withdraw LP NFT" }],
      {
        withdraw: async () => {
          const h = await withdrawToken(tokenId, address);
          return h as `0x${string}`;
        },
      },
    );
  };

  if (!isConnected) {
    return (
      <div className="rounded-xl border border-dashed border-border p-12 text-center">
        <Coins className="mx-auto mb-3 h-8 w-8 text-text-tertiary" />
        <p className="text-text-secondary">Connect your wallet to view staked positions.</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[0, 1].map((i) => (
          <div
            key={i}
            className="h-32 animate-pulse rounded-xl bg-bg-card/60 border border-border"
          />
        ))}
      </div>
    );
  }

  if (deposits.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border p-12 text-center">
        <Layers className="mx-auto mb-3 h-8 w-8 text-text-tertiary" />
        <p className="mb-1 font-medium text-text-primary">No staked positions</p>
        <p className="mb-4 text-sm text-text-secondary">
          Deposit your Uniswap V3 LP NFTs to start earning incentive rewards.
        </p>
        <Button asChild variant="default" size="sm">
          <Link href="/stake">Go to Overview</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {deposits.map((deposit) => {
        const hasIncentive = !!getIncentiveForDeposit(deposit.tokenId);
        return (
          <Card
            key={deposit.tokenId.toString()}
            className="bg-bg-card/60 backdrop-blur-xl border-border"
          >
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-semibold">
                  LP NFT #{deposit.tokenId.toString()}
                </CardTitle>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                    deposit.numberOfStakes > 0
                      ? "bg-green-500/10 text-green-400"
                      : "bg-yellow-500/10 text-yellow-400"
                  }`}
                >
                  {deposit.numberOfStakes > 0
                    ? `${deposit.numberOfStakes} active stake${deposit.numberOfStakes > 1 ? "s" : ""}`
                    : "No active stakes"}
                </span>
              </div>
              <CardDescription className="text-xs text-text-tertiary">
                Tick range: [{deposit.tickLower}, {deposit.tickUpper}]
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!hasIncentive && deposit.numberOfStakes > 0 && (
                <div className="mb-3 flex items-start gap-2 rounded-lg bg-yellow-500/5 border border-yellow-500/20 p-2.5 text-xs text-yellow-400">
                  <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  <span>No matching active incentive found to unstake from.</span>
                </div>
              )}
              <div className="flex flex-wrap gap-2">
                {deposit.numberOfStakes > 0 && (
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={isPending || !hasIncentive}
                    onClick={() => handleUnstake(deposit.tokenId)}
                  >
                    <ArrowUpFromLine className="mr-1.5 h-3.5 w-3.5" />
                    Unstake
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={isPending}
                  onClick={() => handleCollectFee(deposit.tokenId)}
                >
                  <DollarSign className="mr-1.5 h-3.5 w-3.5" />
                  Collect Fee
                </Button>
                {deposit.numberOfStakes === 0 && (
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={isPending}
                    onClick={() => handleWithdraw(deposit.tokenId)}
                  >
                    <ArrowDownToLine className="mr-1.5 h-3.5 w-3.5" />
                    Withdraw NFT
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}

      <TxPipelineModal
        open={pipeline.showTxModal}
        onClose={() => pipeline.reset()}
        steps={pipeline.txSteps}
        phase={pipeline.txPhase}
        title="My Stakes"
      />
    </div>
  );
}
