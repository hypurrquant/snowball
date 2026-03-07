"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useAccount } from "wagmi";
import { zeroAddress, type Address, parseAbiItem, decodeEventLog } from "viem";
import type { TxStep } from "@/shared/types/tx";
import { creditcoinTestnet, sepoliaChain, uscTestnet } from "@/core/config/chain";
import { ccClient, sepoliaClient, uscClient, bridgeContracts } from "../lib/bridgeConfig";
import { BRIDGE } from "@/core/config/addresses";
import { useBridgeActions } from "./useBridgeActions";

type BridgePhase =
  | "idle"
  | "approve"
  | "deposit"
  | "mint"
  | "burn"
  | "attestWait"
  | "done"
  | "error"
  | "timeout";

const ATTEST_TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes
const ATTEST_POLL_MS = 10_000; // 10 seconds
const RECENT_BLOCKS = 14_400n; // ~24h at ~6s blocks

const SESSION_KEY_PREFIX = "bridge-session:";

function getSessionKey(address: string) {
  return `${SESSION_KEY_PREFIX}${address.toLowerCase()}`;
}

function createInitialSteps(): TxStep[] {
  return [
    { id: "approve", type: "approve", label: "Approve USDC", status: "pending", chainId: creditcoinTestnet.id },
    { id: "deposit", type: "vaultDeposit", label: "Deposit to Vault", status: "pending", chainId: creditcoinTestnet.id },
    { id: "mint", type: "mint", label: "Mint DN (Sepolia)", status: "pending", chainId: sepoliaChain.id },
    { id: "burn", type: "bridgeBurn", label: "Bridge Burn DN", status: "pending", chainId: sepoliaChain.id },
    { id: "attest", type: "attestWait", label: "Attestation (~5 min)", status: "pending", chainId: uscTestnet.id },
    { id: "uscMint", type: "uscMint", label: "USC Mint (Auto)", status: "pending", chainId: uscTestnet.id },
  ];
}

const PHASE_STEP_MAP: Record<string, string> = {
  approve: "approve",
  deposit: "deposit",
  mint: "mint",
  burn: "burn",
  attestWait: "attest",
};

// Session anchor stored in sessionStorage (per-address)
interface BridgeSession {
  depositTxHash: string;
  amount: string; // bigint serialized
  timestamp: number;
}

function saveSession(address: string, session: BridgeSession) {
  try { sessionStorage.setItem(getSessionKey(address), JSON.stringify(session)); } catch {}
}

function loadSession(address: string): BridgeSession | null {
  try {
    const raw = sessionStorage.getItem(getSessionKey(address));
    if (!raw) return null;
    const session = JSON.parse(raw) as BridgeSession;
    if (Date.now() - session.timestamp > 86_400_000) {
      sessionStorage.removeItem(getSessionKey(address));
      return null;
    }
    return session;
  } catch { return null; }
}

function clearSession(address: string) {
  try { sessionStorage.removeItem(getSessionKey(address)); } catch {}
}

export function useBridgePipeline() {
  const { address } = useAccount();
  const actions = useBridgeActions();
  const [steps, setSteps] = useState<TxStep[]>(createInitialSteps);
  const [phase, setPhase] = useState<BridgePhase>("idle");
  const [amount, setAmount] = useState<bigint>(0n);
  const phaseRef = useRef<BridgePhase>("idle");
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => { phaseRef.current = phase; }, [phase]);

  const updateStep = useCallback((id: string, update: Partial<TxStep>) => {
    setSteps((prev) => prev.map((s) => (s.id === id ? { ...s, ...update } : s)));
  }, []);

  const getRecentBlock = useCallback(async (client: { getBlockNumber: () => Promise<bigint> }) => {
    try {
      const block = await client.getBlockNumber();
      return block > RECENT_BLOCKS ? block - RECENT_BLOCKS : 0n;
    } catch { return 0n; }
  }, []);

  // Re-entry recovery using session anchor + on-chain events
  const detectPhase = useCallback(async () => {
    if (!address) return;

    const session = loadSession(address);

    try {
      // If we have a session, use its amount
      if (session) {
        setAmount(BigInt(session.amount));
      }

      const [uscFrom, sepFrom, ccFrom] = await Promise.all([
        getRecentBlock(uscClient),
        getRecentBlock(sepoliaClient),
        getRecentBlock(ccClient),
      ]);

      // First, verify session anchor exists on-chain (if session present)
      // This ensures we don't recover from a stale/different session
      let sessionValid = !session; // No session = rely on heuristic
      if (session) {
        const depositReceipt = await ccClient.getTransactionReceipt({
          hash: session.depositTxHash as `0x${string}`,
        }).catch(() => null);
        sessionValid = depositReceipt?.status === "success";
      }

      if (!sessionValid && session) {
        // Session anchor invalid — clear and start fresh
        clearSession(address);
        return;
      }

      // Check in reverse order
      const uscMintLogs = await uscClient.getLogs({
        address: BRIDGE.dnBridgeUSC as Address,
        event: parseAbiItem("event Transfer(address indexed from, address indexed to, uint256 value)"),
        args: { from: zeroAddress, to: address },
        fromBlock: uscFrom,
      }).catch(() => []);

      if (uscMintLogs.length > 0) {
        setSteps(createInitialSteps().map((s) => ({ ...s, status: "done" as const })));
        setPhase("done");
        clearSession(address);
        return;
      }

      const burnLogs = await sepoliaClient.getLogs({
        address: bridgeContracts.dnToken.address,
        event: parseAbiItem("event BridgeBurn(address indexed from, uint256 amount, uint64 destinationChainKey)"),
        args: { from: address },
        fromBlock: sepFrom,
      }).catch(() => []);

      if (burnLogs.length > 0) {
        if (!session && burnLogs[burnLogs.length - 1].args?.amount) {
          setAmount(burnLogs[burnLogs.length - 1].args.amount!);
        }
        setSteps((prev) =>
          prev.map((s) => {
            if (["approve", "deposit", "mint", "burn"].includes(s.id)) return { ...s, status: "done" as const };
            if (s.id === "attest") return { ...s, status: "executing" as const };
            return s;
          })
        );
        setPhase("attestWait");
        return;
      }

      // Only recover from mint/deposit if we have a session anchor
      if (!session) return;

      const mintLogs = await sepoliaClient.getLogs({
        address: bridgeContracts.dnToken.address,
        event: parseAbiItem("event Transfer(address indexed from, address indexed to, uint256 value)"),
        args: { from: zeroAddress, to: address },
        fromBlock: sepFrom,
      }).catch(() => []);

      if (mintLogs.length > 0) {
        setSteps((prev) =>
          prev.map((s) => {
            if (["approve", "deposit", "mint"].includes(s.id)) return { ...s, status: "done" as const };
            return s;
          })
        );
        setPhase("burn");
        return;
      }

      const depositLogs = await ccClient.getLogs({
        address: bridgeContracts.vault.address,
        event: parseAbiItem("event Deposited(address indexed user, uint256 amount, uint64 destinationChainKey)"),
        args: { user: address },
        fromBlock: ccFrom,
      }).catch(() => []);

      if (depositLogs.length > 0) {
        setSteps((prev) =>
          prev.map((s) => {
            if (["approve", "deposit"].includes(s.id)) return { ...s, status: "done" as const };
            return s;
          })
        );
        setPhase("mint");
        return;
      }
    } catch {
      // Detection failed, start fresh
    }
  }, [address, getRecentBlock]);

  useEffect(() => {
    detectPhase();
  }, [detectPhase]);

  // Attestation polling
  useEffect(() => {
    if (phase !== "attestWait" || !address) return;

    const startTime = Date.now();

    const poll = async () => {
      try {
        const fromBlock = await getRecentBlock(uscClient);
        const logs = await uscClient.getLogs({
          address: BRIDGE.dnBridgeUSC as Address,
          event: parseAbiItem("event Transfer(address indexed from, address indexed to, uint256 value)"),
          args: { from: zeroAddress, to: address },
          fromBlock,
        });

        if (logs.length > 0) {
          updateStep("attest", { status: "done" });
          updateStep("uscMint", { status: "done", txHash: logs[0].transactionHash });
          setPhase("done");
          if (address) clearSession(address);
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

    pollRef.current = setInterval(poll, ATTEST_POLL_MS);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [phase, address, updateStep, getRecentBlock]);

  const executeFrom = useCallback(
    async (startPhase: BridgePhase, bridgeAmount: bigint) => {
      if (!address || bridgeAmount === 0n) return;

      const phaseOrder: BridgePhase[] = ["approve", "deposit", "mint", "burn", "attestWait"];
      const startIdx = phaseOrder.indexOf(startPhase);
      if (startIdx < 0) return;

      try {
        for (let i = startIdx; i < phaseOrder.length; i++) {
          const p = phaseOrder[i];
          const stepId = PHASE_STEP_MAP[p];
          setPhase(p);
          updateStep(stepId, { status: "executing" });

          if (p === "approve") {
            const tx = await actions.approveUSDC(bridgeAmount);
            updateStep(stepId, { status: "done", txHash: tx });
          } else if (p === "deposit") {
            const tx = await actions.depositToVault(bridgeAmount);
            updateStep(stepId, { status: "done", txHash: tx });
            // Save session anchor after deposit
            saveSession(address, { depositTxHash: tx, amount: bridgeAmount.toString(), timestamp: Date.now() });
          } else if (p === "mint") {
            const tx = await actions.mintDN(address, bridgeAmount);
            updateStep(stepId, { status: "done", txHash: tx });
          } else if (p === "burn") {
            const tx = await actions.burnDN(bridgeAmount);
            updateStep(stepId, { status: "done", txHash: tx });
          } else if (p === "attestWait") {
            // Polling handled by useEffect
            return;
          }
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        const failedStepId = PHASE_STEP_MAP[phaseRef.current];
        if (failedStepId) {
          updateStep(failedStepId, { status: "error", error: message });
        }
        setPhase("error");
      }
    },
    [address, actions, updateStep]
  );

  const execute = useCallback(
    async (bridgeAmount: bigint) => {
      const actualAmount = bridgeAmount > 0n ? bridgeAmount : amount;
      if (actualAmount === 0n) return;
      setAmount(actualAmount);

      const startPhase = phase !== "idle" && phase !== "error" && phase !== "done" && phase !== "timeout"
        ? phase
        : "approve";
      await executeFrom(startPhase, actualAmount);
    },
    [phase, amount, executeFrom]
  );

  const retry = useCallback(() => {
    if (!amount) return;
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
    if (address) clearSession(address);
  }, [address]);

  return {
    steps,
    phase,
    amount,
    execute,
    retry,
    reset,
    isExecuting: phase !== "idle" && phase !== "done" && phase !== "error" && phase !== "timeout",
  };
}
