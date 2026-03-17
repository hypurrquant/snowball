/**
 * Convert APR (simple annual rate) to APY (compound annual yield).
 * Formula: APY = (1 + APR/n)^n - 1, using continuous compounding: e^APR - 1
 * Input/output are percentages (e.g., 5 means 5%).
 */
export function aprToAPY(aprPercent: number): number {
  const apr = aprPercent / 100;
  return (Math.exp(apr) - 1) * 100;
}

/**
 * Convert APY (compound annual yield) to APR (simple annual rate).
 * Formula: APR = ln(1 + APY)
 * Input/output are percentages.
 */
export function apyToAPR(apyPercent: number): number {
  const apy = apyPercent / 100;
  return Math.log(1 + apy) * 100;
}
