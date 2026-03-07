"use client";

import { useState, useMemo, useCallback } from "react";
import { useConnection } from "wagmi";
import { type Address } from "viem";
import { usePoolTicks } from "./usePoolTicks";
import { useSmartDeposit } from "./useSmartDeposit";
import { useAddLiquidity } from "./useAddLiquidity";
import { usePoolList } from "./usePoolList";
import { useTokenBalance } from "@/shared/hooks/useTokenBalance";
import { useTokenApproval } from "@/shared/hooks/useTokenApproval";
import { TOKEN_INFO, DEX } from "@/core/config/addresses";
import { parseTokenAmount } from "@/shared/lib/utils";
import type { TickDisplayData } from "@/core/dex/types";
import type { TxStep, TxPhase } from "@/shared/types/tx";

export interface UseCreatePositionReturn {
  // Pool state
  currentTick: number;
  currentPrice: number;
  tickSpacing: number;
  isPoolLoading: boolean;

  // Tick data
  ticks: TickDisplayData[];

  // Range state
  tickLower: number;
  tickUpper: number;
  setTickRange: (lower: number, upper: number) => void;

  // Deposit state (delegated to useSmartDeposit)
  amount0: string;
  amount1: string;
  handleToken0Change: (v: string) => void;
  handleToken1Change: (v: string) => void;
  handleHalf0: () => void;
  handleHalf1: () => void;
  handleMax: () => void;
  disabled0: boolean;
  disabled1: boolean;
  hasValidAmount: boolean;
  fillPercent0: number;
  fillPercent1: number;

  // Derived
  amount0Usd: number;
  amount1Usd: number;
  totalDepositUsd: number;
  tokenRatio: [number, number];
  estimatedApr: string;

  // Balances
  balance0: bigint | undefined;
  balance1: bigint | undefined;

  // Token info
  token0Symbol: string;
  token1Symbol: string;
  token0Decimals: number;
  token1Decimals: number;

  // Connection
  isConnected: boolean;

  // Transaction pipeline
  txSteps: TxStep[];
  txPhase: TxPhase;
  showTxModal: boolean;
  setShowTxModal: (open: boolean) => void;
  handleAddLiquidity: () => Promise<void>;
  needsApproval0: boolean;
  needsApproval1: boolean;
}

// ────────────────────────────────────────────
// Hook
// ────────────────────────────────────────────

export function useCreatePosition(
  token0: Address,
  token1: Address,
): UseCreatePositionReturn {
  const { address, isConnected } = useConnection();

  // Token info
  const token0Info = TOKEN_INFO[token0];
  const token1Info = TOKEN_INFO[token1];
  const token0Decimals = token0Info?.decimals ?? 18;
  const token1Decimals = token1Info?.decimals ?? 18;
  const token0Symbol = token0Info?.symbol ?? "Token0";
  const token1Symbol = token1Info?.symbol ?? "Token1";

  // Pool & ticks
  const {
    ticks,
    currentPrice,
    currentTick,
    tickSpacing,
    isLoading: isPoolLoading,
  } = usePoolTicks(token0, token1, token0Decimals, token1Decimals);

  // Default tick range: Common (10%)
  const defaultRange = useMemo(() => {
    if (currentTick === undefined || !tickSpacing) return { tickLower: -12000, tickUpper: 12000 };
    const delta = Math.log(1.1) / Math.log(1.0001);
    return {
      tickLower: Math.floor((currentTick - Math.abs(delta)) / tickSpacing) * tickSpacing,
      tickUpper: Math.ceil((currentTick + Math.abs(delta)) / tickSpacing) * tickSpacing,
    };
  }, [currentTick, tickSpacing]);

  const [tickRange, setTickRangeState] = useState<{ tickLower: number; tickUpper: number } | null>(null);
  const range = tickRange ?? defaultRange;

  const setTickRange = useCallback((lower: number, upper: number) => {
    setTickRangeState({ tickLower: lower, tickUpper: upper });
  }, []);

  // Balances (moved before useSmartDeposit since it needs them)
  const { data: balance0Data } = useTokenBalance({ address, token: token0 });
  const { data: balance1Data } = useTokenBalance({ address, token: token1 });
  const balance0 = balance0Data?.value;
  const balance1 = balance1Data?.value;

  // Smart deposit: delegate amount management
  const deposit = useSmartDeposit({
    currentTick,
    tickLower: range.tickLower,
    tickUpper: range.tickUpper,
    balance0,
    balance1,
    token0Decimals,
    token1Decimals,
  });

  const amount0 = deposit.input0;
  const amount1 = deposit.input1;

  // Parse amounts for approval checks
  const parsedAmount0 = useMemo(() => {
    if (!amount0 || amount0 === "0") return 0n;
    try { return parseTokenAmount(amount0, token0Decimals); } catch { return 0n; }
  }, [amount0, token0Decimals]);

  const parsedAmount1 = useMemo(() => {
    if (!amount1 || amount1 === "0") return 0n;
    try { return parseTokenAmount(amount1, token1Decimals); } catch { return 0n; }
  }, [amount1, token1Decimals]);

  // Approvals
  const approval0 = useTokenApproval({
    token: token0,
    spender: DEX.nonfungiblePositionManager,
    amount: parsedAmount0,
    owner: address,
  });

  const approval1 = useTokenApproval({
    token: token1,
    spender: DEX.nonfungiblePositionManager,
    amount: parsedAmount1,
    owner: address,
  });

  // Add liquidity
  const { mint } = useAddLiquidity();

  // USD calculations
  const amount0Usd = useMemo(() => {
    const val = parseFloat(amount0);
    if (isNaN(val)) return 0;
    return val * (token0Info?.mockPriceUsd ?? 0);
  }, [amount0, token0Info]);

  const amount1Usd = useMemo(() => {
    const val = parseFloat(amount1);
    if (isNaN(val)) return 0;
    return val * (token1Info?.mockPriceUsd ?? 0);
  }, [amount1, token1Info]);

  const totalDepositUsd = amount0Usd + amount1Usd;

  const tokenRatio: [number, number] = useMemo(() => {
    if (totalDepositUsd === 0) return [50, 50];
    const r0 = (amount0Usd / totalDepositUsd) * 100;
    return [r0, 100 - r0];
  }, [amount0Usd, totalDepositUsd]);

  // Estimated APR from pool list
  const { pools } = usePoolList();
  const estimatedApr = useMemo(() => {
    const match = pools.find(
      (p) => p.token0 === token0 && p.token1 === token1,
    );
    return match?.feesAPR ?? "—";
  }, [pools, token0, token1]);

  // Transaction pipeline state
  const [txSteps, setTxSteps] = useState<TxStep[]>([]);
  const [txPhase, setTxPhase] = useState<TxPhase>("idle");
  const [showTxModal, setShowTxModal] = useState(false);

  const updateStep = useCallback((id: string, update: Partial<TxStep>) => {
    setTxSteps((prev) => prev.map((s) => (s.id === id ? { ...s, ...update } : s)));
  }, []);

  const handleAddLiquidity = useCallback(async () => {
    if (parsedAmount0 === 0n && parsedAmount1 === 0n) return;
    const a0 = parsedAmount0;
    const a1 = parsedAmount1;

    // Build step list based on what's needed
    const steps: TxStep[] = [];
    if (approval0.needsApproval && a0 > 0n) {
      steps.push({ id: "approve0", type: "approve", label: `Approve ${token0Symbol}`, status: "pending" });
    }
    if (approval1.needsApproval && a1 > 0n) {
      steps.push({ id: "approve1", type: "approve", label: `Approve ${token1Symbol}`, status: "pending" });
    }
    steps.push({ id: "mint", type: "mint", label: "Add Liquidity", status: "pending" });

    setTxSteps(steps);
    setTxPhase("executing");
    setShowTxModal(true);

    try {
      // Approve token0 if needed
      if (approval0.needsApproval && a0 > 0n) {
        updateStep("approve0", { status: "executing" });
        const hash = await approval0.approve(a0);
        updateStep("approve0", { status: "done", txHash: hash as `0x${string}` | undefined });
      }

      // Approve token1 if needed
      if (approval1.needsApproval && a1 > 0n) {
        updateStep("approve1", { status: "executing" });
        const hash = await approval1.approve(a1);
        updateStep("approve1", { status: "done", txHash: hash as `0x${string}` | undefined });
      }

      // Mint
      updateStep("mint", { status: "executing" });
      const result = await mint({
        token0,
        token1,
        tickLower: range.tickLower,
        tickUpper: range.tickUpper,
        amount0Desired: a0,
        amount1Desired: a1,
      });
      updateStep("mint", { status: "done", txHash: result as `0x${string}` | undefined });

      setTxPhase("complete");
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Transaction failed";
      // Mark the currently executing step as error
      setTxSteps((prev) => prev.map((s) =>
        s.status === "executing" ? { ...s, status: "error" as const, error: errorMsg } : s,
      ));
      setTxPhase("error");
    }
  }, [parsedAmount0, parsedAmount1, approval0, approval1, mint, token0, token1, token0Symbol, token1Symbol, range, updateStep]);

  // Handle modal close: reset inputs on success
  const handleTxModalClose = useCallback(() => {
    if (txPhase === "complete") {
      deposit.handleToken0Change("");
      deposit.handleToken1Change("");
    }
    setShowTxModal(false);
    setTxPhase("idle");
    setTxSteps([]);
  }, [txPhase, deposit]);

  return {
    currentTick,
    currentPrice,
    tickSpacing,
    isPoolLoading,
    ticks,
    tickLower: range.tickLower,
    tickUpper: range.tickUpper,
    setTickRange,
    amount0,
    amount1,
    handleToken0Change: deposit.handleToken0Change,
    handleToken1Change: deposit.handleToken1Change,
    handleHalf0: deposit.handleHalf0,
    handleHalf1: deposit.handleHalf1,
    handleMax: deposit.handleMax,
    disabled0: deposit.disabled0,
    disabled1: deposit.disabled1,
    hasValidAmount: parsedAmount0 > 0n || parsedAmount1 > 0n,
    fillPercent0: deposit.fillPercent0,
    fillPercent1: deposit.fillPercent1,
    amount0Usd,
    amount1Usd,
    totalDepositUsd,
    tokenRatio,
    estimatedApr,
    balance0,
    balance1,
    token0Symbol,
    token1Symbol,
    token0Decimals,
    token1Decimals,
    isConnected,
    txSteps,
    txPhase,
    showTxModal,
    setShowTxModal: handleTxModalClose,
    handleAddLiquidity,
    needsApproval0: approval0.needsApproval,
    needsApproval1: approval1.needsApproval,
  };
}
