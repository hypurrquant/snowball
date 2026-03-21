"use client";

import { useState, useEffect } from "react";
import { useAccount } from "wagmi";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/shared/components/ui/dialog";
import { Button } from "@/shared/components/ui/button";
import { TxPipelineModal } from "@/shared/components/ui/tx-pipeline-modal";
import { useTxPipeline } from "@/shared/hooks/useTxPipeline";
import { useStakerActions } from "@/domains/defi/staker/hooks/useStakerActions";
import { useUserPositions } from "@/domains/trade/hooks/useUserPositions";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { formatNumber } from "@/shared/lib/utils";
import { Layers, CheckCircle2, AlertCircle } from "lucide-react";
import { cn } from "@/shared/lib/utils";
import type { StakerIncentive, IncentiveKey } from "@/domains/defi/staker/types";

interface StakeDialogProps {
  incentive: StakerIncentive;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function StakeDialog({
  incentive,
  isOpen,
  onOpenChange,
  onSuccess,
}: StakeDialogProps) {
  const { address, isConnected } = useAccount();
  const [selectedTokenId, setSelectedTokenId] = useState<bigint | null>(null);

  const { positions, isLoading: isPositionsLoading } = useUserPositions(address);

  // Filter to positions matching this incentive's pool
  const eligiblePositions = positions.filter(
    (p) => {
      // A position matches the pool if its token pair matches — we can't easily
      // match by pool address here without additional resolution, so show all
      // unstaked positions (liquidity > 0 already filtered by useUserPositions)
      return p.liquidity > 0n;
    },
  );

  const pipeline = useTxPipeline();
  const { depositAndStake, isPending } = useStakerActions(onSuccess);

  // Reset selection when dialog opens
  useEffect(() => {
    if (isOpen) {
      setSelectedTokenId(null);
    }
  }, [isOpen]);

  const incentiveKey: IncentiveKey = {
    rewardToken: incentive.rewardToken,
    pool: incentive.pool,
    startTime: incentive.startTime,
    endTime: incentive.endTime,
    refundee: incentive.refundee,
  };

  const handleStake = async () => {
    if (!selectedTokenId) return;
    await pipeline.run(
      [{ id: "stake", type: "deposit" as const, label: "Stake LP NFT" }],
      {
        stake: async () => {
          return await depositAndStake(selectedTokenId, [incentiveKey]);
        },
      },
      { type: "stability-deposit" },
    );
  };

  const canStake = !!selectedTokenId && isConnected && !isPending;

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md bg-bg-card border-border">
          <DialogHeader>
            <DialogTitle>Stake LP NFT</DialogTitle>
            <DialogDescription>
              Select an LP position to stake into this incentive and earn rewards.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            {/* Position List */}
            {isPositionsLoading ? (
              <div className="space-y-2">
                {[1, 2].map((i) => (
                  <Skeleton key={i} className="h-16 w-full rounded-xl" />
                ))}
              </div>
            ) : eligiblePositions.length === 0 ? (
              <div className="rounded-xl border border-border/50 bg-bg-secondary p-6 text-center">
                <AlertCircle className="mx-auto mb-2 h-8 w-8 text-text-tertiary" />
                <p className="text-sm text-text-secondary">
                  No LP positions found in your wallet.
                </p>
                <p className="mt-1 text-xs text-text-tertiary">
                  Add liquidity to a pool first to get an LP NFT.
                </p>
              </div>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {eligiblePositions.map((pos) => {
                  const isSelected = selectedTokenId === pos.tokenId;
                  return (
                    <button
                      key={pos.tokenId.toString()}
                      onClick={() => setSelectedTokenId(pos.tokenId)}
                      className={cn(
                        "w-full rounded-xl border p-3 text-left transition-all",
                        isSelected
                          ? "border-ice-400/60 bg-ice-400/5"
                          : "border-border/50 bg-bg-secondary hover:border-ice-400/30 hover:bg-bg-hover",
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-ice-500/10">
                            <Layers className="h-4 w-4 text-ice-400" />
                          </div>
                          <div>
                            <div className="text-sm font-medium text-text-primary">
                              #{pos.tokenId.toString()} — {pos.token0Symbol}/{pos.token1Symbol}
                            </div>
                            <div className="text-xs text-text-tertiary">
                              {pos.fee / 10000}% fee •{" "}
                              {pos.isInRange ? (
                                <span className="text-green-400">In Range</span>
                              ) : (
                                <span className="text-yellow-400">Out of Range</span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-medium text-text-primary">
                            ${formatNumber(pos.valueUsd)}
                          </div>
                          {isSelected && (
                            <CheckCircle2 className="ml-auto mt-0.5 h-4 w-4 text-ice-400" />
                          )}
                        </div>
                      </div>

                      {/* Tick range */}
                      <div className="mt-2 flex gap-3 text-xs text-text-tertiary">
                        <span>Lower: {pos.tickLower}</span>
                        <span>Upper: {pos.tickUpper}</span>
                        <span>
                          Liquidity: {pos.liquidity.toString().slice(0, 8)}…
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Selected summary */}
            {selectedTokenId && (
              <div className="rounded-lg bg-bg-secondary p-3 flex items-center justify-between text-sm">
                <span className="text-text-secondary">Selected NFT</span>
                <span className="font-mono text-text-primary">
                  #{selectedTokenId.toString()}
                </span>
              </div>
            )}

            <Button
              className="w-full"
              onClick={handleStake}
              disabled={!canStake || eligiblePositions.length === 0}
            >
              {!isConnected
                ? "Connect Wallet"
                : !selectedTokenId
                ? "Select a Position"
                : "Stake LP NFT"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <TxPipelineModal
        open={pipeline.showTxModal}
        onClose={() => {
          if (pipeline.txPhase === "complete") onOpenChange(false);
          pipeline.reset();
        }}
        steps={pipeline.txSteps}
        phase={pipeline.txPhase}
        title="Stake LP NFT"
      />
    </>
  );
}
