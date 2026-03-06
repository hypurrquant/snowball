import type { Address } from "viem";

export interface MorphoMarket {
  id: `0x${string}`;
  name: string;
  loanSymbol: string;
  collSymbol: string;
  loanToken: Address;
  collateralToken: Address;
  totalSupply: bigint;
  totalBorrow: bigint;
  utilization: number;
  borrowAPR: number;
  supplyAPY: number;
  oraclePrice: bigint;
  lltv: bigint;
}

export interface MorphoPosition {
  supplyShares: bigint;
  borrowShares: bigint;
  collateral: bigint;
  supplyAssets: bigint;
  borrowAssets: bigint;
  healthFactor: number;
  liquidationPrice: bigint;
}
