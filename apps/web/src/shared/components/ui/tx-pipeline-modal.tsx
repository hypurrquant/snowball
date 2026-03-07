"use client";

import { CheckCircle2, AlertCircle, Ban, RotateCcw } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/shared/components/ui/dialog";
import { TxStepItem } from "@/shared/components/ui/tx-step-item";
import type { TxStep, TxPhase } from "@/shared/types/tx";

interface TxPipelineModalProps {
  open: boolean;
  onClose: () => void;
  onRetry?: () => void;
  steps: TxStep[];
  phase: TxPhase;
  title?: string;
}

export function TxPipelineModal({
  open,
  onClose,
  onRetry,
  steps,
  phase,
  title = "Executing Transaction",
}: TxPipelineModalProps) {
  const isExecuting = phase === "executing";

  if (phase === "complete") {
    return (
      <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
        <DialogContent snowfall="heavy">
          <DialogHeader>
            <DialogTitle>
              <span className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-400" />
                Transaction Complete
              </span>
            </DialogTitle>
            <DialogDescription>
              All steps have been completed successfully.
            </DialogDescription>
          </DialogHeader>

          <div className="py-2">
            {steps.map((step, i) => (
              <TxStepItem
                key={step.id}
                step={step}
                stepNumber={i + 1}
                isLast={i === steps.length - 1}
              />
            ))}
          </div>

          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-xl text-sm font-medium bg-ice-400 hover:bg-ice-500 text-white transition-colors"
          >
            Close
          </button>
        </DialogContent>
      </Dialog>
    );
  }

  if (phase === "error") {
    const errorStep = steps.find((s) => s.status === "error");
    const isUserRejection = errorStep?.error?.includes("User rejected") || errorStep?.error?.includes("User denied");
    return (
      <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
        <DialogContent snowfall="heavy">
          <DialogHeader>
            <DialogTitle>
              <span className="flex items-center gap-2">
                {isUserRejection ? (
                  <Ban className="w-5 h-5 text-text-tertiary" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-red-400" />
                )}
                {isUserRejection ? "Transaction Cancelled" : "Transaction Failed"}
              </span>
            </DialogTitle>
            <DialogDescription>
              {isUserRejection
                ? "You cancelled the transaction in your wallet."
                : errorStep?.error || "An error occurred during execution."}
            </DialogDescription>
          </DialogHeader>

          <div className="py-2">
            {steps.map((step, i) => (
              <TxStepItem
                key={step.id}
                step={step}
                stepNumber={i + 1}
                isLast={i === steps.length - 1}
              />
            ))}
          </div>

          {onRetry && (
            <button
              onClick={onRetry}
              className="w-full py-2.5 rounded-xl text-sm font-medium bg-ice-400 hover:bg-ice-500 text-white transition-colors flex items-center justify-center gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              Retry
            </button>
          )}
        </DialogContent>
      </Dialog>
    );
  }

  // executing / idle
  return (
    <Dialog open={open} onOpenChange={(v) => !v && !isExecuting && onClose()}>
      <DialogContent
        snowfall="heavy"
        onInteractOutside={(e) => isExecuting && e.preventDefault()}
        onEscapeKeyDown={(e) => isExecuting && e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            Please confirm each transaction in your wallet.
          </DialogDescription>
        </DialogHeader>

        <div className="py-2">
          {steps.map((step, i) => (
            <TxStepItem
              key={step.id}
              step={step}
              stepNumber={i + 1}
              isLast={i === steps.length - 1}
            />
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
