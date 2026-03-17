export const DEFAULT_BORROW_RATE = 5; // 5% APR for Liquity CDP cost estimate

export const RISK_DESCRIPTIONS: Record<string, string> = {
  low: "Low risk — single protocol, no liquidation exposure",
  medium: "Medium risk — involves CDP with liquidation risk",
  high: "High risk — multiple protocols with compounding risks",
};

// LTV for each Liquity branch (used to calculate mintable sbUSD)
export const LIQUITY_LTV: Record<string, number> = {
  wCTC: 0.65,   // 65% LTV
  lstCTC: 0.70, // 70% LTV
};
