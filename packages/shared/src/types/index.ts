// ==================== Contract Types ====================

export interface DeployedAddresses {
  network: {
    name: string;
    chainId: number;
    rpc: string;
    explorer: string;
  };
  tokens: {
    wCTC: string;
    lstCTC: string;
    sbUSD: string;
  };
  branches: {
    wCTC: BranchAddresses;
    lstCTC: BranchAddresses;
  };
  shared: {
    collateralRegistry: string;
    hintHelpers: string;
    multiTroveGetter: string;
    agentVault?: string;
    smartAccountFactory?: string;
  };
  erc8004?: {
    identityRegistry: string;
    reputationRegistry: string;
    validationRegistry: string;
  };
}

export interface BranchAddresses {
  addressesRegistry: string;
  borrowerOperations: string;
  troveManager: string;
  stabilityPool: string;
  activePool: string;
  defaultPool: string;
  gasPool: string;
  collSurplusPool: string;
  sortedTroves: string;
  troveNFT: string;
  priceFeed: string;
}

// ==================== API Types ====================

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

export interface ChatMessage {
  userAddress: string;
  message: string;
  conversationId?: string;
}

export interface ChatResponse {
  reply: string;
  conversationId: string;
  suggestedActions: string[];
  relatedData?: {
    currentCR?: string;
    liquidationPrice?: string;
    healthStatus?: "safe" | "warning" | "danger";
  };
}

export interface AgentInfo {
  id: number;
  name: string;
  agentType: string;
  owner: string;
  endpoint: string;
  isActive: boolean;
  registeredAt: number;
  reputationScore?: number;
  successRate?: number;
}

// ==================== A2A Protocol Types ====================

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

// ==================== SmartAccount Types ====================

export interface SmartAccountInfo {
  address: string;
  owner: string;
  agents: string[];
  balances: {
    wCTC: string;
    lstCTC: string;
    sbUSD: string;
  };
}

// ==================== AgentVault Types ====================

export interface AgentPermission {
  allowedTargets: string[];
  allowedFunctions: string[];  // bytes4 hex selectors
  spendingCap: string;         // wei
  spent: string;               // wei
  expiry: number;              // unix timestamp (0 = no expiry)
  active: boolean;
}

export interface AgentVaultBalance {
  token: string;
  symbol: string;
  balance: string;  // wei
}

export interface AgentSettings {
  userAddress: string;
  agentAddress: string;
  strategy: "conservative" | "moderate" | "aggressive";
  minCR: number;
  autoRebalance: boolean;
  autoRateAdjust: boolean;
  spendingCap: string;     // wei
  expiryDays: number;
  allowedActions: string[];  // human-readable action names
}
