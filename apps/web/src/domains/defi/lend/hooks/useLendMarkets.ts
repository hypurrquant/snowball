"use client";

import { useReadContracts } from "wagmi";
import { SnowballLendABI, MockOracleABI } from "@/core/abis";
import { LEND, TOKENS } from "@/core/config/addresses";
import {
  toAssetsDown,
  utilization,
  borrowRateToAPR,
  supplyAPY,
} from "@/domains/defi/lend/lib/lendMath";

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
    functionName: "price" as const,
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
      // TODO: 프로덕션 시 AdaptiveCurveIRM.borrowRateView()로 교체 — 현재는 데모용 하드코딩
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
