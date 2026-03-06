export interface TroveData {
  id: bigint;
  coll: bigint;
  debt: bigint;
  interestRate: bigint; // annualized, 18 decimals
  icr: number; // %
  status: number; // 0=nonExistent, 1=active, 2=closedByOwner...
}

export interface BranchStats {
  totalColl: bigint;
  totalDebt: bigint;
  price: bigint;
  tcr: number; // %
  mcr: bigint;
  ccr: bigint;
}

export interface SPPosition {
  totalDeposits: bigint;
  userDeposit: bigint;
  collGain: bigint;
  yieldGain: bigint;
}
