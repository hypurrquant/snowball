import type { Address } from "viem";

export interface AaveMarket {
  symbol: string;
  underlying: Address;
  decimals: number;
  aTokenAddress: Address;
  variableDebtTokenAddress: Address;
  totalSupply: bigint;
  totalBorrow: bigint;
  supplyAPY: number;
  borrowAPY: number;
  ltv: number;
  liquidationThreshold: number;
  isActive: boolean;
  isFrozen: boolean;
  price: bigint;
}

export interface AaveUserPosition {
  totalCollateralBase: bigint;
  totalDebtBase: bigint;
  availableBorrowsBase: bigint;
  currentLiquidationThreshold: number;
  ltv: number;
  healthFactor: number;
}

export interface AaveUserReserve {
  symbol: string;
  underlying: Address;
  aTokenBalance: bigint;
  stableDebt: bigint;
  variableDebt: bigint;
  usageAsCollateralEnabled: boolean;
}
