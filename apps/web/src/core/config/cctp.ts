import type { Address } from "viem";

// ─── CCTP (Circle Cross-Chain Transfer Protocol) ─────────────────────────────

export interface CCTPChain {
  chainId: number;
  name: string;
  domain: number;
  tokenMessenger: Address;
  messageTransmitter: Address;
  usdc: Address;
}

export const CCTP_CHAINS: CCTPChain[] = [
  {
    chainId: 1,
    name: "Ethereum",
    domain: 0,
    tokenMessenger: "0xbd3fa81b58ba92a82136038b25adec7066af3155" as Address,
    messageTransmitter: "0x0a992d191deec32afe36203ad87d7d289a738f81" as Address,
    usdc: "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48" as Address,
  },
  {
    chainId: 43114,
    name: "Avalanche",
    domain: 1,
    tokenMessenger: "0x6b25532e1060ce10cc3b0a99e5683b91bfde6982" as Address,
    messageTransmitter: "0x8186359af5f57fbb40c6b14a588d2a59c0c29880" as Address,
    usdc: "0xb97ef9ef8734c71904d8002f8b6bc66dd9c48a6e" as Address,
  },
  {
    chainId: 10,
    name: "Optimism",
    domain: 2,
    tokenMessenger: "0x2b4069517957735be00cee0fadae88a26365528f" as Address,
    messageTransmitter: "0x4d41f22c5a0e5c74090899e5a8fb597a8842b3e8" as Address,
    usdc: "0x0b2c639c533813f4aa9d7837caf62653d097ff85" as Address,
  },
  {
    chainId: 42161,
    name: "Arbitrum",
    domain: 3,
    tokenMessenger: "0x19330d10d9cc8751218eaf51e8885d058642e08a" as Address,
    messageTransmitter: "0xc30362313fbba5cf9163f0bb16a0e01f01a896ca" as Address,
    usdc: "0xaf88d065e77c8cc2239327c5edb3a432268e5831" as Address,
  },
];

export function getCCTPChain(chainId: number): CCTPChain | undefined {
  return CCTP_CHAINS.find((c) => c.chainId === chainId);
}
