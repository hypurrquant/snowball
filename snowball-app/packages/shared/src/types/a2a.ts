// A2A Protocol Types (Agent-to-Agent)

export interface A2ARequest {
  method: string;
  params: Record<string, unknown>;
  id: string;
}

export interface A2AResponse {
  result?: unknown;
  error?: { code: number; message: string };
  id: string;
}

export interface TroveOperation {
  type: "open" | "adjust" | "close";
  branchIndex: number;
  owner: string;
  collAmount?: bigint;
  debtAmount?: bigint;
  interestRate?: bigint;
  troveId?: number;
  collChange?: bigint;
  isCollIncrease?: boolean;
  debtChange?: bigint;
  isDebtIncrease?: boolean;
}

export interface SPOperation {
  type: "deposit" | "withdraw" | "claim";
  branchIndex: number;
  depositor: string;
  amount?: bigint;
}

export interface UnsignedTxData {
  to: string;
  data: string;
  value: string;
  gasLimit?: string;
  chainId: number;
}

export interface SPUserDeposit {
  branch: number;
  collateralSymbol: string;
  deposit: string;
  boldGain: string;
  collGain: string;
}
