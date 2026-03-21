"use client";

import { useState, useEffect } from "react";
import { onTxSuccess } from "@/shared/lib/txSuccessEvent";
import { TxSuccessBanner } from "@/shared/components/TxSuccessBanner";
import type { TxResult } from "@/shared/hooks/useNextActions";

export function TxSuccessOverlay() {
  const [tx, setTx] = useState<{ result: TxResult; key: number } | null>(null);

  useEffect(() => onTxSuccess((result) => setTx({ result, key: Date.now() })), []);

  if (!tx) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <TxSuccessBanner
        key={tx.key}
        txType={tx.result.type}
        outputToken={tx.result.outputToken}
        outputAmount={tx.result.outputAmount}
        show={true}
      />
    </div>
  );
}
