import type { Address } from "viem";

export interface FelixTrove {
  id: bigint;
  collateral: bigint;
  debt: bigint;
  interestRate: bigint;
  icr: number;
  status: number;
}

export interface FelixBranch {
  name: string;
  collToken: string;
  borrowerOperations: Address;
  troveManager: Address;
  stabilityPool: Address;
  sortedTroves: Address;
}
