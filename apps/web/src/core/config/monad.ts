import type { Address } from "viem";
import { zeroAddress } from "viem";

// ─── Euler (Lending on Monad) ─────────────────────────────────────────────────
export const EULER = {
  pool: zeroAddress as Address,
} as const;

// ─── Kuru Exchange (Order Book DEX on Monad) ──────────────────────────────────
export const KURU = {
  router: zeroAddress as Address,
} as const;

// ─── Ambient (AMM DEX on Monad) ───────────────────────────────────────────────
export const AMBIENT = {
  crocSwapDex: zeroAddress as Address,
} as const;
