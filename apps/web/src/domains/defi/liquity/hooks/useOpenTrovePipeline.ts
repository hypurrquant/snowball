"use client";

import { useState, useCallback, useMemo } from "react";
import { parseEther, formatEther } from "viem";
import type { Address } from "viem";
import { useTroveActions } from "./useTroveActions";
import { usePositionPreview } from "./usePositionPreview";
import { validateOpenTrove } from "../lib/liquityMath";
import { ETH_GAS_COMPENSATION, MIN_DEBT } from "../lib/constants";
import type { TxStep, TxPhase } from "@/shared/types/tx";
import type { BranchStats } from "../types";

interface UseOpenTrovePipelineParams {
  branch: "wCTC" | "lstCTC";
  address?: Address;
  collBalanceValue: bigint;
  stats: BranchStats;
  nextOwnerIndex?: bigint;
  onSuccess: () => void;
}

export function useOpenTrovePipeline({
  branch,
  address,
  collBalanceValue,
  stats,
  nextOwnerIndex,
  onSuccess,
}: UseOpenTrovePipelineParams) {
  // Form state
  const [collAmount, setCollAmount] = useState("");
  const [debtAmount, setDebtAmount] = useState("");
  const [ratePercent, setRatePercent] = useState(5);

  const parsedColl = collAmount ? parseEther(collAmount) : 0n;

  const {
    approveCollateral, approveGasComp, openTrove, isPending,
    needsCollApproval, needsGasApproval,
  } = useTroveActions(branch, address, parsedColl);

  // Tx pipeline state
  const [txSteps, setTxSteps] = useState<TxStep[]>([]);
  const [txPhase, setTxPhase] = useState<TxPhase>("idle");
  const [showTxModal, setShowTxModal] = useState(false);

  const updateStep = useCallback((id: string, update: Partial<TxStep>) => {
    setTxSteps((prev) => prev.map((s) => (s.id === id ? { ...s, ...update } : s)));
  }, []);

  const parsedDebt = debtAmount ? parseEther(debtAmount) : 0n;
  const parsedRate = parseEther(String(ratePercent / 100));
  const insufficientBalance = parsedColl > 0n && parsedColl > collBalanceValue;

  // Position preview
  const preview = usePositionPreview({
    coll: parsedColl,
    debt: parsedDebt,
    rate: parsedRate,
    price: stats.price,
    mcr: stats.mcr,
    ccr: stats.ccr,
  });

  // Derived values
  const collPrice = stats.price > 0n ? Number(formatEther(stats.price)) : 0;
  const collNum = parseFloat(collAmount) || 0;
  const debtNum = parseFloat(debtAmount) || 0;
  const collValueUSD = collNum * collPrice;
  const mcrPct = stats.mcr > 0n ? Number(stats.mcr) / 1e16 : 110;
  const ccrPct = stats.ccr > 0n ? Number(stats.ccr) / 1e16 : 150;

  // Validation
  const validation = useMemo(
    () =>
      validateOpenTrove({
        collAmount,
        debtAmount,
        debtNum,
        cr: preview.cr,
        isAboveMCR: preview.isAboveMCR,
        mcrPct,
        insufficientBalance,
        isPending,
      }),
    [collAmount, debtAmount, debtNum, preview.cr, preview.isAboveMCR, mcrPct, insufficientBalance, isPending],
  );

  const { errors, canOpen, buttonText } = validation;

  // Quick-fill helpers
  const handleHalf = useCallback(() => {
    if (collBalanceValue > 0n) {
      const half = collBalanceValue / 2n;
      setCollAmount(formatEther(half));
    }
  }, [collBalanceValue]);

  const handleMax = useCallback(() => {
    if (collBalanceValue > 0n) {
      setCollAmount(formatEther(collBalanceValue));
    }
  }, [collBalanceValue]);

  const handleSafe = useCallback(() => {
    if (collNum > 0 && collPrice > 0) {
      const safeBorrow = (collNum * collPrice) / 2; // 200% CR target
      if (safeBorrow >= MIN_DEBT) {
        setDebtAmount(safeBorrow.toFixed(2));
      }
    }
  }, [collNum, collPrice]);

  const handleOpenTrove = useCallback(async () => {
    if (!canOpen) return;

    const steps: TxStep[] = [];
    if (needsCollApproval) {
      steps.push({ id: "approve-coll", type: "approve", label: `Approve ${branch}`, status: "pending" });
    }
    if (needsGasApproval) {
      steps.push({ id: "approve-gas", type: "approve", label: "Approve wCTC (gas)", status: "pending" });
    }
    steps.push({ id: "open", type: "openTrove", label: "Open Trove", status: "pending" });

    setTxSteps(steps);
    setTxPhase("executing");
    setShowTxModal(true);

    try {
      if (needsCollApproval) {
        updateStep("approve-coll", { status: "executing" });
        const approveAmt = branch === "wCTC" ? parsedColl + ETH_GAS_COMPENSATION : parsedColl;
        const hash = await approveCollateral(approveAmt);
        updateStep("approve-coll", { status: "done", txHash: hash as `0x${string}` | undefined });
      }
      if (needsGasApproval) {
        updateStep("approve-gas", { status: "executing" });
        const hash = await approveGasComp(ETH_GAS_COMPENSATION);
        updateStep("approve-gas", { status: "done", txHash: hash as `0x${string}` | undefined });
      }

      updateStep("open", { status: "executing" });
      const hash = await openTrove({
        coll: parsedColl,
        debt: parsedDebt,
        rate: parsedRate,
        // TODO(liquity-upfront-fee):
        // `maxFee` here is an absolute sbUSD cap for BorrowerOperations._requireUserAcceptsUpfrontFee(),
        // not a percentage/slippage value. `parseEther("1")` means "revert if the predicted upfront fee
        // is above 1 sbUSD".
        //
        // Why this sometimes fails:
        // - On CC3 testnet, openTrove can revert with `BorrowerOperations.UpfrontFeeTooHigh()`
        //   (selector `0x2337edc7`) even when approval and hints are otherwise correct.
        // - Example reproduced on 2026-03-07:
        //   11111 wCTC collateral / 2222 sbUSD debt / 5% rate required about
        //   2.021279626946928609 sbUSD upfront fee, so this hardcoded 1 sbUSD cap reverted.
        // - Lowering borrow size or interest rate can make the tx succeed again because the predicted fee
        //   drops below 1 sbUSD, which makes this look intermittent.
        //
        // Proper fix:
        // - Read `HintHelpers.predictOpenTroveUpfrontFee(branchIdx, debt, rate)` before sending.
        // - Add a safety buffer (for example 10-20%) to absorb state changes between read and write.
        // - Show that estimated fee in the UI so the user knows why the cap is what it is.
        // - Pass the buffered estimate here instead of a hardcoded `parseEther("1")`.
        maxFee: parseEther("1"),
        ownerIndex: nextOwnerIndex,
      });
      updateStep("open", { status: "done", txHash: hash as `0x${string}` | undefined });

      setTxPhase("complete");
      setCollAmount("");
      setDebtAmount("");
      setRatePercent(5);
      onSuccess();
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Open trove failed";
      setTxSteps((prev) => prev.map((s) =>
        s.status === "executing" ? { ...s, status: "error" as const, error: errorMsg } : s,
      ));
      setTxPhase("error");
    }
  }, [
    canOpen, needsCollApproval, needsGasApproval, branch, parsedColl, parsedDebt, parsedRate,
    nextOwnerIndex, approveCollateral, approveGasComp, openTrove, updateStep, onSuccess,
  ]);

  const resetTxModal = useCallback(() => {
    setShowTxModal(false);
    setTxPhase("idle");
    setTxSteps([]);
  }, []);

  return {
    // Form state
    collAmount, setCollAmount,
    debtAmount, setDebtAmount,
    ratePercent, setRatePercent,
    // Quick-fill
    handleHalf, handleMax, handleSafe,
    // Derived
    preview,
    collPrice, collNum, debtNum, collValueUSD,
    mcrPct, ccrPct,
    insufficientBalance,
    // Validation
    errors, canOpen, buttonText,
    // Actions
    isPending,
    handleOpenTrove,
    // Tx pipeline
    txSteps, txPhase, showTxModal, resetTxModal,
  };
}
