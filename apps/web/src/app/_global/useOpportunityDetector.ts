"use client";

import { useEffect, useRef } from "react";
import { useAccount, useReadContracts, useWatchContractEvent } from "wagmi";
import { erc20Abi } from "viem";
import type { Address } from "viem";
import { toast } from "sonner";
import { useAaveMarkets } from "@/domains/defi/aave/hooks/useAaveMarkets";
import { useMorphoMarkets } from "@/domains/defi/morpho/hooks/useMorphoMarkets";
import { useMorphoPosition } from "@/domains/defi/morpho/hooks/useMorphoPosition";
import { useTroves } from "@/domains/defi/liquity/hooks/useTroves";
import { useStakerAccruedRewards } from "@/domains/defi/staker/hooks/useStakerRewards";
import { SnowballStakerABI } from "@/core/abis";
import { LEND, STAKER, TOKEN_INFO, TOKENS } from "@/core/config/addresses";
import { OpportunityToast } from "@/shared/components/OpportunityToast";
import type { ToastVariant } from "@/shared/components/OpportunityToast";
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
  directHref: string,
  variant: ToastVariant = "opportunity"
): void {
  if (!canShowToast()) return;
  if (isDismissed(oppId)) return;

  toast.custom((toastId: number | string) =>
    React.createElement(OpportunityToast, {
      toastId,
      title,
      description,
      variant,
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
    onLogs(logs: any[]) {
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

  // ── 4. Trove CR warning (Liquity) ─────────────────────────────────────────

  const { troves: wCTCTroves } = useTroves("wCTC", walletAddress);
  const { troves: lstCTCTroves } = useTroves("lstCTC", walletAddress);

  const riskToastedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!walletAddress) return;

    const allTroves = [
      ...wCTCTroves.map((t) => ({ ...t, branch: "wCTC" as const })),
      ...lstCTCTroves.map((t) => ({ ...t, branch: "lstCTC" as const })),
    ];

    for (const trove of allTroves) {
      // Use trove id as part of the key (bigint → hex string)
      const troveKey = `trove-${trove.branch}-${trove.id.toString(16).slice(0, 8)}`;

      if (trove.icr > 0 && trove.icr < 1.5) {
        const oppId = generateOpportunityId("trove-danger", troveKey);
        if (!riskToastedRef.current.has(oppId)) {
          fireToast(
            oppId,
            `⚠️ ${trove.branch} Trove CR ${(trove.icr * 100).toFixed(0)}% — 청산 위험!`,
            `담보비율이 150% 미만입니다. 즉시 담보를 추가하거나 부채를 상환하세요.`,
            "/borrow",
            "danger"
          );
          riskToastedRef.current.add(oppId);
        }
      } else if (trove.icr >= 1.5 && trove.icr < 2.0) {
        const oppId = generateOpportunityId("trove-warning", troveKey);
        if (!riskToastedRef.current.has(oppId)) {
          fireToast(
            oppId,
            `⚡ ${trove.branch} Trove CR ${(trove.icr * 100).toFixed(0)}% — 주의`,
            `담보비율 200% 미만입니다. 담보 추가를 고려하세요.`,
            "/borrow",
            "warning"
          );
          riskToastedRef.current.add(oppId);
        }
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [walletAddress, wCTCTroves, lstCTCTroves]);

  // ── 5. Morpho health factor warning ──────────────────────────────────────

  // Call useMorphoPosition for each market (fixed number of markets — no hook-in-loop)
  const market0 = LEND.markets[0];
  const market1 = LEND.markets[1];
  const market2 = LEND.markets[2];

  const oracle0 = morphoMarkets.find((m) => m.id === market0.id)?.oraclePrice;
  const oracle1 = morphoMarkets.find((m) => m.id === market1.id)?.oraclePrice;
  const oracle2 = morphoMarkets.find((m) => m.id === market2.id)?.oraclePrice;

  const { position: pos0 } = useMorphoPosition(market0.id, walletAddress, oracle0);
  const { position: pos1 } = useMorphoPosition(market1.id, walletAddress, oracle1);
  const { position: pos2 } = useMorphoPosition(market2.id, walletAddress, oracle2);

  const hfToastedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!walletAddress) return;

    const positions = [
      { pos: pos0, marketId: market0.id, name: market0.name },
      { pos: pos1, marketId: market1.id, name: market1.name },
      { pos: pos2, marketId: market2.id, name: market2.name },
    ];

    for (const { pos, marketId, name } of positions) {
      if (!pos || pos.borrowShares === 0n) continue; // no borrow position

      const hf = pos.healthFactor;
      if (hf <= 0) continue;

      const marketKey = marketId.slice(0, 10);

      if (hf < 1.2) {
        const oppId = generateOpportunityId("morpho-hf-danger", marketKey);
        if (!hfToastedRef.current.has(oppId)) {
          fireToast(
            oppId,
            `⚠️ Morpho ${name} HF ${hf.toFixed(2)} — 청산 위험!`,
            `헬스팩터가 1.2 미만입니다. 즉시 담보 추가 또는 부채 상환이 필요합니다.`,
            "/morpho/borrow",
            "danger"
          );
          hfToastedRef.current.add(oppId);
        }
      } else if (hf < 1.5) {
        const oppId = generateOpportunityId("morpho-hf-warning", marketKey);
        if (!hfToastedRef.current.has(oppId)) {
          fireToast(
            oppId,
            `⚡ Morpho ${name} HF ${hf.toFixed(2)} — 주의`,
            `헬스팩터가 1.5 미만입니다. 부채 일부 상환을 고려하세요.`,
            "/morpho/borrow",
            "warning"
          );
          hfToastedRef.current.add(oppId);
        }
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [walletAddress, pos0, pos1, pos2]);

  // ── 6. Unclaimed staking rewards ─────────────────────────────────────────

  // Check accrued rewards for wCTC reward token (primary staking reward)
  const { accruedRewards: wCTCRewards } = useStakerAccruedRewards(
    TOKENS.wCTC,
    walletAddress
  );

  const rewardsToastedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!walletAddress || wCTCRewards === null) return;

    // Threshold: 0.2 wCTC (~$1 at $5/wCTC)
    const REWARD_THRESHOLD = BigInt(2e17); // 0.2 * 1e18
    if (wCTCRewards < REWARD_THRESHOLD) return;

    const rewardAmount = (Number(wCTCRewards) / 1e18).toFixed(4);
    const oppId = generateOpportunityId("unclaimed-rewards", "wCTC");

    if (rewardsToastedRef.current.has(oppId)) return;

    fireToast(
      oppId,
      `🎁 미청구 스테이킹 보상 ${rewardAmount} wCTC`,
      `청구하지 않은 LP 보상이 있습니다. 지금 수령하세요.`,
      "/stake"
    );

    rewardsToastedRef.current.add(oppId);
  }, [walletAddress, wCTCRewards]);
}
