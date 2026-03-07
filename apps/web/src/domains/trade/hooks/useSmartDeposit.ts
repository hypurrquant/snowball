"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { formatUnits } from "viem";
import {
  calcCoefficients,
  calcOtherTokenAmount,
  calcMaxAmountsFromBalances,
  type TickCoefficients,
} from "@/core/dex/tokenAllocation";

// ────────────────────────────────────────────
// Types
// ────────────────────────────────────────────

export interface UseSmartDepositProps {
  currentTick: number;
  tickLower: number;
  tickUpper: number;
  balance0: bigint | undefined;
  balance1: bigint | undefined;
  token0Decimals: number;
  token1Decimals: number;
}

export interface UseSmartDepositReturn {
  input0: string;
  input1: string;
  handleToken0Change: (value: string) => void;
  handleToken1Change: (value: string) => void;
  handleHalf0: () => void;
  handleHalf1: () => void;
  handleMax: () => void;
  disabled0: boolean;
  disabled1: boolean;
  fillPercent0: number;
  fillPercent1: number;
  coeff: TickCoefficients | null;
}

// ────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────

/** Safe parseFloat that returns 0 for invalid input */
function safeParseFloat(value: string): number {
  const n = parseFloat(value);
  return isFinite(n) && n >= 0 ? n : 0;
}

/** Sanitize user input: strip leading zeros (keep "0." for decimals) */
function sanitizeInput(value: string): string {
  // Allow empty or pure typing states
  if (value === "" || value === "." || value === "0" || value === "0.") return value;
  // Strip leading zeros before digits (but not "0.xxx")
  return value.replace(/^0+(?=\d)/, "");
}

/** Number → display string (trim trailing zeros, max 8 decimals) */
function numToDisplay(value: number): string {
  if (!isFinite(value) || value <= 0) return "0";
  // Use toPrecision to avoid floating point noise, then trim
  const str = value.toFixed(8);
  // Remove trailing zeros after decimal
  return str.replace(/\.?0+$/, "");
}

// ────────────────────────────────────────────
// Hook
// ────────────────────────────────────────────

export function useSmartDeposit({
  currentTick,
  tickLower,
  tickUpper,
  balance0,
  balance1,
  token0Decimals,
  token1Decimals,
}: UseSmartDepositProps): UseSmartDepositReturn {
  const [input0, setInput0] = useState("");
  const [input1, setInput1] = useState("");
  const [lastEditedToken, setLastEditedToken] = useState<"token0" | "token1" | null>(null);

  // Calculate coefficients
  const coeff = useMemo(() => {
    if (currentTick === undefined || currentTick === null) return null;
    return calcCoefficients(currentTick, tickLower, tickUpper);
  }, [currentTick, tickLower, tickUpper]);

  // Derived disabled states
  const disabled0 = coeff === null || coeff.case === "above";
  const disabled1 = coeff === null || coeff.case === "below";

  // Human-readable balances
  const numBalance0 = useMemo(
    () => (balance0 !== undefined ? parseFloat(formatUnits(balance0, token0Decimals)) : 0),
    [balance0, token0Decimals],
  );
  const numBalance1 = useMemo(
    () => (balance1 !== undefined ? parseFloat(formatUnits(balance1, token1Decimals)) : 0),
    [balance1, token1Decimals],
  );

  // Cap amounts to balances, reducing proportionally if needed
  const capToBalances = useCallback(
    (amt0: number, amt1: number): { capped0: number; capped1: number } => {
      if (!coeff || coeff.case !== "in_range") {
        // Single-token or null: just clamp
        return {
          capped0: Math.min(amt0, numBalance0),
          capped1: Math.min(amt1, numBalance1),
        };
      }
      // Both within balance → no capping needed
      if (amt0 <= numBalance0 && amt1 <= numBalance1) {
        return { capped0: amt0, capped1: amt1 };
      }
      // Use calcMaxAmountsFromBalances to find the max proportional amounts
      const max = calcMaxAmountsFromBalances(numBalance0, numBalance1, coeff);
      return { capped0: max.amount0, capped1: max.amount1 };
    },
    [coeff, numBalance0, numBalance1],
  );

  // Token0 input handler
  const handleToken0Change = useCallback(
    (value: string) => {
      if (!coeff) return;
      setLastEditedToken("token0");

      const sanitized = sanitizeInput(value);
      const num0 = safeParseFloat(sanitized);

      if (coeff.case === "below") {
        // Token0 only
        const capped = Math.min(num0, numBalance0);
        setInput0(sanitized);
        setInput1("0");
        if (capped < num0) setInput0(numToDisplay(capped));
        return;
      }

      if (coeff.case === "above") return; // Token0 disabled

      // In-range: calculate paired token1
      const derived1 = calcOtherTokenAmount(num0, true, coeff);

      // Check if capping needed
      if (num0 <= numBalance0 && derived1 <= numBalance1) {
        setInput0(sanitized); // Keep user typing
        setInput1(numToDisplay(derived1));
      } else {
        const { capped0, capped1 } = capToBalances(num0, derived1);
        setInput0(numToDisplay(capped0));
        setInput1(numToDisplay(capped1));
      }
    },
    [coeff, numBalance0, numBalance1, capToBalances],
  );

  // Token1 input handler
  const handleToken1Change = useCallback(
    (value: string) => {
      if (!coeff) return;
      setLastEditedToken("token1");

      const sanitized = sanitizeInput(value);
      const num1 = safeParseFloat(sanitized);

      if (coeff.case === "above") {
        // Token1 only
        const capped = Math.min(num1, numBalance1);
        setInput1(sanitized);
        setInput0("0");
        if (capped < num1) setInput1(numToDisplay(capped));
        return;
      }

      if (coeff.case === "below") return; // Token1 disabled

      // In-range: calculate paired token0
      const derived0 = calcOtherTokenAmount(num1, false, coeff);

      if (num1 <= numBalance1 && derived0 <= numBalance0) {
        setInput1(sanitized); // Keep user typing
        setInput0(numToDisplay(derived0));
      } else {
        const { capped0, capped1 } = capToBalances(derived0, num1);
        setInput0(numToDisplay(capped0));
        setInput1(numToDisplay(capped1));
      }
    },
    [coeff, numBalance0, numBalance1, capToBalances],
  );

  // Half0: balance0/2 + paired
  const handleHalf0 = useCallback(() => {
    if (!coeff || numBalance0 <= 0) return;
    const half = numBalance0 / 2;
    handleToken0Change(numToDisplay(half));
  }, [coeff, numBalance0, handleToken0Change]);

  // Half1: balance1/2 + paired
  const handleHalf1 = useCallback(() => {
    if (!coeff || numBalance1 <= 0) return;
    const half = numBalance1 / 2;
    handleToken1Change(numToDisplay(half));
  }, [coeff, numBalance1, handleToken1Change]);

  // Max: both balances considered
  const handleMax = useCallback(() => {
    if (!coeff) return;
    const max = calcMaxAmountsFromBalances(numBalance0, numBalance1, coeff);
    setInput0(numToDisplay(max.amount0));
    setInput1(numToDisplay(max.amount1));
    setLastEditedToken(null);
  }, [coeff, numBalance0, numBalance1]);

  // Range change effect: recalculate from anchor or clear
  useEffect(() => {
    if (!coeff) {
      // Null coeff (loading or invalid range) → disable
      return;
    }

    // Out-of-range: clear disabled token
    if (coeff.case === "below") {
      setInput1("0");
      setLastEditedToken(null);
      return;
    }
    if (coeff.case === "above") {
      setInput0("0");
      setLastEditedToken(null);
      return;
    }

    // In-range: recalculate from anchor
    if (lastEditedToken === "token0") {
      const num0 = safeParseFloat(input0);
      if (num0 > 0) {
        const derived1 = calcOtherTokenAmount(num0, true, coeff);
        if (num0 <= numBalance0 && derived1 <= numBalance1) {
          setInput1(numToDisplay(derived1));
        } else {
          const max = calcMaxAmountsFromBalances(numBalance0, numBalance1, coeff);
          setInput0(numToDisplay(max.amount0));
          setInput1(numToDisplay(max.amount1));
        }
      }
    } else if (lastEditedToken === "token1") {
      const num1 = safeParseFloat(input1);
      if (num1 > 0) {
        const derived0 = calcOtherTokenAmount(num1, false, coeff);
        if (num1 <= numBalance1 && derived0 <= numBalance0) {
          setInput0(numToDisplay(derived0));
        } else {
          const max = calcMaxAmountsFromBalances(numBalance0, numBalance1, coeff);
          setInput0(numToDisplay(max.amount0));
          setInput1(numToDisplay(max.amount1));
        }
      }
    } else {
      // No anchor (first load or range recovery): clear both
      setInput0("0");
      setInput1("0");
    }
  }, [coeff?.c0, coeff?.c1, coeff?.case]); // Intentionally only react to coeff changes

  // Fill percent: input / balance (0-100)
  const fillPercent0 = useMemo(() => {
    if (numBalance0 <= 0) return 0;
    const num = safeParseFloat(input0);
    return Math.min(100, (num / numBalance0) * 100);
  }, [input0, numBalance0]);

  const fillPercent1 = useMemo(() => {
    if (numBalance1 <= 0) return 0;
    const num = safeParseFloat(input1);
    return Math.min(100, (num / numBalance1) * 100);
  }, [input1, numBalance1]);

  return {
    input0,
    input1,
    handleToken0Change,
    handleToken1Change,
    handleHalf0,
    handleHalf1,
    handleMax,
    disabled0,
    disabled1,
    fillPercent0,
    fillPercent1,
    coeff,
  };
}
