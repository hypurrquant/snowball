"use client";

import { useState } from "react";
import { useAccount } from "wagmi";
import { parseUnits, type Address } from "viem";
import { Clock, Gift, AlertCircle } from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
} from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { TxPipelineModal } from "@/shared/components/ui/tx-pipeline-modal";
import { useTxPipeline } from "@/shared/hooks/useTxPipeline";
import { useTokenApproval } from "@/shared/hooks/useTokenApproval";
import { TOKENS, TOKEN_INFO, STAKER } from "@snowball/core/src/config/addresses";
import { DEX_POOLS } from "@snowball/core/src/config/pools";
import type { IncentiveKey } from "../types";

// ─── Token options ───

const TOKEN_OPTIONS: { address: Address; symbol: string; decimals: number }[] = [
  {
    address: TOKENS.wCTC,
    symbol: TOKEN_INFO[TOKENS.wCTC].symbol,
    decimals: TOKEN_INFO[TOKENS.wCTC].decimals,
  },
  {
    address: TOKENS.lstCTC,
    symbol: TOKEN_INFO[TOKENS.lstCTC].symbol,
    decimals: TOKEN_INFO[TOKENS.lstCTC].decimals,
  },
  {
    address: TOKENS.sbUSD,
    symbol: TOKEN_INFO[TOKENS.sbUSD].symbol,
    decimals: TOKEN_INFO[TOKENS.sbUSD].decimals,
  },
  {
    address: TOKENS.USDC,
    symbol: TOKEN_INFO[TOKENS.USDC].symbol,
    decimals: TOKEN_INFO[TOKENS.USDC].decimals,
  },
];

// ─── Validation ───

function validateForm(
  rewardTokenAddress: Address | "",
  poolAddress: Address | "",
  startTimeStr: string,
  endTimeStr: string,
  amountStr: string,
): string | null {
  if (!rewardTokenAddress) return "Select a reward token.";
  if (!poolAddress) return "Select a pool.";
  if (!startTimeStr) return "Enter a start time.";
  if (!endTimeStr) return "Enter an end time.";
  if (!amountStr || Number(amountStr) <= 0) return "Enter a reward amount greater than 0.";

  const now = Math.floor(Date.now() / 1000);
  const startTs = Math.floor(new Date(startTimeStr).getTime() / 1000);
  const endTs = Math.floor(new Date(endTimeStr).getTime() / 1000);

  if (startTs <= now) return "Start time must be in the future.";
  if (endTs <= startTs) return "End time must be after start time.";

  const maxStart = now + STAKER.maxIncentiveStartLeadTime;
  if (startTs > maxStart) {
    return `Start time must be within ${Math.floor(STAKER.maxIncentiveStartLeadTime / 86400)} days from now.`;
  }

  const duration = endTs - startTs;
  if (duration > STAKER.maxIncentiveDuration) {
    return `Incentive duration cannot exceed ${Math.floor(STAKER.maxIncentiveDuration / 86400)} days.`;
  }

  return null;
}

// Default start/end time strings (1 hour from now, 30 days duration)
function defaultStartTime(): string {
  const d = new Date(Date.now() + 3600 * 1000);
  d.setSeconds(0, 0);
  return d.toISOString().slice(0, 16);
}

function defaultEndTime(): string {
  const d = new Date(Date.now() + 3600 * 1000 + 30 * 86400 * 1000);
  d.setSeconds(0, 0);
  return d.toISOString().slice(0, 16);
}

// ─── Props ───

interface CreateIncentiveFormProps {
  /**
   * Called after a successful incentive creation.
   * The parent provides the createIncentive function so this component
   * remains decoupled from the specific action hook implementation.
   */
  onCreateIncentive: (key: IncentiveKey, amount: bigint) => Promise<`0x${string}`>;
  onSuccess?: () => void;
}

// ─── Component ───

export function CreateIncentiveForm({
  onCreateIncentive,
  onSuccess,
}: CreateIncentiveFormProps) {
  const { address, isConnected } = useAccount();
  const pipeline = useTxPipeline();

  const [rewardTokenAddress, setRewardTokenAddress] = useState<Address | "">("");
  const [poolAddress, setPoolAddress] = useState<Address | "">("");
  const [startTimeStr, setStartTimeStr] = useState(defaultStartTime);
  const [endTimeStr, setEndTimeStr] = useState(defaultEndTime);
  const [amountStr, setAmountStr] = useState("");

  const selectedToken = TOKEN_OPTIONS.find((t) => t.address === rewardTokenAddress);
  const parsedAmount =
    selectedToken && amountStr
      ? parseUnits(amountStr, selectedToken.decimals)
      : 0n;

  const { needsApproval, approve, isApproving } = useTokenApproval({
    token: rewardTokenAddress || undefined,
    spender: STAKER.snowballStaker,
    amount: parsedAmount,
    owner: address,
  });

  const validationError = validateForm(
    rewardTokenAddress,
    poolAddress,
    startTimeStr,
    endTimeStr,
    amountStr,
  );

  const handleSubmit = async () => {
    if (validationError || !rewardTokenAddress || !poolAddress || !address) return;

    const startTs = BigInt(Math.floor(new Date(startTimeStr).getTime() / 1000));
    const endTs = BigInt(Math.floor(new Date(endTimeStr).getTime() / 1000));

    const incentiveKey: IncentiveKey = {
      rewardToken: rewardTokenAddress,
      pool: poolAddress,
      startTime: startTs,
      endTime: endTs,
      refundee: address,
    };

    const steps: { id: string; type: "approve" | "create"; label: string }[] = [];
    if (needsApproval) {
      steps.push({ id: "approve", type: "approve", label: `Approve ${selectedToken?.symbol}` });
    }
    steps.push({ id: "create", type: "create" as const, label: "Create Incentive" });

    await pipeline.run(
      steps,
      {
        approve: async () => {
          const h = await approve(parsedAmount);
          return h as `0x${string}`;
        },
        create: async () => {
          const h = await onCreateIncentive(incentiveKey, parsedAmount);
          onSuccess?.();
          return h;
        },
      },
    );

    // Reset form on success
    if (pipeline.txPhase !== "error") {
      setAmountStr("");
      setStartTimeStr(defaultStartTime());
      setEndTimeStr(defaultEndTime());
    }
  };

  return (
    <>
      <Card className="bg-bg-card/60 backdrop-blur-xl border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Gift className="h-4 w-4 text-ice-400" />
            Create Incentive
          </CardTitle>
          <CardDescription className="text-text-tertiary">
            Fund a reward program for LP stakers on a specific pool.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Reward Token */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-text-secondary">
              Reward Token
            </label>
            <select
              className="w-full rounded-lg border border-border bg-bg-input px-3 py-2 text-sm text-text-primary outline-none focus:border-ice-400 focus:ring-1 focus:ring-ice-400"
              value={rewardTokenAddress}
              onChange={(e) => setRewardTokenAddress(e.target.value as Address | "")}
            >
              <option value="">Select token…</option>
              {TOKEN_OPTIONS.map((t) => (
                <option key={t.address} value={t.address}>
                  {t.symbol}
                </option>
              ))}
            </select>
          </div>

          {/* Pool */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-text-secondary">Pool</label>
            <select
              className="w-full rounded-lg border border-border bg-bg-input px-3 py-2 text-sm text-text-primary outline-none focus:border-ice-400 focus:ring-1 focus:ring-ice-400"
              value={poolAddress}
              onChange={(e) => setPoolAddress(e.target.value as Address | "")}
            >
              <option value="">Select pool…</option>
              {DEX_POOLS.map((p) => (
                <option key={p.poolAddress} value={p.poolAddress}>
                  {p.name} ({p.fee / 10000}%)
                </option>
              ))}
            </select>
          </div>

          {/* Time range */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="flex items-center gap-1 text-xs font-medium text-text-secondary">
                <Clock className="h-3 w-3" />
                Start Time
              </label>
              <Input
                type="datetime-local"
                value={startTimeStr}
                onChange={(e) => setStartTimeStr(e.target.value)}
                className="bg-bg-input text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <label className="flex items-center gap-1 text-xs font-medium text-text-secondary">
                <Clock className="h-3 w-3" />
                End Time
              </label>
              <Input
                type="datetime-local"
                value={endTimeStr}
                onChange={(e) => setEndTimeStr(e.target.value)}
                className="bg-bg-input text-sm"
              />
            </div>
          </div>

          {/* Amount */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-text-secondary">
              Reward Amount
            </label>
            <div className="rounded-xl bg-bg-input p-3">
              <div className="flex items-center gap-2">
                <Input
                  type="text"
                  inputMode="decimal"
                  placeholder="0.0"
                  value={amountStr}
                  onChange={(e) => setAmountStr(e.target.value)}
                  className="border-0 bg-transparent p-0 text-lg font-mono h-auto flex-1"
                />
                {selectedToken && (
                  <span className="shrink-0 text-sm font-medium text-text-secondary">
                    {selectedToken.symbol}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Validation error */}
          {validationError && amountStr !== "" && (
            <div className="flex items-start gap-2 rounded-lg bg-red-500/5 border border-red-500/20 p-2.5 text-xs text-red-400">
              <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>{validationError}</span>
            </div>
          )}

          {/* Submit */}
          <Button
            className="w-full"
            onClick={handleSubmit}
            disabled={
              !isConnected ||
              !!validationError ||
              pipeline.txPhase === "executing" ||
              isApproving
            }
          >
            <Gift className="mr-2 h-4 w-4" />
            {!isConnected
              ? "Connect Wallet"
              : needsApproval
              ? `Approve & Create Incentive`
              : "Create Incentive"}
          </Button>
        </CardContent>
      </Card>

      <TxPipelineModal
        open={pipeline.showTxModal}
        onClose={() => pipeline.reset()}
        steps={pipeline.txSteps}
        phase={pipeline.txPhase}
        title="Create Incentive"
      />
    </>
  );
}
