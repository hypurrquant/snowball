export const DEFAULT_FEE_TIER = 3000;
export const DEFAULT_SLIPPAGE_BPS = 50;
export const DEFAULT_ADD_LIQUIDITY_SLIPPAGE_BPS = 500;
export const DEFAULT_DEADLINE_SECONDS = 1200; // 20 minutes

export const RANGE_PRESETS_ADD_PAGE = [
  { label: "Full", tickLower: -887220, tickUpper: 887220 },
  { label: "Safe", tickLower: -60000, tickUpper: 60000 },
  { label: "Common", tickLower: -12000, tickUpper: 12000 },
  { label: "Expert", tickLower: -600, tickUpper: 600 },
] as const;

export const RANGE_PRESETS = [
  { label: "Narrow", percent: 5 },
  { label: "Common", percent: 10 },
  { label: "Wide", percent: 25 },
  { label: "Full", percent: -1 },
  { label: "Custom", percent: 0 },
] as const;
