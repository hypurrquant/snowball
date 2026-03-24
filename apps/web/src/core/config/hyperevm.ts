import type { Address } from "viem";
import { zeroAddress } from "viem";

// ─── HyperEVM chain id ────────────────────────────────────────────────────────
export const HYPEREVM_CHAIN_ID = 999;

// ─── Felix (Liquity fork on HyperEVM) ────────────────────────────────────────
export const FELIX = {
  hintHelpers: zeroAddress as Address,
  branches: {
    HYPE: {
      borrowerOperations: zeroAddress as Address,
      troveManager: zeroAddress as Address,
      sortedTroves: zeroAddress as Address,
      stabilityPool: zeroAddress as Address,
    },
  },
} as const;

// ─── HyperLend (Aave V3 fork on HyperEVM) ────────────────────────────────────
export const HYPERLEND = {
  pool: zeroAddress as Address,
  markets: [] as Array<{
    symbol: string;
    underlying: Address;
    hToken: Address;
    debtToken: Address;
    decimals: number;
  }>,
} as const;
