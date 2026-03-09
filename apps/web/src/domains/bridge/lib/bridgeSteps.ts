// Bridge step/phase constants and pure logic
// Extracted from useBridgePipeline.ts — behavior-preserving refactoring

import type { TxStep } from "@/shared/types/tx";
import { creditcoinTestnet, sepoliaChain, uscTestnet } from "@/core/config/chain";
import type { BridgeSession } from "./bridgeSession";

export type BridgePhase =
  | "idle"
  | "approve"
  | "deposit"
  | "mint"
  | "burn"
  | "attestWait"
  | "done"
  | "error"
  | "timeout";

export const ATTEST_TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes
export const ATTEST_POLL_MS = 10_000; // 10 seconds

export function createInitialSteps(): TxStep[] {
  return [
    { id: "approve", type: "approve", label: "Approve USDC", status: "pending", chainId: creditcoinTestnet.id },
    { id: "deposit", type: "vaultDeposit", label: "Send USDC via Wormhole", status: "pending", chainId: creditcoinTestnet.id },
    { id: "mint", type: "mint", label: "Mint DN (Eth Sepolia)", status: "pending", chainId: sepoliaChain.id },
    { id: "burn", type: "bridgeBurn", label: "Bridge Burn DN", status: "pending", chainId: sepoliaChain.id },
    { id: "attest", type: "attestWait", label: "Attestation (~5 min)", status: "pending", chainId: uscTestnet.id },
    { id: "uscMint", type: "uscMint", label: "CTC USC Mint (Auto)", status: "pending", chainId: uscTestnet.id },
  ];
}

export const PHASE_STEP_MAP: Record<string, string> = {
  approve: "approve",
  deposit: "deposit",
  mint: "mint",
  burn: "burn",
  attestWait: "attest",
};

// Step order and phase-after-step mapping used by session recovery
const STEP_ORDER = ["approve", "deposit", "mint", "burn", "uscMint"] as const;

const PHASE_AFTER_STEP: Record<string, BridgePhase> = {
  approve: "deposit",
  deposit: "mint",
  mint: "burn",
  burn: "attestWait",
  uscMint: "done",
};

const STEP_ID_MAP: Record<string, string> = {
  approve: "approve",
  deposit: "deposit",
  mint: "mint",
  burn: "burn",
  uscMint: "uscMint",
};

export interface ResumePhaseResult {
  lastCompleted: number;
  nextPhase: BridgePhase;
  restoredSteps: TxStep[];
}

/**
 * Given a saved session, determine resume state:
 * - which steps are already done
 * - what phase to resume from
 * - restored step array with statuses applied
 */
export function resolveResumePhase(session: BridgeSession): ResumePhaseResult | null {
  const completed = session.completedSteps;

  // Find the last completed step
  let lastCompleted = -1;
  for (let i = 0; i < STEP_ORDER.length; i++) {
    if (completed[STEP_ORDER[i]]) lastCompleted = i;
    else break;
  }

  if (lastCompleted < 0) return null; // Nothing completed

  // Restore step statuses + txHashes
  const restoredSteps = createInitialSteps().map((s) => {
    // Mark completed steps
    for (let i = 0; i <= lastCompleted; i++) {
      const key = STEP_ORDER[i];
      if (s.id === STEP_ID_MAP[key]) {
        return { ...s, status: "done" as const, txHash: completed[key] as `0x${string}` | undefined };
      }
    }
    // If this is the attestation step and burn is done but uscMint is not, mark as executing
    if (s.id === "attest" && completed.burn && !completed.uscMint) {
      return { ...s, status: "executing" as const };
    }
    // If this is the failed step, mark it
    if (session.failedStep && s.id === session.failedStep) {
      return { ...s, status: "error" as const, error: session.failedError ?? "Transaction failed" };
    }
    return s;
  });

  // Determine next phase
  const nextPhase: BridgePhase = session.failedStep
    ? "error"
    : PHASE_AFTER_STEP[STEP_ORDER[lastCompleted]];

  return { lastCompleted, nextPhase, restoredSteps };
}
