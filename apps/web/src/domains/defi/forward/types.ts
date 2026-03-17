import type { Address } from "viem";

export interface ForwardMarket {
  id: `0x${string}`;
  name: string;
  pair: string;
}

export interface ForwardPosition {
  tokenId: bigint;
  marketId: `0x${string}`;
  notional: bigint;        // USDC 6 decimals
  forwardRate: bigint;     // 18 decimals (signed)
  maturityTime: bigint;
  collateral: bigint;      // USDC 6 decimals
  counterparty: Address;
  originalOwner: Address;
  isLong: boolean;
  settled: boolean;
  locked: boolean;
  pairedTokenId: bigint;
}

export interface ForwardVaultBalance {
  free: bigint;   // USDC 6 decimals
  locked: bigint; // USDC 6 decimals
}

export interface ForwardListing {
  tokenId: bigint;
  seller: Address;
  askPrice: bigint;
  listedAt: bigint;
}
