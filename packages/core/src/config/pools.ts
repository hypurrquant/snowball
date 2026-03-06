import type { Address } from "viem";
import { TOKENS } from "./addresses";

export interface DexPoolDefinition {
  poolAddress: Address;
  name: string;
  token0: Address;
  token1: Address;
  fee: number;
}

// Pool addresses from deployments/creditcoin-testnet/uniswap-v3.json
// token0/token1 order: lower address = token0 (Uniswap V3 convention)
export const DEX_POOLS: DexPoolDefinition[] = [
  {
    poolAddress: "0xb03e78c86eAfd218900904dc01149780E5dDdA16" as Address,
    name: "wCTC / USDC",
    token0: TOKENS.USDC,   // 0x3e31... (lower)
    token1: TOKENS.wCTC,   // 0xdb5c... (higher)
    fee: 3000,
  },
  {
    poolAddress: "0x3528EE3e50296ccB0E5d122d83E4711201C5d470" as Address,
    name: "wCTC / sbUSD",
    token0: TOKENS.sbUSD,  // 0x5772... (lower)
    token1: TOKENS.wCTC,   // 0xdb5c... (higher)
    fee: 3000,
  },
  {
    poolAddress: "0x9eFD61a9b9E63f71419CD5C78Bd0daF8C6528624" as Address,
    name: "sbUSD / USDC",
    token0: TOKENS.USDC,   // 0x3e31... (lower)
    token1: TOKENS.sbUSD,  // 0x5772... (higher)
    fee: 3000,
  },
  {
    poolAddress: "0xe82a00061ddABA64ADAf838E8C7A3629AbE069B8" as Address,
    name: "lstCTC / wCTC",
    token0: TOKENS.lstCTC, // 0x47ad... (lower)
    token1: TOKENS.wCTC,   // 0xdb5c... (higher)
    fee: 3000,
  },
];
