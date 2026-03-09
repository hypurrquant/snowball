"use client";

import { useReadContracts } from "wagmi";
import { SnowballLendABI, MockOracleABI, AdaptiveCurveIRMABI } from "@/core/abis";
import { LEND } from "@/core/config/addresses";
import { utilization, supplyAPY, borrowRateToAPR } from "../lib/morphoMath";
import { FALLBACK_BORROW_APR_MULTIPLIER, type MarketTuple } from "../lib/constants";
import { getMarketParams } from "../lib/marketParams";
import type { MorphoMarket } from "../types";

export function useMorphoMarkets() {
  const marketCalls = LEND.markets.map((m) => ({
    address: LEND.snowballLend,
    abi: SnowballLendABI,
    functionName: "market" as const,
    args: [m.id] as const,
  }));

  const oracleAddresses = [
    LEND.oracles.wCTC,
    LEND.oracles.lstCTC,
    LEND.oracles.sbUSD,
  ];

  const oracleCalls = oracleAddresses.map((addr) => ({
    address: addr,
    abi: MockOracleABI,
    functionName: "price" as const,
  }));

  // Phase 1: market data + oracle prices
  const { data: phase1Data, isLoading: phase1Loading, refetch } = useReadContracts({
    contracts: [...marketCalls, ...oracleCalls],
    query: { refetchInterval: 10_000 },
  });

  // Phase 2: IRM borrowRateView (depends on phase 1 market data)
  const marketCount = LEND.markets.length;

  const irmCalls = phase1Data
    ? LEND.markets.map((m, i) => {
        const raw = phase1Data[i];
        if (raw?.status !== "success") return null;
        const [tsa, tss, tba, tbs, lastUpdate, fee] = raw.result as MarketTuple;
        return {
          address: LEND.adaptiveCurveIRM,
          abi: AdaptiveCurveIRMABI,
          functionName: "borrowRateView" as const,
          args: [
            getMarketParams(m),
            { totalSupplyAssets: tsa, totalSupplyShares: tss, totalBorrowAssets: tba, totalBorrowShares: tbs, lastUpdate, fee },
          ] as const,
        };
      }).filter((c): c is NonNullable<typeof c> => c !== null)
    : [];

  const { data: irmData } = useReadContracts({
    contracts: irmCalls,
    query: { enabled: irmCalls.length > 0, refetchInterval: 10_000 },
  });

  const markets: MorphoMarket[] = [];

  if (phase1Data) {
    for (let i = 0; i < marketCount; i++) {
      const marketResult = phase1Data[i];
      if (marketResult?.status !== "success") continue;

      const [totalSupplyAssets, , totalBorrowAssets] = marketResult.result as MarketTuple;

      const m = LEND.markets[i];
      const util = utilization(totalBorrowAssets, totalSupplyAssets);

      // Use real IRM rate if available, fallback to approximation
      let borrowAPR: number;
      const irmResult = irmData?.[i];
      if (irmResult?.status === "success") {
        borrowAPR = borrowRateToAPR(irmResult.result as bigint);
      } else {
        borrowAPR = util * FALLBACK_BORROW_APR_MULTIPLIER;
      }

      const oracleIdx = i < oracleAddresses.length ? marketCount + i : 0;
      const oracleResult = phase1Data[oracleIdx];
      const oraclePrice =
        oracleResult?.status === "success"
          ? (oracleResult.result as bigint)
          : 0n;

      markets.push({
        id: m.id,
        name: m.name,
        loanSymbol: m.loanSymbol,
        collSymbol: m.collSymbol,
        loanToken: m.loanToken,
        collateralToken: m.collateralToken,
        totalSupply: totalSupplyAssets,
        totalBorrow: totalBorrowAssets,
        utilization: util,
        borrowAPR,
        supplyAPY: supplyAPY(borrowAPR, util),
        oraclePrice,
        lltv: m.lltv,
      });
    }
  }

  const isLoading = phase1Loading;
  return { markets, isLoading, refetch };
}
