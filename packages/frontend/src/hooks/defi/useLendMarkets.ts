"use client";

import { useReadContracts } from "wagmi";
import { SnowballLendABI, MockOracleABI, AdaptiveCurveIRMABI } from "@/abis";
import { LEND, TOKENS } from "@/config/addresses";
import {
  toAssetsDown,
  utilization,
  borrowRateToAPR,
  supplyAPY,
} from "@/lib/lendMath";

export interface LendMarket {
  id: `0x${string}`;
  name: string;
  loanSymbol: string;
  collSymbol: string;
  totalSupply: bigint;
  totalBorrow: bigint;
  utilization: number;
  borrowAPR: number;
  supplyAPY: number;
  oraclePrice: bigint;
  lltv: bigint;
}

export function useLendMarkets() {
  const marketCalls = LEND.markets.flatMap((m) => [
    {
      address: LEND.snowballLend,
      abi: SnowballLendABI,
      functionName: "market" as const,
      args: [m.id] as const,
    },
  ]);

  const oracleAddresses = [
    LEND.oracles.wCTC,
    LEND.oracles.lstCTC,
    LEND.oracles.sbUSD,
  ];

  const oracleCalls = oracleAddresses.map((addr) => ({
    address: addr,
    abi: MockOracleABI,
    functionName: "getPrice" as const,
  }));

  const { data, isLoading, refetch } = useReadContracts({
    contracts: [...marketCalls, ...oracleCalls],
    query: { refetchInterval: 10_000 },
  });

  const markets: LendMarket[] = [];

  if (data) {
    const marketCount = LEND.markets.length;
    for (let i = 0; i < marketCount; i++) {
      const marketResult = data[i];
      if (marketResult?.status !== "success") continue;

      const [
        totalSupplyAssets,
        ,
        totalBorrowAssets,
      ] = marketResult.result as [bigint, bigint, bigint, bigint, bigint, bigint];

      const m = LEND.markets[i];
      const util = utilization(totalBorrowAssets, totalSupplyAssets);
      // Approximate APR (real would come from IRM call)
      const approxBorrowAPR = util * 0.08; // ~8% base rate
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
