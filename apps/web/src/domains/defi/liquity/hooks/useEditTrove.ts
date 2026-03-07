"use client";

import { useState, useMemo, useCallback } from "react";
import { parseEther, formatEther } from "viem";
import type { Address } from "viem";
import { useTroveActions, ETH_GAS_COMPENSATION } from "./useTroveActions";
import { useLiquityBranch } from "./useLiquityBranch";
import { usePositionPreview } from "./usePositionPreview";
import { useMarketRateStats } from "./useMarketRateStats";
import { useTokenBalance } from "@/shared/hooks/useTokenBalance";
import { TOKENS } from "@/core/config/addresses";
import type { TroveData } from "../types";
import type { TxStep, TxPhase } from "@/shared/types/tx";

const MIN_DEBT = 10;

export function useEditTrove(
  branch: "wCTC" | "lstCTC",
  trove: TroveData,
  address?: Address,
) {
  const collToken = branch === "wCTC" ? TOKENS.wCTC : TOKENS.lstCTC;
  const { data: collBalance } = useTokenBalance({ address, token: collToken });
  const collBalanceValue = collBalance?.value ?? 0n;

  const { stats, isLoading: statsLoading } = useLiquityBranch(branch);
  const marketStats = useMarketRateStats(branch);

  // Pre-fill from existing trove
  const existingCollStr = Number(formatEther(trove.coll)).toFixed(6);
  const existingDebtStr = Number(formatEther(trove.debt)).toFixed(2);
  const existingRatePct = Number(trove.interestRate) / 1e16;

  const [collAmount, setCollAmount] = useState(existingCollStr);
  const [debtAmount, setDebtAmount] = useState(existingDebtStr);
  const [ratePercent, setRatePercent] = useState(existingRatePct);

  const collDeltaForApproval = useMemo(() => {
    try {
      const parsed = collAmount ? parseEther(collAmount) : 0n;
      const diff = parsed - trove.coll;
      return diff > 0n ? diff : undefined;
    } catch { return undefined; }
  }, [collAmount, trove.coll]);

  const {
    approveCollateral,
    adjustTrove,
    adjustInterestRate,
    needsApproval,
  } = useTroveActions(branch, address, collDeltaForApproval);

  // Parse current input values
  const parsedColl = useMemo(() => {
    try { return collAmount ? parseEther(collAmount) : 0n; } catch { return 0n; }
  }, [collAmount]);
  const parsedDebt = useMemo(() => {
    try { return debtAmount ? parseEther(debtAmount) : 0n; } catch { return 0n; }
  }, [debtAmount]);
  const parsedRate = useMemo(() => parseEther(String(ratePercent / 100)), [ratePercent]);

  // Delta calculations
  const collDelta = useMemo(() => {
    const diff = parsedColl - trove.coll;
    if (diff > 0n) return { amount: diff, isIncrease: true };
    if (diff < 0n) return { amount: -diff, isIncrease: false };
    return { amount: 0n, isIncrease: true };
  }, [parsedColl, trove.coll]);

  const debtDelta = useMemo(() => {
    const diff = parsedDebt - trove.debt;
    if (diff > 0n) return { amount: diff, isIncrease: true };
    if (diff < 0n) return { amount: -diff, isIncrease: false };
    return { amount: 0n, isIncrease: true };
  }, [parsedDebt, trove.debt]);

  const rateChanged = useMemo(
    () => Math.abs(ratePercent - existingRatePct) > 0.01,
    [ratePercent, existingRatePct],
  );

  const hasCollDebtChange = collDelta.amount > 0n || debtDelta.amount > 0n;
  const hasAnyChange = hasCollDebtChange || rateChanged;

  // Preview with new absolute values
  const preview = usePositionPreview({
    coll: parsedColl,
    debt: parsedDebt,
    rate: parsedRate,
    price: stats.price,
    mcr: stats.mcr,
    ccr: stats.ccr,
  });

  // Derived
  const collPrice = stats.price > 0n ? Number(formatEther(stats.price)) : 0;
  const collNum = parseFloat(collAmount) || 0;
  const debtNum = parseFloat(debtAmount) || 0;
  const mcrPct = stats.mcr > 0n ? Number(stats.mcr) / 1e16 : 110;
  const ccrPct = stats.ccr > 0n ? Number(stats.ccr) / 1e16 : 150;

  // Validation
  const errors: string[] = [];
  if (debtNum > 0 && debtNum < MIN_DEBT) errors.push(`Minimum debt is ${MIN_DEBT} sbUSD.`);
  if (preview.cr > 0 && !preview.isAboveMCR) errors.push(`CR (${preview.cr.toFixed(0)}%) is below MCR (${mcrPct.toFixed(0)}%).`);
  if (collDelta.isIncrease && collDelta.amount > collBalanceValue) errors.push("Insufficient balance.");

  const canSubmit = hasAnyChange && errors.length === 0 && parsedColl > 0n && parsedDebt > 0n;

  // Quick-fill helpers
  const handleHalf = useCallback(() => {
    if (collBalanceValue > 0n) {
      const half = collBalanceValue / 2n + trove.coll;
      setCollAmount(Number(formatEther(half)).toFixed(6));
    }
  }, [collBalanceValue, trove.coll]);

  const handleMax = useCallback(() => {
    if (collBalanceValue > 0n) {
      const max = collBalanceValue + trove.coll;
      setCollAmount(Number(formatEther(max)).toFixed(6));
    }
  }, [collBalanceValue, trove.coll]);

  const handleSafe = useCallback(() => {
    if (collNum > 0 && collPrice > 0) {
      const safeBorrow = (collNum * collPrice) / 2; // 200% CR target
      if (safeBorrow >= MIN_DEBT) {
        setDebtAmount(safeBorrow.toFixed(2));
      }
    }
  }, [collNum, collPrice]);

  // Tx pipeline state
  const [txSteps, setTxSteps] = useState<TxStep[]>([]);
  const [txPhase, setTxPhase] = useState<TxPhase>("idle");
  const [showTxModal, setShowTxModal] = useState(false);

  const updateStep = useCallback((id: string, update: Partial<TxStep>) => {
    setTxSteps((prev) => prev.map((s) => (s.id === id ? { ...s, ...update } : s)));
  }, []);

  const handleEditTrove = useCallback(async () => {
    if (!canSubmit) return;

    // Build dynamic step list
    const steps: TxStep[] = [];
    if (collDelta.isIncrease && collDelta.amount > 0n && needsApproval) {
      steps.push({ id: "approve", type: "approve", label: `Approve ${branch}`, status: "pending" });
    }
    if (hasCollDebtChange) {
      steps.push({ id: "adjust", type: "adjustTrove", label: "Adjust Trove", status: "pending" });
    }
    if (rateChanged) {
      steps.push({ id: "rate", type: "adjustRate", label: "Adjust Rate", status: "pending" });
    }

    setTxSteps(steps);
    setTxPhase("executing");
    setShowTxModal(true);

    try {
      // Approve if adding collateral
      if (collDelta.isIncrease && collDelta.amount > 0n && needsApproval) {
        updateStep("approve", { status: "executing" });
        const hash = await approveCollateral(collDelta.amount);
        updateStep("approve", { status: "done", txHash: hash as `0x${string}` | undefined });
      }

      // Adjust Trove (coll/debt)
      if (hasCollDebtChange) {
        updateStep("adjust", { status: "executing" });
        const hash = await adjustTrove({
          troveId: trove.id,
          collChange: collDelta.amount,
          isCollIncrease: collDelta.isIncrease,
          debtChange: debtDelta.amount,
          isDebtIncrease: debtDelta.isIncrease,
          // TODO(liquity-upfront-fee):
          // When `debtDelta.isIncrease === true`, this value is the absolute max upfront fee in sbUSD,
          // not a percentage. Keeping it fixed at 1 sbUSD can cause `UpfrontFeeTooHigh()` reverts
          // whenever the predicted fee for the debt increase is above 1.
          //
          // Proper fix:
          // - Call `HintHelpers.predictAdjustTroveUpfrontFee(branchIdx, troveId, debtIncrease)`.
          // - Add a small buffer for state drift between read and write.
          // - Surface the estimate in the edit dialog and pass that buffered amount here.
          maxUpfrontFee: debtDelta.isIncrease ? parseEther("1") : 0n,
        });
        updateStep("adjust", { status: "done", txHash: hash as `0x${string}` | undefined });
      }

      // Adjust Rate
      if (rateChanged) {
        updateStep("rate", { status: "executing" });
        const hash = await adjustInterestRate({
          troveId: trove.id,
          newRate: parsedRate,
          // TODO(liquity-upfront-fee):
          // Interest-rate changes can also charge an upfront fee when adjusted before the cooldown ends.
          // This same hardcoded 1 sbUSD cap can therefore revert with `UpfrontFeeTooHigh()` depending on
          // trove size, branch state, and the newly selected rate.
          //
          // Proper fix:
          // - Call `HintHelpers.predictAdjustInterestRateUpfrontFee(branchIdx, troveId, newRate)`.
          // - Add a buffer, display the estimate to the user, and pass the buffered value instead.
          maxFee: parseEther("1"),
        });
        updateStep("rate", { status: "done", txHash: hash as `0x${string}` | undefined });
      }

      setTxPhase("complete");
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Transaction failed";
      setTxSteps((prev) => prev.map((s) =>
        s.status === "executing" ? { ...s, status: "error" as const, error: errorMsg } : s,
      ));
      setTxPhase("error");
    }
  }, [
    canSubmit, collDelta, debtDelta, rateChanged, hasCollDebtChange,
    needsApproval, approveCollateral, adjustTrove, adjustInterestRate,
    trove.id, parsedRate, branch, updateStep,
  ]);

  return {
    // Form state
    collAmount, setCollAmount,
    debtAmount, setDebtAmount,
    ratePercent, setRatePercent,
    // Quick-fill
    handleHalf, handleMax, handleSafe,
    // Derived
    preview,
    hasAnyChange, errors, canSubmit,
    collDelta, debtDelta, rateChanged,
    collNum, debtNum, collPrice,
    mcrPct, ccrPct,
    // Pipeline
    txSteps, txPhase, showTxModal, setShowTxModal,
    handleEditTrove,
    // Context
    collBalanceValue,
    marketStats,
    stats,
  };
}
