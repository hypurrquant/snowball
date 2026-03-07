"use client";

import { CheckCircle2, AlertCircle } from "lucide-react";
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
  steps: TxStep[];
  phase: TxPhase;
  title?: string;
}

export function TxPipelineModal({
  open,
  onClose,
  steps,
  phase,
  title = "Executing Transaction",
}: TxPipelineModalProps) {
  const isExecuting = phase === "executing";

  if (phase === "complete") {
    return (
      <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
        <DialogContent>
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
    return (
      <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              <span className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-red-400" />
                Transaction Failed
              </span>
            </DialogTitle>
            <DialogDescription>
              {errorStep?.error || "An error occurred during execution."}
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
            className="w-full py-2.5 rounded-xl text-sm font-medium bg-bg-tertiary text-text-secondary hover:text-text-primary transition-colors"
          >
            Close
          </button>
        </DialogContent>
      </Dialog>
    );
  }

  // executing / idle
  return (
    <Dialog open={open} onOpenChange={(v) => !v && !isExecuting && onClose()}>
      <DialogContent
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
