// Bridge session persistence (localStorage)
// Extracted from useBridgePipeline.ts — behavior-preserving refactoring

export interface BridgeSession {
  amount: string;
  timestamp: number;
  completedSteps: {
    approve?: string;
    deposit?: string;
    mint?: string;
    burn?: string;
    uscMint?: string;
  };
  /** @deprecated Block number on Sepolia (wrong chain for USC polling) */
  burnBlock?: string;
  /** Timestamp (ms) when burn was confirmed — used to compute USC polling lower bound */
  burnTimestamp?: number;
  /** Step ID that failed — enables retry after page refresh */
  failedStep?: string;
  failedError?: string;
}

const SESSION_KEY_PREFIX = "bridge-session:";

function getSessionKey(address: string) {
  return `${SESSION_KEY_PREFIX}${address.toLowerCase()}`;
}

export function saveSession(address: string, session: BridgeSession) {
  try { localStorage.setItem(getSessionKey(address), JSON.stringify(session)); } catch {}
}

export function loadSession(address: string): BridgeSession | null {
  try {
    const raw = localStorage.getItem(getSessionKey(address));
    if (!raw) return null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const parsed = JSON.parse(raw) as any;
    // TTL: 24 hours
    if (Date.now() - (parsed.timestamp ?? 0) > 86_400_000) {
      localStorage.removeItem(getSessionKey(address));
      return null;
    }
    // Migrate old format (had depositTxHash instead of completedSteps)
    if (!parsed.completedSteps) {
      const migrated: BridgeSession = {
        amount: parsed.amount ?? "0",
        timestamp: parsed.timestamp ?? Date.now(),
        completedSteps: {},
      };
      // Old format had depositTxHash → means approve+deposit were completed
      if (parsed.depositTxHash) {
        migrated.completedSteps.approve = "migrated";
        migrated.completedSteps.deposit = parsed.depositTxHash;
      }
      saveSession(address, migrated);
      return migrated;
    }
    return parsed as BridgeSession;
  } catch { return null; }
}

export function clearSession(address: string) {
  try { localStorage.removeItem(getSessionKey(address)); } catch {}
}
