import { parseEther, type Address } from "viem";
import { TOKENS } from "@/core/config/addresses";

// Known tokens for getPermission query
export const KNOWN_TOKENS: Address[] = [TOKENS.wCTC, TOKENS.sbUSD, TOKENS.lstCTC, TOKENS.USDC];

// Default tag for reputation queries
export const GENERAL_TAG = "general";

// Default permission expiry: 30 days in seconds
export const PERMISSION_EXPIRY_SECONDS = 30 * 24 * 3600;

// Liquity interest rate delegate bounds
export const AGENT_RATE_BOUNDS = {
  minInterestRate: parseEther("0.005"),
  maxInterestRate: parseEther("0.15"),
};
