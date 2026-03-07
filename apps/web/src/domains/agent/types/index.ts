import type { Address } from "viem";

export interface AgentInfo {
  name: string;
  agentType: string;
  endpoint: Address;
  registeredAt: bigint;
  isActive: boolean;
}

export interface Review {
  reviewer: Address;
  agentId: bigint;
  score: bigint; // 100-500 (1.00-5.00 scaled)
  comment: string;
  timestamp: bigint;
}

export interface ReputationData {
  totalInteractions: bigint;
  successfulInteractions: bigint;
  reputationScore: bigint; // scaled by 1e2
  decimals: number;
}

export interface Validation {
  status: number; // 0=Unvalidated, 1=Pending, 2=Validated, 3=Suspended, 4=Revoked
  validator: Address;
  validatedAt: bigint;
  expiresAt: bigint;
  certificationURI: string;
}

export interface TokenAllowanceView {
  token: Address;
  cap: bigint;
  spent: bigint;
}

export interface Permission {
  allowedTargets: readonly Address[];
  allowedFunctions: readonly `0x${string}`[];
  expiry: bigint;
  active: boolean;
  tokenAllowances: readonly TokenAllowanceView[];
}
