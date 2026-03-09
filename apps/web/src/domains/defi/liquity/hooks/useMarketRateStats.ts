import { useMemo } from "react";
import { useAllTroves } from "./useAllTroves";
import { computeRateStats, type RateStats } from "../lib/liquityMath";

export type { RateStats as MarketRateStats } from "../lib/liquityMath";

export function useMarketRateStats(
  branch: "wCTC" | "lstCTC",
): RateStats | null {
  const { troves } = useAllTroves(branch);

  return useMemo(() => {
    const rates = troves.map((t) => Number(t.annualInterestRate) / 1e16);
    return computeRateStats(rates);
  }, [troves]);
}
