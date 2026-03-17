import type { Address } from "viem";
import type { MorphoMarket } from "../morpho/types";

export type RiskLevel = "low" | "medium" | "high";

export interface PathStep {
  action: string;       // e.g., "approve", "supply", "openTrove", "deposit"
  protocol: string;     // e.g., "Aave", "Morpho", "Liquity", "Yield"
  inputToken: string;   // symbol
  outputToken?: string; // symbol (if token changes)
  description: string;  // human-readable
}

export type ProtocolContext =
  | { type: "aave"; asset: Address }
  | { type: "morpho"; market: MorphoMarket }
  | { type: "yieldVault"; vaultAddress: Address; wantToken: Address }
  | { type: "stabilityPool"; branch: "wCTC" | "lstCTC" }
  | { type: "cdpMorpho"; branch: "wCTC" | "lstCTC"; market: MorphoMarket; collAmount: bigint; mintAmount: bigint }
  | { type: "cdpStabilityPool"; branch: "wCTC" | "lstCTC"; collAmount: bigint; mintAmount: bigint };

export interface YieldPath {
  id: string;
  name: string;
  description: string;
  protocol: string;         // primary protocol name
  estimatedAPY: number | null;
  apyLabel: string;         // "7.2%" or "Variable"
  riskLevel: RiskLevel;
  steps: PathStep[];
  stepCount: number;
  protocolContext: ProtocolContext;
  isMultiHop: boolean;
}
