"use client";

import { formatUnits } from "viem";
import { TxPipelineModal } from "@/shared/components/ui/tx-pipeline-modal";
import type { TxStep, TxPhase } from "@/shared/types/tx";

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
  handleToken0Change: (v: string) => void;
  handleToken1Change: (v: string) => void;
  handleHalf0: () => void;
  handleHalf1: () => void;
  handleMax: () => void;
  disabled0: boolean;
  disabled1: boolean;
  fillPercent0: number;
  fillPercent1: number;
  hasValidAmount: boolean;
  balance0: bigint | undefined;
  balance1: bigint | undefined;
  amount0Usd: number;
  amount1Usd: number;
  totalDepositUsd: number;
  tokenRatio: [number, number];
  estimatedApr: string;
  isConnected: boolean;
  txSteps: TxStep[];
  txPhase: TxPhase;
  showTxModal: boolean;
  setShowTxModal: (open: boolean) => void;
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
  handleToken0Change,
  handleToken1Change,
  handleHalf0,
  handleHalf1,
  handleMax,
  disabled0,
  disabled1,
  fillPercent0,
  fillPercent1,
  hasValidAmount,
  balance0,
  balance1,
  amount0Usd,
  amount1Usd,
  totalDepositUsd,
  tokenRatio,
  estimatedApr,
  isConnected,
  txSteps,
  txPhase,
  showTxModal,
  setShowTxModal,
  handleAddLiquidity,
  needsApproval0,
  needsApproval1,
}: DepositPanelProps) {
  const isPending = txPhase === "executing";

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-text-primary">Deposit Amounts</h3>

      {/* Token0 Input */}
      <TokenDepositInput
        symbol={token0Symbol}
        decimals={token0Decimals}
        amount={amount0}
        setAmount={handleToken0Change}
        handleHalf={handleHalf0}
        handleMax={handleMax}
        balance={balance0}
        fillPercent={fillPercent0}
        amountUsd={amount0Usd}
        isConnected={isConnected}
        disabled={isPending || disabled0}
      />

      {/* Token1 Input */}
      <TokenDepositInput
        symbol={token1Symbol}
        decimals={token1Decimals}
        amount={amount1}
        setAmount={handleToken1Change}
        handleHalf={handleHalf1}
        handleMax={handleMax}
        balance={balance1}
        fillPercent={fillPercent1}
        amountUsd={amount1Usd}
        isConnected={isConnected}
        disabled={isPending || disabled1}
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
        hasAmount={hasValidAmount}
        isPending={isPending}
        onAction={handleAddLiquidity}
      />

      {/* Tx Pipeline Modal */}
      <TxPipelineModal
        open={showTxModal}
        onClose={() => setShowTxModal(false)}
        onRetry={handleAddLiquidity}
        steps={txSteps}
        phase={txPhase}
        title="Add Liquidity"
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
  fillPercent,
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
  fillPercent: number;
  amountUsd: number;
  isConnected: boolean;
  disabled: boolean;
}) {
  const balanceStr = balance !== undefined ? formatUnits(balance, decimals) : undefined;
  const displayBalance = balanceStr
    ? parseFloat(balanceStr).toFixed(Math.min(4, decimals))
    : undefined;

  const showGlow = fillPercent >= 99;

  return (
    <div className={disabled ? "opacity-50 cursor-not-allowed" : ""}>
      {/* Header: symbol + balance */}
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-1.5">
          <div className="w-5 h-5 rounded-full bg-bg-tertiary flex items-center justify-center text-[9px] font-bold text-text-secondary">
            {symbol[0]}
          </div>
          <span className="text-xs font-medium text-text-secondary">{symbol}</span>
        </div>
        <span className="text-[11px] text-text-tertiary">
          {isConnected
            ? displayBalance !== undefined
              ? `Balance: ${displayBalance}`
              : "Balance: ..."
            : "—"}
        </span>
      </div>

      {/* Input with fill bar */}
      <div
        className={`relative overflow-hidden rounded-lg border transition-all duration-200 ${
          showGlow
            ? "border-ice-400/30 ring-1 ring-ice-400/30"
            : "border-border-primary"
        }`}
      >
        {/* Fill bar background */}
        <div
          className="absolute inset-0 bg-ice-400/15 transition-all duration-300 ease-out pointer-events-none"
          style={{ width: `${fillPercent}%` }}
        />

        {/* Input row */}
        <div className="relative flex items-center gap-2 px-3 py-2.5">
          <input
            type="text"
            inputMode="decimal"
            placeholder="0.0"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            disabled={disabled}
            className="flex-1 min-w-0 bg-transparent text-lg font-mono text-text-primary outline-none placeholder:text-text-tertiary disabled:cursor-not-allowed"
          />
          <div className="flex gap-1 shrink-0">
            <button
              onClick={handleHalf}
              disabled={!isConnected || !balance || disabled}
              className="px-2 py-0.5 text-[10px] font-medium rounded bg-bg-secondary/80 text-text-secondary hover:text-ice-400 hover:bg-bg-tertiary transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              Half
            </button>
            <button
              onClick={handleMax}
              disabled={!isConnected || !balance || disabled}
              className="px-2 py-0.5 text-[10px] font-medium rounded bg-bg-secondary/80 text-text-secondary hover:text-ice-400 hover:bg-bg-tertiary transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              Max
            </button>
          </div>
        </div>
      </div>

      {/* USD estimate */}
      {amountUsd > 0 && (
        <div className="text-[11px] text-text-tertiary mt-1 pl-1">
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
  isPending,
  onAction,
}: {
  isConnected: boolean;
  hasAmount: boolean;
  isPending: boolean;
  onAction: () => Promise<void>;
}) {
  let label: string;
  let disabled: boolean;

  if (!isConnected) {
    label = "Connect Wallet";
    disabled = true;
  } else if (!hasAmount) {
    label = "Enter Amount";
    disabled = true;
  } else if (isPending) {
    label = "Processing...";
    disabled = true;
  } else {
    label = "Add Liquidity";
    disabled = false;
  }

  return (
    <button
      onClick={onAction}
      disabled={disabled}
      className={`w-full py-3 rounded-xl font-medium text-sm transition-colors ${
        disabled
          ? "bg-bg-tertiary text-text-tertiary cursor-not-allowed"
          : "bg-ice-400 hover:bg-ice-500 text-white cursor-pointer"
      }`}
    >
      {label}
    </button>
  );
}
