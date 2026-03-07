export type TxStepStatus = "pending" | "executing" | "done" | "error";
export type TxStepType = "approve" | "mint" | "openTrove";
export type TxPhase = "idle" | "executing" | "complete" | "error";

export interface TxStep {
  id: string;
  type: TxStepType;
  label: string;
  status: TxStepStatus;
  txHash?: `0x${string}`;
  error?: string;
}
