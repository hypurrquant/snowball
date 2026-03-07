"use client";

import { formatTokenAmount } from "@/shared/lib/utils";
import type { PositionPreview } from "@/domains/defi/liquity/hooks/usePositionPreview";

interface PositionSummaryProps {
  preview: PositionPreview;
  mcrPct: number;
  ccrPct: number;
}

export function PositionSummary({ preview, mcrPct, ccrPct }: PositionSummaryProps) {
  return (
    <div className="rounded-xl bg-bg-input p-4 space-y-2.5">
      <p className="font-semibold text-white text-sm">Position Summary</p>
      <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
        <div className="flex justify-between col-span-2">
          <span className="text-text-tertiary">Health Factor</span>
          <span className={`font-bold ${preview.crColor}`}>
            {preview.cr > 0 ? (preview.cr / 100).toFixed(2) : "\u2014"}
          </span>
        </div>
        <div className="flex justify-between col-span-2">
          <span className="text-text-tertiary">Collateral Ratio</span>
          <span className={`font-mono ${preview.crColor}`}>
            {preview.cr > 0 ? `${preview.cr.toFixed(1)}%` : "\u2014"}
          </span>
        </div>
        <div className="flex justify-between col-span-2">
          <span className="text-text-tertiary">Liquidation Price</span>
          <span className="text-white font-mono">
            {preview.liquidationPrice > 0n ? `$${formatTokenAmount(preview.liquidationPrice, 18, 4)}` : "\u2014"}
          </span>
        </div>
        <div className="flex justify-between col-span-2">
          <span className="text-text-tertiary">7-day Upfront Fee</span>
          <span className="text-white font-mono">
            {preview.upfrontFee > 0n ? `${formatTokenAmount(preview.upfrontFee, 18, 4)} sbUSD` : "\u2014"}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-text-tertiary">MCR</span>
          <span className="text-text-secondary">{mcrPct.toFixed(0)}%</span>
        </div>
        <div className="flex justify-between">
          <span className="text-text-tertiary">CCR</span>
          <span className="text-text-secondary">{ccrPct.toFixed(0)}%</span>
        </div>
      </div>
    </div>
  );
}
