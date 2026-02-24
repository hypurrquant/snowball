// Agent Types

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
