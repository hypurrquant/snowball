"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useAccount } from "wagmi";
import { zeroAddress, type Address, parseAbiItem } from "viem";
import type { TxStep } from "@/shared/types/tx";
import { BRIDGE } from "@/core/config/addresses";
import { uscClient } from "../lib/bridgeConfig";
import { useBridgeActions } from "./useBridgeActions";
import type { BridgeSession } from "../lib/bridgeSession";
import { saveSession, loadSession, clearSession } from "../lib/bridgeSession";
import type { BridgePhase } from "../lib/bridgeSteps";
import {
  ATTEST_TIMEOUT_MS,
  ATTEST_POLL_MS,
  createInitialSteps,
  PHASE_STEP_MAP,
  resolveResumePhase,
} from "../lib/bridgeSteps";

// ---- Hook ----

export function useBridgePipeline() {
  const { address } = useAccount();
  const actions = useBridgeActions();
  const [steps, setSteps] = useState<TxStep[]>(createInitialSteps);
  const [phase, setPhase] = useState<BridgePhase>("idle");
  const [amount, setAmount] = useState<bigint>(0n);
  const [executing, setExecuting] = useState(false);
  const phaseRef = useRef<BridgePhase>("idle");
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const sessionRef = useRef<BridgeSession | null>(null);

  useEffect(() => { phaseRef.current = phase; }, [phase]);

  const updateStep = useCallback((id: string, update: Partial<TxStep>) => {
    setSteps((prev) => prev.map((s) => (s.id === id ? { ...s, ...update } : s)));
  }, []);

  // Persist a completed step's txHash into the session
  const persistStep = useCallback((stepKey: keyof BridgeSession["completedSteps"], txHash: string, extra?: Partial<BridgeSession>) => {
    if (!address) return;
    const current = sessionRef.current;
    if (!current) return;
    const updated: BridgeSession = {
      ...current,
      ...extra,
      completedSteps: { ...current.completedSteps, [stepKey]: txHash },
      failedStep: undefined,
      failedError: undefined,
    };
    sessionRef.current = updated;
    saveSession(address, updated);
  }, [address]);

  // Persist a failure into the session so retry works after refresh
  const persistFailure = useCallback((stepId: string, error: string) => {
    if (!address) return;
    const current = sessionRef.current;
    if (!current) return;
    const updated: BridgeSession = { ...current, failedStep: stepId, failedError: error };
    sessionRef.current = updated;
    saveSession(address, updated);
  }, [address]);

  // ---- Session recovery on mount ----
  const detectPhase = useCallback(async () => {
    if (!address) return;

    const session = loadSession(address);
    if (!session) return; // No session -> fresh start
    sessionRef.current = session;

    setAmount(BigInt(session.amount));

    const result = resolveResumePhase(session);
    if (!result) return; // Nothing completed

    setSteps(result.restoredSteps);
    setPhase(result.nextPhase);
  }, [address]);

  useEffect(() => {
    detectPhase();
  }, [detectPhase]);

  // ---- Attestation polling ----
  useEffect(() => {
    if (phase !== "attestWait" || !address) return;

    const startTime = Date.now();
    const session = sessionRef.current;
    // Estimate how far back to search on USC chain based on burn timestamp
    // USC block time ~2s, search from 5 minutes before burn to be safe
    const burnTs = session?.burnTimestamp ?? session?.timestamp ?? 0;
    let cachedFromBlock: bigint | undefined;

    const poll = async () => {
      try {
        let fromBlock: bigint;
        if (cachedFromBlock !== undefined) {
          fromBlock = cachedFromBlock;
        } else {
          // Estimate: go back enough blocks to cover attestation window
          // Use elapsed time since burn + 5 min buffer, at ~2s/block
          const elapsedSec = Math.max(0, Math.floor((Date.now() - burnTs) / 1000)) + 300;
          const blocksBack = BigInt(Math.ceil(elapsedSec / 2));
          const currentBlock = await uscClient.getBlockNumber();
          fromBlock = currentBlock > blocksBack ? currentBlock - blocksBack : 0n;
          cachedFromBlock = fromBlock;
        }

        const logs = await uscClient.getLogs({
          address: BRIDGE.dnBridgeUSC as Address,
          event: parseAbiItem("event Transfer(address indexed from, address indexed to, uint256 value)"),
          args: { from: zeroAddress, to: address },
          fromBlock,
        });

        if (logs.length > 0) {
          const txHash = logs[logs.length - 1].transactionHash;
          updateStep("attest", { status: "done" });
          updateStep("uscMint", { status: "done", txHash });
          setPhase("done");
          persistStep("uscMint", txHash);
          if (pollRef.current) clearInterval(pollRef.current);
        } else if (Date.now() - startTime > ATTEST_TIMEOUT_MS) {
          setPhase("timeout");
          updateStep("attest", { status: "error", error: "Attestation delayed (>10 min). The network may be congested." });
          if (pollRef.current) clearInterval(pollRef.current);
        }
      } catch {
        // Polling error, will retry
      }
    };

    // Run immediately, then every 10s
    poll();
    pollRef.current = setInterval(poll, ATTEST_POLL_MS);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [phase, address, updateStep, persistStep]);

  // ---- Execution ----
  const executeFrom = useCallback(
    async (startPhase: BridgePhase, bridgeAmount: bigint) => {
      if (!address || bridgeAmount === 0n) return;

      const phaseOrder: BridgePhase[] = ["approve", "deposit", "mint", "burn", "attestWait"];
      const startIdx = phaseOrder.indexOf(startPhase);
      if (startIdx < 0) return;

      setExecuting(true);
      try {
        for (let i = startIdx; i < phaseOrder.length; i++) {
          const p = phaseOrder[i];
          const stepId = PHASE_STEP_MAP[p];
          setPhase(p);
          updateStep(stepId, { status: "executing" });

          if (p === "approve") {
            const tx = await actions.approveUSDC(bridgeAmount);
            updateStep(stepId, { status: "done", txHash: tx });
            persistStep("approve", tx);
          } else if (p === "deposit") {
            const tx = await actions.depositToVault(bridgeAmount);
            updateStep(stepId, { status: "done", txHash: tx });
            persistStep("deposit", tx);
          } else if (p === "mint") {
            const tx = await actions.mintDN(address, bridgeAmount);
            updateStep(stepId, { status: "done", txHash: tx });
            persistStep("mint", tx);
          } else if (p === "burn") {
            const tx = await actions.burnDN(bridgeAmount);
            updateStep(stepId, { status: "done", txHash: tx });
            // Save burn timestamp so attestation polling starts from the right point on USC chain
            persistStep("burn", tx, { burnTimestamp: Date.now() });
          } else if (p === "attestWait") {
            // Polling handled by useEffect
            setExecuting(false);
            return;
          }
        }
        setExecuting(false);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        const failedStepId = PHASE_STEP_MAP[phaseRef.current];
        if (failedStepId) {
          updateStep(failedStepId, { status: "error", error: message });
          persistFailure(failedStepId, message);
        }
        setPhase("error");
        setExecuting(false);
      }
    },
    [address, actions, updateStep, persistStep, persistFailure]
  );

  const execute = useCallback(
    async (bridgeAmount: bigint) => {
      const actualAmount = bridgeAmount > 0n ? bridgeAmount : amount;
      if (actualAmount === 0n) return;
      setAmount(actualAmount);

      // If resuming from a recovered phase, continue from there
      if (phase !== "idle" && phase !== "error" && phase !== "done" && phase !== "timeout") {
        await executeFrom(phase, actualAmount);
        return;
      }

      // Fresh start — create new session
      const newSession: BridgeSession = {
        amount: actualAmount.toString(),
        timestamp: Date.now(),
        completedSteps: {},
      };
      sessionRef.current = newSession;
      if (address) saveSession(address, newSession);

      await executeFrom("approve", actualAmount);
    },
    [phase, amount, address, executeFrom]
  );

  const retry = useCallback(() => {
    if (!amount) return;

    // Clear failure from session
    if (address && sessionRef.current) {
      const updated = { ...sessionRef.current, failedStep: undefined, failedError: undefined };
      sessionRef.current = updated;
      saveSession(address, updated);
    }

    setSteps((prev) => {
      const failedIdx = prev.findIndex((s) => s.status === "error");
      if (failedIdx < 0) return prev;
      return prev.map((s, i) => (i >= failedIdx ? { ...s, status: "pending" as const, error: undefined, txHash: undefined } : s));
    });

    const phaseOrder: BridgePhase[] = ["approve", "deposit", "mint", "burn", "attestWait"];
    const stepIds = ["approve", "deposit", "mint", "burn", "attest"];
    const failedStep = steps.find((s) => s.status === "error");
    if (!failedStep) return;
    const failedIdx = stepIds.indexOf(failedStep.id);
    const retryPhase = failedIdx >= 0 ? phaseOrder[failedIdx] : "approve";
    executeFrom(retryPhase, amount);
  }, [steps, amount, executeFrom]);

  const reset = useCallback(() => {
    setSteps(createInitialSteps());
    setPhase("idle");
    setAmount(0n);
    setExecuting(false);
    sessionRef.current = null;
    if (address) clearSession(address);
  }, [address]);

  return {
    steps,
    phase,
    amount,
    execute,
    retry,
    reset,
    isExecuting: executing,
  };
}
