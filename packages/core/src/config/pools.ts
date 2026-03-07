import type { Address } from "viem";
import { TOKENS } from "./addresses";

export interface DexPoolDefinition {
  poolAddress: Address;
  name: string;
  token0: Address;
  token1: Address;
  fee: number;
}

// Pool addresses from Factory.getPool() on-chain query (2026-03-07)
// token0/token1 order: lower address = token0 (Uniswap V3 convention)
// USDC(0x60) < sbUSD(0x8a) < lstCTC(0xa7) < wCTC(0xca)
export const DEX_POOLS: DexPoolDefinition[] = [
  {
    poolAddress: "0xb6Db55F3d318B6b0C37777A818C2c195181B94C9" as Address,
    name: "wCTC / USDC",
    token0: TOKENS.USDC,
    token1: TOKENS.wCTC,
    fee: 3000,
  },
  {
    poolAddress: "0x23e6152CC07d4DEBA597c9e975986E2B307E8874" as Address,
    name: "wCTC / sbUSD",
    token0: TOKENS.sbUSD,
    token1: TOKENS.wCTC,
    fee: 3000,
  },
  {
    poolAddress: "0xe70647BF2baB8282B65f674b0DF8B7f0bb658859" as Address,
    name: "sbUSD / USDC",
    token0: TOKENS.USDC,
    token1: TOKENS.sbUSD,
    fee: 500,
  },
  {
    poolAddress: "0xee0AF4a1Aa3ce7447248f87c384b8bE7de302DA5" as Address,
    name: "lstCTC / wCTC",
    token0: TOKENS.lstCTC,
    token1: TOKENS.wCTC,
    fee: 3000,
  },
  {
    poolAddress: "0x394ECC1c9094F5E3D83a6C9497a33a969e9B136a" as Address,
    name: "lstCTC / USDC",
    token0: TOKENS.USDC,
    token1: TOKENS.lstCTC,
    fee: 3000,
  },
];
