"use client";

import { formatTokenAmount } from "@/lib/utils";

interface TokenAmountProps {
  value: bigint;
  decimals?: number;
  displayDecimals?: number;
  suffix?: string;
  className?: string;
}

export function TokenAmount({
  value,
  decimals = 18,
  displayDecimals = 4,
  suffix,
  className,
}: TokenAmountProps) {
  return (
    <span className={className}>
      {formatTokenAmount(value, decimals, displayDecimals)}
      {suffix && <span className="text-text-secondary ml-1">{suffix}</span>}
    </span>
  );
}
