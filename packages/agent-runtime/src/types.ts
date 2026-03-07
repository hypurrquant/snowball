import type { Abi, Address, PublicClient, WalletClient } from "viem";

// ─── Capability ───

export interface JsonSchema {
  type: string;
  properties?: Record<string, unknown>;
  required?: string[];
}

export interface PermissionSpec {
  target: Address;
  selectors: string[];
}

export interface CheckResult {
  ok: boolean;
  message: string;
}

export interface PreparedCall {
  to: Address;
  abi: Abi;
  functionName: string;
  args: unknown[];
}

export interface Capability<TInput = Record<string, unknown>> {
  id: string;
  description: string;
  inputSchema: JsonSchema;
  requiredPermissions(config: AgentConfig, manifest: AgentManifest): PermissionSpec[];
  preconditions(ctx: ExecutionContext, input: TInput): CheckResult[];
  buildCalls(ctx: ExecutionContext, input: TInput): PreparedCall[];
  buildCallsAsync?(ctx: ExecutionContext, input: TInput): Promise<PreparedCall[]>;
}

// ─── Plan ───

export interface PlanStep {
  capabilityId: string;
  input: Record<string, unknown>;
}

export interface StrategyPlan {
  goal: string;
  steps: PlanStep[];
}

// ─── Snapshot ───

export interface VaultSnapshot {
  balances: Record<string, bigint>; // token address → balance
  permissions: PermissionState[];
}

export interface TokenAllowanceState {
  token: Address;
  cap: bigint;
  spent: bigint;
}

export interface PermissionState {
  agent: Address;
  targets: Address[];
  selectors: string[];
  expiry: bigint;
  active: boolean;
  tokenAllowances: TokenAllowanceState[];
}

export interface MorphoSnapshot {
  supplyAssets: bigint;
  supplyShares: bigint;
  isAuthorized: boolean;
  utilizationRate: number;
}

export interface LiquitySnapshot {
  troveId: bigint;
  hasTrove: boolean;
  collateral: bigint;
  debt: bigint;
  annualInterestRate: bigint;
  lastInterestRateAdjTime: bigint;
  avgInterestRate: bigint; // debt-weighted average from ActivePool
  isAddManager: boolean;
  isInterestDelegate: boolean;
}

export interface Snapshot {
  vault: VaultSnapshot;
  morpho: MorphoSnapshot;
  liquity: LiquitySnapshot;
  timestamp: number;
}

// ─── Execution Context ───

export interface LiquityBranchConfig {
  borrowerOperations: Address;
  troveManager: Address;
  troveNFT: Address;
  sortedTroves: Address;
  hintHelpers: Address;
  collToken: Address;
  activePool: Address;
}

export interface AgentConfig {
  chainId: number;
  rpcUrl: string;
  agentVault: Address;
  agentPrivateKey: `0x${string}`;
  morpho: {
    core: Address;
    marketId: `0x${string}`;
    loanToken: Address;
    collateralToken: Address;
    oracle: Address;
    irm: Address;
    lltv: bigint;
  };
  liquityBranches: Record<"wCTC" | "lstCTC", LiquityBranchConfig>;
}

export interface ExecutionContext {
  config: AgentConfig;
  liquityBranch: LiquityBranchConfig;
  branchName: "wCTC" | "lstCTC";
  user: Address;
  snapshot: Snapshot;
  walletClient: WalletClient;
  publicClient: PublicClient;
}

// ─── Agent Manifest ───

export interface AgentManifest {
  id: string;
  version: string;
  name: string;
  network: { chainId: number };
  llm: {
    provider: string;
    model: string;
    systemPromptFile: string;
  };
  scope: {
    singleUser: boolean;
    morphoMarket: string;
    liquityBranch: string;
    maxSteps: number;
  };
  allowedCapabilities: string[];
  riskPolicy: {
    abortOnFailedPrecondition: boolean;
    cleanupAllowanceAfterUse: boolean;
  };
}

// ─── Run Result ───

export interface RunResult {
  runId: string;
  status: "success" | "no_action" | "error" | "aborted";
  plan: StrategyPlan | null;
  txHashes: string[];
  logs: string[];
  errors: string[];
  reasoning?: string;
  timestamp: number;
  user: Address;
  manifestId: string;
}
