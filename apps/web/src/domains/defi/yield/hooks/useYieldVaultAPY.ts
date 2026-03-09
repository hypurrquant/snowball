"use client";

import { useReadContracts } from "wagmi";
import { SnowballLendABI, AdaptiveCurveIRMABI } from "@/core/abis";
import { YIELD, LEND } from "@/core/config/addresses";
import { borrowRateToAPR, utilization, supplyAPY } from "@/domains/defi/morpho/lib/morphoMath";
import { FALLBACK_BORROW_APR_MULTIPLIER, type MarketTuple, type ParamsTuple } from "@/domains/defi/morpho/lib/constants";
import { STRATEGY_FEE_MULTIPLIER, morphoVaults } from "../lib/constants";
import type { Address } from "viem";

export type ApyState =
  | { kind: "loading" }
  | { kind: "variable" }
  | { kind: "ready"; value: number }
  | { kind: "error" };

export function useYieldVaultAPY(): Record<Address, ApyState> {
  // Phase 1: market data + idToMarketParams for each morpho vault
  const phase1Calls = morphoVaults.flatMap((v) => [
    {
      address: LEND.snowballLend,
      abi: SnowballLendABI,
      functionName: "market" as const,
      args: [v.morphoMarketId] as const,
    },
    {
      address: LEND.snowballLend,
      abi: SnowballLendABI,
      functionName: "idToMarketParams" as const,
      args: [v.morphoMarketId] as const,
    },
  ]);

  const { data: phase1Data, isError: phase1Error } = useReadContracts({
    contracts: phase1Calls,
    query: { refetchInterval: 30_000 },
  });

  // Phase 2: IRM borrowRateView (depends on phase 1)
  // Track which irmCalls index maps to which morphoVault index
  const irmIndexToMorphoIdx: number[] = [];
  const irmCalls = phase1Data
    ? morphoVaults
        .map((_, i) => {
          const marketResult = phase1Data[i * 2];
          const paramsResult = phase1Data[i * 2 + 1];
          if (marketResult?.status !== "success" || paramsResult?.status !== "success") return null;

          const [tsa, tss, tba, tbs, lastUpdate, fee] = marketResult.result as MarketTuple;
          const [loanToken, collateralToken, oracle, irm, lltv] = paramsResult.result as ParamsTuple;

          irmIndexToMorphoIdx.push(i);
          return {
            address: LEND.adaptiveCurveIRM,
            abi: AdaptiveCurveIRMABI,
            functionName: "borrowRateView" as const,
            args: [
              { loanToken, collateralToken, oracle, irm, lltv },
              { totalSupplyAssets: tsa, totalSupplyShares: tss, totalBorrowAssets: tba, totalBorrowShares: tbs, lastUpdate, fee },
            ] as const,
          };
        })
        .filter((c): c is NonNullable<typeof c> => c !== null)
    : [];

  // Build reverse lookup: morphoVaultIdx → irmData index
  const morphoIdxToIrmIdx = new Map<number, number>();
  irmIndexToMorphoIdx.forEach((morphoIdx, irmIdx) => {
    morphoIdxToIrmIdx.set(morphoIdx, irmIdx);
  });

  const irmEnabled = irmCalls.length > 0;
  const { data: irmData, isError: irmError } = useReadContracts({
    contracts: irmCalls,
    query: { enabled: irmEnabled, refetchInterval: 30_000 },
  });

  // Phase 2 is still loading if calls were issued but data hasn't arrived
  const irmLoading = irmEnabled && !irmData && !irmError;

  // Build result
  const result: Record<Address, ApyState> = {};

  for (const vault of YIELD.vaults) {
    if (vault.strategyType === "stabilityPool") {
      result[vault.address] = { kind: "variable" };
      continue;
    }

    const morphoIdx = morphoVaults.findIndex((v) => v.address === vault.address);
    if (morphoIdx === -1) {
      result[vault.address] = { kind: "error" };
      continue;
    }

    if (phase1Error) {
      result[vault.address] = { kind: "error" };
      continue;
    }
    if (!phase1Data) {
      result[vault.address] = { kind: "loading" };
      continue;
    }

    const marketResult = phase1Data[morphoIdx * 2];
    const paramsResult = phase1Data[morphoIdx * 2 + 1];
    if (marketResult?.status !== "success") {
      result[vault.address] = { kind: "error" };
      continue;
    }
    if (paramsResult?.status !== "success") {
      result[vault.address] = { kind: "error" };
      continue;
    }

    // Phase 2 query-level error — RPC failure
    if (irmError) {
      result[vault.address] = { kind: "error" };
      continue;
    }

    // Phase 2 still loading — keep skeleton
    if (irmLoading) {
      result[vault.address] = { kind: "loading" };
      continue;
    }

    const [totalSupplyAssets, , totalBorrowAssets] = marketResult.result as MarketTuple;
    const util = utilization(totalBorrowAssets, totalSupplyAssets);

    let borrowAPR: number;
    const irmIdx = morphoIdxToIrmIdx.get(morphoIdx);
    const irmResult = irmIdx !== undefined ? irmData?.[irmIdx] : undefined;
    if (irmResult?.status === "success") {
      borrowAPR = borrowRateToAPR(irmResult.result as bigint);
    } else if (irmResult?.status === "failure") {
      borrowAPR = util * FALLBACK_BORROW_APR_MULTIPLIER; // fallback approximation for on-chain failure
    } else {
      // irmResult undefined but irmData loaded — idToMarketParams must have failed for this vault
      result[vault.address] = { kind: "error" };
      continue;
    }

    const netAPY = supplyAPY(borrowAPR, util) * STRATEGY_FEE_MULTIPLIER;
    result[vault.address] = { kind: "ready", value: netAPY };
  }

  return result;
}
