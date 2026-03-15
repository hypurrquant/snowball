import { RATE_DECIMALS, USDC_DECIMALS } from "./constants";

/** Format forward rate from 18-decimal bigint to human-readable */
export function formatForwardRate(rate: bigint): string {
  return (Number(rate) / 10 ** RATE_DECIMALS).toFixed(4);
}

/** Format USDC amount (6 decimals) to human-readable */
export function formatUSDC(amount: bigint): string {
  return (Number(amount) / 10 ** USDC_DECIMALS).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/** Calculate PnL for a forward position given settlement rate */
export function calculatePnL(
  notional: bigint,
  forwardRate: bigint,
  settlementRate: bigint,
  isLong: boolean,
): bigint {
  const diff = settlementRate - forwardRate;
  const pnl = (notional * diff) / BigInt(10 ** RATE_DECIMALS);
  return isLong ? pnl : -pnl;
}

/** Check if position has matured */
export function isMatured(maturityTime: bigint): boolean {
  return BigInt(Math.floor(Date.now() / 1000)) >= maturityTime;
}
