"use client";

import { useState } from "react";
import { NextActionBanner } from "@/shared/components/NextActionBanner";
import { useNextActions } from "@/shared/hooks/useNextActions";
import type { Address } from "viem";

interface TxSuccessBannerProps {
  txType:
    | "swap"
    | "cdp-mint"
    | "morpho-supply"
    | "aave-supply"
    | "yield-deposit"
    | "stability-deposit"
    | "stake";
  outputToken?: Address;
  outputAmount?: bigint;
  show: boolean;
  className?: string;
}

export function TxSuccessBanner({
  txType,
  outputToken,
  outputAmount,
  show,
  className,
}: TxSuccessBannerProps) {
  const [dismissed, setDismissed] = useState(false);
  const suggestion = useNextActions(
    show ? { type: txType, outputToken, outputAmount } : null
  );

  if (!show || dismissed || !suggestion) return null;

  return (
    <NextActionBanner
      title={suggestion.title}
      actions={suggestion.actions}
      strategyLink={suggestion.strategyLink}
      onDismiss={() => setDismissed(true)}
      className={className}
    />
  );
}
