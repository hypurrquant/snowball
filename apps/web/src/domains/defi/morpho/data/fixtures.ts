import { parseEther } from "viem";
import type { MorphoPosition } from "../types";

export const DEMO_POSITIONS: MorphoPosition[] = [
  {
    supplyShares: parseEther("5000"),
    borrowShares: 0n,
    collateral: 0n,
    supplyAssets: parseEther("5000"),
    borrowAssets: 0n,
    healthFactor: Infinity,
    liquidationPrice: 0n,
  },
  {
    supplyShares: 0n,
    borrowShares: parseEther("2000"),
    collateral: parseEther("50"),
    supplyAssets: 0n,
    borrowAssets: parseEther("2000"),
    healthFactor: 1.925,
    liquidationPrice: parseEther("52"),
  },
  {
    supplyShares: parseEther("10000"),
    borrowShares: parseEther("3000"),
    collateral: parseEther("100"),
    supplyAssets: parseEther("10000"),
    borrowAssets: parseEther("3000"),
    healthFactor: 2.57,
    liquidationPrice: parseEther("39"),
  },
];
