"use client";

import { formatUnits } from "viem";
import { Loader2 } from "lucide-react";
import type { TxState } from "@/domains/trade/hooks/useCreatePosition";

// ────────────────────────────────────────────
// Types
// ────────────────────────────────────────────

interface DepositPanelProps {
  token0Symbol: string;
  token1Symbol: string;
  token0Decimals: number;
  token1Decimals: number;
  amount0: string;
  amount1: string;
  setAmount0: (v: string) => void;
  setAmount1: (v: string) => void;
  handleHalf0: () => void;
  handleMax0: () => void;
  handleHalf1: () => void;
  handleMax1: () => void;
  balance0: bigint | undefined;
  balance1: bigint | undefined;
  amount0Usd: number;
  amount1Usd: number;
  totalDepositUsd: number;
  tokenRatio: [number, number];
  estimatedApr: string;
  isConnected: boolean;
  txState: TxState;
  handleAddLiquidity: () => Promise<void>;
  needsApproval0: boolean;
  needsApproval1: boolean;
}

// ────────────────────────────────────────────
// Component
// ────────────────────────────────────────────

export function DepositPanel({
  token0Symbol,
  token1Symbol,
  token0Decimals,
  token1Decimals,
  amount0,
  amount1,
  setAmount0,
  setAmount1,
  handleHalf0,
  handleMax0,
  handleHalf1,
  handleMax1,
  balance0,
  balance1,
  amount0Usd,
  amount1Usd,
  totalDepositUsd,
  tokenRatio,
  estimatedApr,
  isConnected,
  txState,
  handleAddLiquidity,
  needsApproval0,
  needsApproval1,
}: DepositPanelProps) {
  const isPending = txState === "approving0" || txState === "approving1" || txState === "minting";
  const hasAmount = (amount0 && amount0 !== "0") || (amount1 && amount1 !== "0");

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-text-primary">Deposit Amounts</h3>

      {/* Token0 Input */}
      <TokenDepositInput
        symbol={token0Symbol}
        decimals={token0Decimals}
        amount={amount0}
        setAmount={setAmount0}
        handleHalf={handleHalf0}
        handleMax={handleMax0}
        balance={balance0}
        amountUsd={amount0Usd}
        isConnected={isConnected}
        disabled={isPending}
      />

      {/* Token1 Input */}
      <TokenDepositInput
        symbol={token1Symbol}
        decimals={token1Decimals}
        amount={amount1}
        setAmount={setAmount1}
        handleHalf={handleHalf1}
        handleMax={handleMax1}
        balance={balance1}
        amountUsd={amount1Usd}
        isConnected={isConnected}
        disabled={isPending}
      />

      {/* Total Deposit + Ratio Bar */}
      <div className="bg-bg-input rounded-xl p-3 space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="text-text-tertiary">Total Deposit</span>
          <span className="text-text-primary font-medium">~${totalDepositUsd.toFixed(2)}</span>
        </div>

        {/* Token Ratio Bar */}
        <div className="space-y-1">
          <div className="h-2 rounded-full bg-bg-tertiary overflow-hidden flex">
            <div
              className="h-full bg-ice-400 transition-all duration-200"
              style={{ width: `${tokenRatio[0]}%` }}
            />
            <div
              className="h-full bg-purple-400 transition-all duration-200"
              style={{ width: `${tokenRatio[1]}%` }}
            />
          </div>
          <div className="flex justify-between text-[10px]">
            <span className="text-ice-400">{token0Symbol} {tokenRatio[0].toFixed(0)}%</span>
            <span className="text-purple-400">{token1Symbol} {tokenRatio[1].toFixed(0)}%</span>
          </div>
        </div>
      </div>

      {/* Estimated APR */}
      <div className="bg-bg-input rounded-xl p-3">
        <div className="flex items-center justify-between text-xs">
          <span className="text-text-tertiary">Estimated APR</span>
          <span className="text-green-400 font-medium">{estimatedApr}</span>
        </div>
      </div>

      {/* Action Button */}
      <ActionButton
        isConnected={isConnected}
        hasAmount={!!hasAmount}
        needsApproval0={needsApproval0}
        needsApproval1={needsApproval1}
        token0Symbol={token0Symbol}
        token1Symbol={token1Symbol}
        txState={txState}
        onAction={handleAddLiquidity}
      />
    </div>
  );
}

// ────────────────────────────────────────────
// TokenDepositInput sub-component
// ────────────────────────────────────────────

function TokenDepositInput({
  symbol,
  decimals,
  amount,
  setAmount,
  handleHalf,
  handleMax,
  balance,
  amountUsd,
  isConnected,
  disabled,
}: {
  symbol: string;
  decimals: number;
  amount: string;
  setAmount: (v: string) => void;
  handleHalf: () => void;
  handleMax: () => void;
  balance: bigint | undefined;
  amountUsd: number;
  isConnected: boolean;
  disabled: boolean;
}) {
  const balanceStr = balance !== undefined ? formatUnits(balance, decimals) : undefined;
  const displayBalance = balanceStr
    ? parseFloat(balanceStr).toFixed(Math.min(4, decimals))
    : undefined;

  return (
    <div className="bg-bg-input rounded-xl p-3 border border-border-primary">
      <div className="flex items-center justify-between mb-2">
        {/* Token badge */}
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-bg-tertiary flex items-center justify-center text-[10px] font-bold text-text-secondary">
            {symbol[0]}
          </div>
          <span className="text-sm font-medium text-text-primary">{symbol}</span>
        </div>
        {/* Balance */}
        <div className="text-[11px] text-text-tertiary">
          {isConnected
            ? displayBalance !== undefined
              ? `Balance: ${displayBalance}`
              : "Balance: ..."
            : "—"}
        </div>
      </div>

      {/* Input row */}
      <div className="flex items-center gap-2">
        <input
          type="text"
          inputMode="decimal"
          placeholder="0.0"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          disabled={disabled}
          className="flex-1 min-w-0 bg-transparent text-lg font-mono text-text-primary outline-none placeholder:text-text-tertiary disabled:opacity-50"
        />
        <div className="flex gap-1">
          <button
            onClick={handleHalf}
            disabled={!isConnected || !balance || disabled}
            className="px-2 py-0.5 text-[10px] font-medium rounded bg-bg-secondary text-text-secondary hover:text-ice-400 hover:bg-bg-tertiary transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            Half
          </button>
          <button
            onClick={handleMax}
            disabled={!isConnected || !balance || disabled}
            className="px-2 py-0.5 text-[10px] font-medium rounded bg-bg-secondary text-text-secondary hover:text-ice-400 hover:bg-bg-tertiary transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            Max
          </button>
        </div>
      </div>

      {/* USD estimate */}
      {amountUsd > 0 && (
        <div className="text-[11px] text-text-tertiary mt-1">
          ~${amountUsd.toFixed(2)}
        </div>
      )}
    </div>
  );
}

// ────────────────────────────────────────────
// ActionButton sub-component
// ────────────────────────────────────────────

function ActionButton({
  isConnected,
  hasAmount,
  needsApproval0,
  needsApproval1,
  token0Symbol,
  token1Symbol,
  txState,
  onAction,
}: {
  isConnected: boolean;
  hasAmount: boolean;
  needsApproval0: boolean;
  needsApproval1: boolean;
  token0Symbol: string;
  token1Symbol: string;
  txState: TxState;
  onAction: () => Promise<void>;
}) {
  const isPending = txState === "approving0" || txState === "approving1" || txState === "minting";

  // State machine
  let label: string;
  let disabled: boolean;

  if (!isConnected) {
    label = "Connect Wallet";
    disabled = true;
  } else if (!hasAmount) {
    label = "Enter Amount";
    disabled = true;
  } else if (isPending) {
    label = txState === "approving0"
      ? `Approving ${token0Symbol}...`
      : txState === "approving1"
        ? `Approving ${token1Symbol}...`
        : "Adding...";
    disabled = true;
  } else if (needsApproval0) {
    label = `Approve ${token0Symbol}`;
    disabled = false;
  } else if (needsApproval1) {
    label = `Approve ${token1Symbol}`;
    disabled = false;
  } else {
    label = "Add Liquidity";
    disabled = false;
  }

  return (
    <button
      onClick={onAction}
      disabled={disabled}
      className={`w-full py-3 rounded-xl font-medium text-sm transition-colors flex items-center justify-center gap-2 ${
        disabled
          ? "bg-bg-tertiary text-text-tertiary cursor-not-allowed"
          : "bg-ice-400 hover:bg-ice-500 text-white cursor-pointer"
      }`}
    >
      {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
      {label}
    </button>
  );
}
