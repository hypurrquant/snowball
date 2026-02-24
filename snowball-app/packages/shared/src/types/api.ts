// API Types

export interface ProtocolStats {
  totalCollateralUSD: string;
  totalBorrowedUSD: string;
  sbUSDPrice: string;
  activeAgents: number;
}

export interface MarketData {
  branch: number;
  collateralSymbol: string;
  collateralAddress: string;
  totalCollateral: string;
  totalCollateralUSD: string;
  currentCR: string;
  mcr: string;
  ccr: string;
  ltv: string;
  totalBorrow: string;
  avgInterestRate: string;
  spDeposits: string;
  spAPY: string;
}

export interface UserPosition {
  troveId: number;
  branch: number;
  collateralSymbol: string;
  collateral: string;
  collateralUSD: string;
  debt: string;
  cr: string;
  interestRate: string;
  liquidationPrice: string;
  agentManaged: boolean;
  agentStrategy: string;
  status: "active" | "closedByOwner" | "closedByLiquidation" | "closedByRedemption";
  redemptionRisk?: "low" | "medium" | "high";
}

export interface UserBalance {
  nativeCTC: string;
  wCTC: string;
  lstCTC: string;
  sbUSD: string;
}

export interface AgentRecommendation {
  strategy: string;
  recommendedCR: number;
  recommendedDebt: string;
  recommendedInterestRate: string;
  estimatedAPY: string;
  liquidationPrice: string;
  reasoning: string;
}

export interface AgentExecuteRequest {
  userAddress: string;
  action: "openTrove" | "adjustTrove" | "closeTrove";
  params: {
    branch: number;
    collateralAmount?: string;
    debtAmount?: string;
    interestRate?: string;
    agentManaged?: boolean;
    troveId?: number;
    collChange?: string;
    isCollIncrease?: boolean;
    debtChange?: string;
    isDebtIncrease?: boolean;
  };
}

export interface AgentExecuteResponse {
  txHash: string;
  troveId?: number;
  status: "success" | "failed" | "pending";
  error?: string;
}
