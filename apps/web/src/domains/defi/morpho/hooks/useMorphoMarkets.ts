"use client";

import { useReadContracts } from "wagmi";
import { SnowballLendABI, MockOracleABI } from "@/core/abis";
import { LEND } from "@/core/config/addresses";
import { utilization, supplyAPY } from "../lib/morphoMath";
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

  const { data, isLoading, refetch } = useReadContracts({
    contracts: [...marketCalls, ...oracleCalls],
    query: { refetchInterval: 10_000 },
  });

  const markets: MorphoMarket[] = [];

  if (data) {
    const marketCount = LEND.markets.length;
    for (let i = 0; i < marketCount; i++) {
      const marketResult = data[i];
      if (marketResult?.status !== "success") continue;

      const [totalSupplyAssets, , totalBorrowAssets] = marketResult.result as [
        bigint, bigint, bigint, bigint, bigint, bigint,
      ];

      const m = LEND.markets[i];
      const util = utilization(totalBorrowAssets, totalSupplyAssets);
      const approxBorrowAPR = util * 0.08;
      const approxSupplyAPY = supplyAPY(approxBorrowAPR, util);

      const oracleIdx = i < oracleAddresses.length ? marketCount + i : 0;
      const oracleResult = data[oracleIdx];
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
        borrowAPR: approxBorrowAPR,
        supplyAPY: approxSupplyAPY,
        oraclePrice,
        lltv: m.lltv,
      });
    }
  }

  return { markets, isLoading, refetch };
}
