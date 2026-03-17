import type { Address } from "viem";

export interface UnifiedSupplyMarket {
  protocol: "morpho" | "aave";
  asset: Address;
  assetSymbol: string;
  assetDecimals: number;
  supplyAPY: number;       // Both normalized to APY (percentage)
  totalSupply: bigint;
  ltv: number;             // Percentage (e.g., 65 means 65%)
  liquidationThreshold: number;
  isActive: boolean;
  // Protocol-specific raw data for linking to detail pages
  raw: {
    morphoMarketId?: `0x${string}`;
    aaveReserveAddress?: Address;
  };
}

export interface UnifiedBorrowMarket {
  protocol: "morpho" | "aave";
  asset: Address;
  assetSymbol: string;
  assetDecimals: number;
  borrowAPY: number;       // Normalized to APY
  borrowAPR: number;       // Normalized to APR
  totalBorrow: bigint;
  ltv: number;
  liquidationThreshold: number;
  isActive: boolean;
  raw: {
    morphoMarketId?: `0x${string}`;
    aaveReserveAddress?: Address;
  };
}
