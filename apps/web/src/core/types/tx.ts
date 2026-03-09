export type TxStepStatus = "pending" | "executing" | "confirming" | "done" | "error";
export type TxStepType =
  | "approve"
  | "mint"
  | "openTrove"
  | "adjustTrove"
  | "adjustRate"
  | "closeTrove"
  | "supply"
  | "withdraw"
  | "supplyCollateral"
  | "borrow"
  | "repay"
  | "withdrawCollateral"
  | "deposit"
  | "swap"
  | "claim"
  | "vaultDeposit"
  | "bridgeBurn"
  | "attestWait"
  | "uscMint"
  | "delegate";
export type TxPhase = "idle" | "executing" | "complete" | "error";

export interface TxStep {
  id: string;
  type: TxStepType;
  label: string;
  status: TxStepStatus;
  txHash?: `0x${string}`;
  error?: string;
  chainId?: number;
}
