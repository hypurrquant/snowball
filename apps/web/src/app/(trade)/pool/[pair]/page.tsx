"use client";

import { useParams } from "next/navigation";
import { type Address } from "viem";
import { TOKEN_INFO } from "@/core/config/addresses";
import { useCreatePosition } from "@/domains/trade/hooks/useCreatePosition";
import { PriceRangeSelector } from "@/domains/trade/components/PriceRangeSelector";
import { DepositPanel } from "@/domains/trade/components/DepositPanel";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function PoolDetailPage() {
  const params = useParams<{ pair: string }>();
  const [token0, token1] = params.pair.split("-") as [Address, Address];

  const token0Info = TOKEN_INFO[token0];
  const token1Info = TOKEN_INFO[token1];

  const pos = useCreatePosition(token0, token1);

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link
          href="/pool"
          className="flex items-center gap-1.5 text-sm text-text-secondary hover:text-text-primary transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </Link>
        <h1 className="text-lg font-semibold text-text-primary">
          {token0Info?.symbol ?? "?"} / {token1Info?.symbol ?? "?"} — New Position
        </h1>
      </div>

      {/* 2-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-6">
        {/* Left: Select Range */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-text-primary">Select Range</h3>
          <PriceRangeSelector
            currentTick={pos.currentTick}
            tickLower={pos.tickLower}
            tickUpper={pos.tickUpper}
            tickSpacing={pos.tickSpacing}
            ticks={pos.ticks}
            ticksLoading={pos.isPoolLoading}
            token0Decimals={pos.token0Decimals}
            token1Decimals={pos.token1Decimals}
            token0Symbol={pos.token0Symbol}
            token1Symbol={pos.token1Symbol}
            onTickRangeChange={pos.setTickRange}
          />
        </div>

        {/* Right: Deposit */}
        <DepositPanel
          token0Symbol={pos.token0Symbol}
          token1Symbol={pos.token1Symbol}
          token0Decimals={pos.token0Decimals}
          token1Decimals={pos.token1Decimals}
          amount0={pos.amount0}
          amount1={pos.amount1}
          handleToken0Change={pos.handleToken0Change}
          handleToken1Change={pos.handleToken1Change}
          handleHalf0={pos.handleHalf0}
          handleHalf1={pos.handleHalf1}
          handleMax={pos.handleMax}
          disabled0={pos.disabled0}
          disabled1={pos.disabled1}
          fillPercent0={pos.fillPercent0}
          fillPercent1={pos.fillPercent1}
          hasValidAmount={pos.hasValidAmount}
          balance0={pos.balance0}
          balance1={pos.balance1}
          amount0Usd={pos.amount0Usd}
          amount1Usd={pos.amount1Usd}
          totalDepositUsd={pos.totalDepositUsd}
          tokenRatio={pos.tokenRatio}
          estimatedApr={pos.estimatedApr}
          isConnected={pos.isConnected}
          txSteps={pos.txSteps}
          txPhase={pos.txPhase}
          showTxModal={pos.showTxModal}
          setShowTxModal={pos.setShowTxModal}
          handleAddLiquidity={pos.handleAddLiquidity}
          needsApproval0={pos.needsApproval0}
          needsApproval1={pos.needsApproval1}
        />
      </div>
    </div>
  );
}
