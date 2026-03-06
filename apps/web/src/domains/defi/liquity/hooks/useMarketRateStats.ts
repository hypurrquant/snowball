import { useMemo } from "react";
import { useAllTroves } from "./useAllTroves";

export interface MarketRateStats {
  median: number; // %
  mean: number;   // %
  min: number;    // %
  max: number;    // %
  count: number;
}

export function useMarketRateStats(
  branch: "wCTC" | "lstCTC",
): MarketRateStats | null {
  const { troves } = useAllTroves(branch);

  return useMemo(() => {
    if (troves.length === 0) return null;

    const rates = troves
      .map((t) => Number(t.annualInterestRate) / 1e16)
      .sort((a, b) => a - b);

    const count = rates.length;
    const sum = rates.reduce((a, b) => a + b, 0);
    const mean = sum / count;

    const mid = Math.floor(count / 2);
    const median =
      count % 2 === 0 ? (rates[mid - 1] + rates[mid]) / 2 : rates[mid];

    return {
      median,
      mean,
      min: rates[0],
      max: rates[count - 1],
      count,
    };
  }, [troves]);
}
