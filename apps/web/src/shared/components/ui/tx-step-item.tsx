"use client";

import { Loader2, Check, X, Circle } from "lucide-react";
import { EXPLORER_URL } from "@/core/config/addresses";
import { CHAIN_EXPLORERS } from "@/core/config/chain";
import type { TxStep, TxStepStatus } from "@/shared/types/tx";

const STATUS_ICONS: Record<TxStepStatus, React.ReactNode> = {
  pending: (
    <div className="w-6 h-6 rounded-full border-2 border-border-primary flex items-center justify-center">
      <Circle className="w-2 h-2 text-text-tertiary" />
    </div>
  ),
  executing: (
    <div className="w-6 h-6 flex items-center justify-center">
      <Loader2 className="w-5 h-5 text-ice-400 animate-spin" />
    </div>
  ),
  confirming: (
    <div className="w-6 h-6 flex items-center justify-center">
      <Loader2 className="w-5 h-5 text-yellow-400 animate-spin" />
    </div>
  ),
  done: (
    <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center">
      <Check className="w-3.5 h-3.5 text-white" />
    </div>
  ),
  error: (
    <div className="w-6 h-6 rounded-full bg-red-500 flex items-center justify-center">
      <X className="w-3.5 h-3.5 text-white" />
    </div>
  ),
};

const STATUS_COLORS: Record<TxStepStatus, string> = {
  pending: "text-text-tertiary",
  executing: "text-text-primary",
  confirming: "text-yellow-400",
  done: "text-green-400",
  error: "text-red-400",
};

interface TxStepItemProps {
  step: TxStep;
  stepNumber: number;
  isLast: boolean;
}

export function TxStepItem({ step, stepNumber, isLast }: TxStepItemProps) {
  return (
    <div className="flex gap-3">
      {/* Timeline: icon + connector */}
      <div className="flex flex-col items-center">
        <div className="flex-shrink-0">{STATUS_ICONS[step.status]}</div>
        {!isLast && (
          <div
            className={`w-0.5 flex-1 min-h-[16px] ${
              step.status === "done" ? "bg-green-500" : step.status === "confirming" ? "bg-yellow-400" : "bg-border-primary"
            }`}
          />
        )}
      </div>

      {/* Content */}
      <div className={`flex-1 min-w-0 ${isLast ? "pb-1" : "pb-5"}`}>
        <div className="flex items-center gap-2">
          <span className={`text-sm font-medium ${STATUS_COLORS[step.status]}`}>
            {step.label}
          </span>
          <span className="ml-auto text-xs text-text-tertiary">
            Step {stepNumber}
          </span>
        </div>

        {step.status === "executing" && (
          <p className="mt-1 text-xs text-text-tertiary">
            Waiting for wallet confirmation...
          </p>
        )}

        {step.status === "confirming" && (
          <p className="mt-1 text-xs text-yellow-400">
            Confirming on-chain...
          </p>
        )}

        {(step.status === "done" || step.status === "confirming") && step.txHash && (
          <a
            href={`${step.chainId ? CHAIN_EXPLORERS[step.chainId] ?? EXPLORER_URL : EXPLORER_URL}/tx/${step.txHash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-1 inline-block text-xs text-ice-400 hover:text-ice-300"
          >
            View transaction ↗
          </a>
        )}

        {step.status === "error" && step.error && (
          <p className="mt-1 text-xs text-red-400">
            {step.error.includes("User rejected") || step.error.includes("User denied")
              ? "Cancelled by user"
              : step.error}
          </p>
        )}
      </div>
    </div>
  );
}
