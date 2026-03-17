// Aave V3 constants

/** RAY = 1e27 — Aave uses ray math for rates */
export const RAY = 10n ** 27n;

/** Seconds per year for APY calculation */
export const SECONDS_PER_YEAR = 31_536_000;

/** Interest rate modes */
export const RATE_MODE = {
  STABLE: 1n,
  VARIABLE: 2n,
} as const;
