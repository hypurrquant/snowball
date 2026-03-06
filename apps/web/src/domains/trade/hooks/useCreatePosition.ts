"use client";

import { useState, useMemo, useCallback } from "react";
import { useConnection } from "wagmi";
import { formatUnits, type Address } from "viem";
import { usePoolTicks } from "./usePoolTicks";
import { useAddLiquidity } from "./useAddLiquidity";
import { usePoolList } from "./usePoolList";
import { useTokenBalance } from "@/shared/hooks/useTokenBalance";
import { useTokenApproval } from "@/shared/hooks/useTokenApproval";
import { TOKEN_INFO, DEX } from "@/core/config/addresses";
import { alignTickToSpacing } from "@/core/dex/calculators";
import { parseTokenAmount } from "@/shared/lib/utils";
import type { TickDisplayData } from "@/core/dex/types";

// ────────────────────────────────────────────
// Types
// ────────────────────────────────────────────

export type TxState = "idle" | "approving0" | "approving1" | "minting" | "success" | "error";

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

  // Deposit state
  amount0: string;
  amount1: string;
  setAmount0: (v: string) => void;
  setAmount1: (v: string) => void;
  handleHalf0: () => void;
  handleMax0: () => void;
  handleHalf1: () => void;
  handleMax1: () => void;

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

  // Transaction
  txState: TxState;
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

  // Deposit amounts
  const [amount0, setAmount0] = useState("");
  const [amount1, setAmount1] = useState("");

  // Balances
  const { data: balance0Data } = useTokenBalance({ address, token: token0 });
  const { data: balance1Data } = useTokenBalance({ address, token: token1 });
  const balance0 = balance0Data?.value;
  const balance1 = balance1Data?.value;

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

  // Half/Max handlers
  const handleHalf0 = useCallback(() => {
    if (!balance0) return;
    const half = balance0 / 2n;
    setAmount0(formatUnits(half, token0Decimals));
  }, [balance0, token0Decimals]);

  const handleMax0 = useCallback(() => {
    if (!balance0) return;
    setAmount0(formatUnits(balance0, token0Decimals));
  }, [balance0, token0Decimals]);

  const handleHalf1 = useCallback(() => {
    if (!balance1) return;
    const half = balance1 / 2n;
    setAmount1(formatUnits(half, token1Decimals));
  }, [balance1, token1Decimals]);

  const handleMax1 = useCallback(() => {
    if (!balance1) return;
    setAmount1(formatUnits(balance1, token1Decimals));
  }, [balance1, token1Decimals]);

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

  // Transaction state
  const [txState, setTxState] = useState<TxState>("idle");

  const handleAddLiquidity = useCallback(async () => {
    if (!amount0 && !amount1) return;
    const a0 = parsedAmount0;
    const a1 = parsedAmount1;

    try {
      // Approve token0 if needed
      if (approval0.needsApproval && a0 > 0n) {
        setTxState("approving0");
        await approval0.approve(a0);
      }

      // Approve token1 if needed
      if (approval1.needsApproval && a1 > 0n) {
        setTxState("approving1");
        await approval1.approve(a1);
      }

      // Mint
      setTxState("minting");
      await mint({
        token0,
        token1,
        tickLower: range.tickLower,
        tickUpper: range.tickUpper,
        amount0Desired: a0,
        amount1Desired: a1,
      });

      setTxState("success");
      setAmount0("");
      setAmount1("");
    } catch (err) {
      console.error("Add liquidity failed:", err);
      setTxState("error");
    }
  }, [amount0, amount1, parsedAmount0, parsedAmount1, approval0, approval1, mint, token0, token1, range]);

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
    setAmount0,
    setAmount1,
    handleHalf0,
    handleMax0,
    handleHalf1,
    handleMax1,
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
    txState,
    handleAddLiquidity,
    needsApproval0: approval0.needsApproval,
    needsApproval1: approval1.needsApproval,
  };
}
