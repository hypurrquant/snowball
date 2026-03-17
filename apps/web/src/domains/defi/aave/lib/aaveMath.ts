import { RAY, SECONDS_PER_YEAR } from "./constants";

/** Convert Aave ray rate (1e27) to APY percentage */
export function rayRateToAPY(rayRate: bigint): number {
  const ratePerSecond = Number(rayRate) / Number(RAY);
  return ((1 + ratePerSecond) ** SECONDS_PER_YEAR - 1) * 100;
}

/** Calculate health factor from Aave getUserAccountData */
export function parseHealthFactor(hf: bigint): number {
  // Aave returns health factor scaled by 1e18
  if (hf >= 10n ** 30n) return Infinity; // no debt
  return Number(hf) / 1e18;
}
