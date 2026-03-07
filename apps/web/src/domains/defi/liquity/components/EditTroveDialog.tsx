"use client";

import type { Address } from "viem";
import { formatEther } from "viem";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/shared/components/ui/dialog";
import { Input } from "@/shared/components/ui/input";
import { Button } from "@/shared/components/ui/button";
import { TxPipelineModal } from "@/shared/components/ui/tx-pipeline-modal";
import { InterestRateSlider } from "./InterestRateSlider";
import { PositionSummary } from "./PositionSummary";
import { useEditTrove } from "../hooks/useEditTrove";
import { formatTokenAmount } from "@/shared/lib/utils";
import type { TroveData } from "../types";
import { Loader2, AlertTriangle, Info } from "lucide-react";

interface EditTroveDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trove: TroveData;
  branch: "wCTC" | "lstCTC";
  address?: Address;
  onSuccess?: () => void;
}

export function EditTroveDialog({
  open,
  onOpenChange,
  trove,
  branch,
  address,
  onSuccess,
}: EditTroveDialogProps) {
  const edit = useEditTrove(branch, trove, address);

  const handleClose = (v: boolean) => {
    if (!v && edit.txPhase === "executing") return;
    onOpenChange(v);
    if (!v && edit.txPhase === "complete") {
      onSuccess?.();
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit {branch} Trove</DialogTitle>
            <DialogDescription>
              Adjust collateral, debt, or interest rate. Maintain CR above {edit.mcrPct.toFixed(0)}%.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-5 py-4">
            {/* Collateral Input */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <label className="text-text-secondary">Collateral ({branch})</label>
                <div className="flex gap-2">
                  <button onClick={edit.handleHalf} className="text-xs text-text-tertiary hover:text-ice-300 transition-colors">HALF</button>
                  <button onClick={edit.handleMax} className="text-xs text-ice-400 hover:text-ice-300 transition-colors">
                    MAX: {formatTokenAmount(edit.collBalanceValue + trove.coll, 18, 4)}
                  </button>
                </div>
              </div>
              <Input
                type="number"
                placeholder="0.00"
                className="font-mono"
                value={edit.collAmount}
                onChange={(e) => edit.setCollAmount(e.target.value)}
              />
              {edit.collAmount && edit.collPrice > 0 && (
                <p className="text-xs text-text-tertiary">
                  = ${(edit.collNum * edit.collPrice).toFixed(2)} USD
                  {edit.collDelta.amount > 0n && (
                    <span className={edit.collDelta.isIncrease ? "text-green-400" : "text-red-400"}>
                      {" "}({edit.collDelta.isIncrease ? "+" : "-"}{Number(formatEther(edit.collDelta.amount)).toFixed(4)} {branch})
                    </span>
                  )}
                </p>
              )}
            </div>

            {/* Borrow Amount Input */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <label className="text-text-secondary">Debt (sbUSD)</label>
                <div className="flex gap-2 items-center">
                  {edit.collNum > 0 && (
                    <button onClick={edit.handleSafe} className="text-xs text-success/80 hover:text-success transition-colors">SAFE</button>
                  )}
                  <span className="text-xs text-text-tertiary">Min: 10 sbUSD</span>
                </div>
              </div>
              <Input
                type="number"
                placeholder="0.00"
                className="font-mono"
                value={edit.debtAmount}
                onChange={(e) => edit.setDebtAmount(e.target.value)}
              />
              {edit.debtDelta.amount > 0n && (
                <p className="text-xs text-text-tertiary">
                  <span className={edit.debtDelta.isIncrease ? "text-yellow-400" : "text-green-400"}>
                    {edit.debtDelta.isIncrease ? "+" : "-"}{Number(formatEther(edit.debtDelta.amount)).toFixed(2)} sbUSD
                  </span>
                </p>
              )}
            </div>

            {/* Interest Rate Slider */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <label className="text-text-secondary">Interest Rate</label>
                <span className="text-white font-semibold">
                  {edit.ratePercent.toFixed(1)}% APR
                  {edit.rateChanged && (
                    <span className="text-xs text-text-tertiary ml-1">
                      (was {(Number(trove.interestRate) / 1e16).toFixed(1)}%)
                    </span>
                  )}
                </span>
              </div>
              <div>
                <InterestRateSlider
                  value={edit.ratePercent}
                  onChange={edit.setRatePercent}
                  avgRate={edit.marketStats?.median ?? null}
                />
                <div className="flex justify-between text-[10px] mt-1">
                  <span className="flex items-center gap-0.5 text-red-400/70"><Info className="w-2.5 h-2.5" /> Higher redemption risk</span>
                  <span className="text-green-400/70">Lower redemption risk</span>
                </div>
              </div>
            </div>

            {/* Position Summary */}
            {(edit.collNum > 0 || edit.debtNum > 0) && (
              <PositionSummary preview={edit.preview} mcrPct={edit.mcrPct} ccrPct={edit.ccrPct} />
            )}

            {/* Errors */}
            {edit.errors.length > 0 && (
              <div className="space-y-1.5">
                {edit.errors.map((err, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs text-red-400 bg-red-400/10 border border-red-400/20 rounded-xl px-3 py-2">
                    <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                    {err}
                  </div>
                ))}
              </div>
            )}

            {/* Submit */}
            <Button
              className="w-full"
              onClick={edit.handleEditTrove}
              disabled={!edit.canSubmit || edit.txPhase === "executing"}
            >
              {edit.txPhase === "executing" && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              {!edit.hasAnyChange ? "No Changes" : !edit.canSubmit ? "Invalid" : "Confirm Edit"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Tx Pipeline Modal */}
      <TxPipelineModal
        open={edit.showTxModal}
        onClose={() => {
          edit.setShowTxModal(false);
          if (edit.txPhase === "complete") {
            onOpenChange(false);
            onSuccess?.();
          }
        }}
        onRetry={edit.handleEditTrove}
        steps={edit.txSteps}
        phase={edit.txPhase}
        title="Edit Trove"
      />
    </>
  );
}
