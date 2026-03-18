"use client";

import { useEffect, useRef } from "react";
import { useAccount, useReadContracts, useWatchContractEvent } from "wagmi";
import { erc20Abi } from "viem";
import type { Address } from "viem";
import { toast } from "sonner";
import { useAaveMarkets } from "@/domains/defi/aave/hooks/useAaveMarkets";
import { useMorphoMarkets } from "@/domains/defi/morpho/hooks/useMorphoMarkets";
import { SnowballStakerABI } from "@/core/abis";
import { STAKER, TOKEN_INFO, TOKENS } from "@/core/config/addresses";
import { OpportunityToast } from "@/shared/components/OpportunityToast";
import {
  canShowToast,
  recordToastShown,
  dismissOpportunity,
  isDismissed,
  generateOpportunityId,
} from "@/shared/lib/opportunityStorage";
import React from "react";

// ─── Helpers ───────────────────────────────────────────────────────────────

function fireToast(
  oppId: string,
  title: string,
  description: string,
  directHref: string
): void {
  if (!canShowToast()) return;
  if (isDismissed(oppId)) return;

  toast.custom((toastId: number | string) =>
    React.createElement(OpportunityToast, {
      toastId,
      title,
      description,
      directAction: { label: "직접 실행", href: directHref },
      agentAction: { label: "Agent 자동화 →", href: "/agent" },
      onDismiss: () => {
        dismissOpportunity(oppId);
        toast.dismiss(toastId);
      },
    })
  , { duration: 10_000 });

  recordToastShown();
}

// ─── TOKEN_INFO entries as fixed arrays (avoids hook-in-loop) ──────────────

const TOKEN_ADDRESSES = Object.keys(TOKEN_INFO) as Address[];

// ─── Main hook ─────────────────────────────────────────────────────────────

export function useOpportunityDetector(): void {
  const { address: walletAddress } = useAccount();

  // ── 1. APY change detection ──────────────────────────────────────────────
  const { markets: aaveMarkets } = useAaveMarkets();
  const { markets: morphoMarkets } = useMorphoMarkets();

  // Map: oppId → last known APY (number, %)
  const prevApyRef = useRef<Map<string, number>>(new Map());
  const apyInitializedRef = useRef(false);

  useEffect(() => {
    if (!aaveMarkets.length && !morphoMarkets.length) return;

    // On the very first successful data load, just snapshot — no toast.
    if (!apyInitializedRef.current) {
      for (const m of aaveMarkets) {
        prevApyRef.current.set(generateOpportunityId("apy", `aave-${m.symbol}-supply`), m.supplyAPY);
        prevApyRef.current.set(generateOpportunityId("apy", `aave-${m.symbol}-borrow`), m.borrowAPY);
      }
      for (const m of morphoMarkets) {
        prevApyRef.current.set(generateOpportunityId("apy", `morpho-${m.loanSymbol}-supply`), m.supplyAPY);
      }
      apyInitializedRef.current = true;
      return;
    }

    // Subsequent renders — detect 2 %p+ increases.
    for (const m of aaveMarkets) {
      const supplyId = generateOpportunityId("apy", `aave-${m.symbol}-supply`);
      const prev = prevApyRef.current.get(supplyId) ?? m.supplyAPY;
      const delta = m.supplyAPY - prev;
      if (delta >= 2.0) {
        const est = Math.round(100 * m.supplyAPY);
        fireToast(
          supplyId,
          `📈 Aave ${m.symbol} Supply APY ${m.supplyAPY.toFixed(1)}%↑`,
          `공급 APY가 ${delta.toFixed(1)}%p 상승했습니다. 지금 공급하면 연 ${est}% 수익 가능`,
          "/aave/supply"
        );
      }
      prevApyRef.current.set(supplyId, m.supplyAPY);
    }

    for (const m of morphoMarkets) {
      const supplyId = generateOpportunityId("apy", `morpho-${m.loanSymbol}-supply`);
      const prev = prevApyRef.current.get(supplyId) ?? m.supplyAPY;
      const delta = m.supplyAPY - prev;
      if (delta >= 2.0) {
        const est = Math.round(100 * m.supplyAPY);
        fireToast(
          supplyId,
          `📈 Morpho ${m.loanSymbol} Supply APY ${m.supplyAPY.toFixed(1)}%↑`,
          `공급 APY가 ${delta.toFixed(1)}%p 상승했습니다. 지금 공급하면 연 ${est}% 수익 가능`,
          "/morpho/supply"
        );
      }
      prevApyRef.current.set(supplyId, m.supplyAPY);
    }
  }, [aaveMarkets, morphoMarkets]);

  // ── 2. Idle asset detection ──────────────────────────────────────────────

  // Build batched balanceOf calls for all tokens (no hook-in-loop).
  const balanceCalls = TOKEN_ADDRESSES.map((addr) => ({
    address: addr,
    abi: erc20Abi,
    functionName: "balanceOf" as const,
    args: [walletAddress ?? "0x0000000000000000000000000000000000000000"] as const,
  }));

  const { data: balanceData } = useReadContracts({
    contracts: balanceCalls,
    query: { enabled: !!walletAddress, refetchInterval: 30_000 },
  });

  const idleToastedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!walletAddress || !balanceData) return;

    TOKEN_ADDRESSES.forEach((addr, idx) => {
      const info = TOKEN_INFO[addr];
      if (!info) return;

      const result = balanceData[idx];
      if (result?.status !== "success") return;

      const raw = result.result as bigint;
      const usdValue = (Number(raw) / 10 ** info.decimals) * info.mockPriceUsd;

      if (usdValue < 100) return;

      const oppId = generateOpportunityId("idle", info.symbol);
      if (idleToastedRef.current.has(oppId)) return;

      // Find best APY from Aave markets for this token
      const aaveMatch = aaveMarkets.find((m) => m.symbol === info.symbol);
      const morphoMatch = morphoMarkets.find(
        (m) => m.loanSymbol === info.symbol || m.collSymbol === info.symbol
      );
      const bestApy =
        Math.max(aaveMatch?.supplyAPY ?? 0, morphoMatch?.supplyAPY ?? 0);
      const bestProtocol = aaveMatch ? "Aave" : morphoMatch ? "Morpho" : "Aave";
      const bestHref = aaveMatch ? "/aave/supply" : "/morpho/supply";

      const amount = (Number(raw) / 10 ** info.decimals).toFixed(2);

      fireToast(
        oppId,
        `💰 ${info.symbol} ${amount}개 보유 중`,
        `${bestProtocol} Supply로 연 ${bestApy.toFixed(1)}% APY 수익 가능`,
        bestHref
      );

      idleToastedRef.current.add(oppId);
    });
  }, [walletAddress, balanceData, aaveMarkets, morphoMarkets]);

  // ── 3. New incentive detection ───────────────────────────────────────────

  useWatchContractEvent({
    address: STAKER.snowballStaker,
    abi: SnowballStakerABI,
    eventName: "IncentiveCreated",
    onLogs(logs) {
      for (const log of logs) {
        const args = (log as any).args as {
          rewardToken: Address;
          pool: Address;
          startTime: bigint;
          endTime: bigint;
          refundee: Address;
          reward: bigint;
        };
        if (!args) continue;

        const oppId = generateOpportunityId(
          "incentive",
          `${args.startTime}-${args.pool}`
        );

        fireToast(
          oppId,
          "🎉 새 LP 인센티브!",
          `풀 ${args.pool.slice(0, 6)}…에 추가 보상이 시작되었습니다`,
          "/stake"
        );
      }
    },
  });
}
