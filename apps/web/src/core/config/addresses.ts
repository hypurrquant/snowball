export * from "@snowball/core/src/config/addresses";

// Backend API (Next.js-specific, uses process.env)
export const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000";
export const CHAT_API_BASE = process.env.NEXT_PUBLIC_CHAT_API_BASE || "http://localhost:3002/api";

// ─── Multi-chain config (web-only) ───────────────────────────────────────────

import { TOKENS, TOKEN_INFO } from "@snowball/core/src/config/addresses";
import type { Address } from "viem";

export const DEFAULT_CHAIN_ID = 102031;

interface ChainConfig {
  name: string;
  rpcUrl: string;
  tokens: Record<string, Address>;
  tokenInfo: typeof TOKEN_INFO;
}

export const CHAIN_CONFIGS: Record<number, ChainConfig> = {
  102031: {
    name: "Creditcoin Testnet",
    rpcUrl: "https://rpc.cc3-testnet.creditcoin.network",
    tokens: TOKENS as unknown as Record<string, Address>,
    tokenInfo: TOKEN_INFO,
  },
  91342: {
    name: "GIWA Sepolia",
    rpcUrl: "https://sepolia-rpc.giwa.io/",
    tokens: TOKENS as unknown as Record<string, Address>,
    tokenInfo: TOKEN_INFO,
  },
};

export const SUPPORTED_CHAINS = [102031, 91342] as const;

export function getChainConfig(chainId: number): ChainConfig {
  return CHAIN_CONFIGS[chainId] ?? CHAIN_CONFIGS[DEFAULT_CHAIN_ID];
}
