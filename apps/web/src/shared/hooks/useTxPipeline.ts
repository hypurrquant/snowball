"use client";

import { useState, useCallback } from "react";
import { useConfig } from "wagmi";
import { waitForTransactionReceipt } from "wagmi/actions";
import type { TxStep, TxPhase, TxStepType } from "@/shared/types/tx";

export function useTxPipeline() {
  const config = useConfig();
  const [txSteps, setTxSteps] = useState<TxStep[]>([]);
  const [txPhase, setTxPhase] = useState<TxPhase>("idle");
  const [showTxModal, setShowTxModal] = useState(false);

  const updateStep = useCallback((id: string, update: Partial<TxStep>) => {
    setTxSteps((prev) => prev.map((s) => (s.id === id ? { ...s, ...update } : s)));
  }, []);

  const run = useCallback(async (
    steps: { id: string; type: TxStepType; label: string }[],
    executors: Record<string, () => Promise<`0x${string}` | undefined>>,
  ) => {
    const txStepList: TxStep[] = steps.map((s) => ({ ...s, status: "pending" as const }));
    setTxSteps(txStepList);
    setTxPhase("executing");
    setShowTxModal(true);

    try {
      for (const step of steps) {
        const executor = executors[step.id];
        if (!executor) continue;
        setTxSteps((prev) => prev.map((s) => (s.id === step.id ? { ...s, status: "executing" } : s)));
        const hash = await executor();
        if (hash) {
          setTxSteps((prev) => prev.map((s) => (s.id === step.id ? { ...s, status: "confirming", txHash: hash } : s)));
          const receipt = await waitForTransactionReceipt(config, { hash });
          if (receipt.status === "reverted") {
            throw new Error("Transaction reverted on-chain");
          }
        }
        setTxSteps((prev) => prev.map((s) => (s.id === step.id ? { ...s, status: "done", txHash: hash } : s)));
      }
      setTxPhase("complete");
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Transaction failed";
      setTxSteps((prev) => prev.map((s) =>
        s.status === "executing" || s.status === "confirming" ? { ...s, status: "error" as const, error: errorMsg } : s,
      ));
      setTxPhase("error");
    }
  }, [config]);

  const reset = useCallback(() => {
    setShowTxModal(false);
    setTxPhase("idle");
    setTxSteps([]);
  }, []);

  return { txSteps, txPhase, showTxModal, setShowTxModal, updateStep, run, reset };
}
