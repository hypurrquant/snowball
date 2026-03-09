"use client";

import { useState, useMemo } from "react";
import { useConnection } from "wagmi";
import { useTokenBalance } from "@/shared/hooks/useTokenBalance";
import { parseEther, formatEther, type Address } from "viem";
import { Card, CardHeader, CardTitle, CardContent } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import { TOKENS, TOKEN_INFO } from "@/core/config/addresses";
import { useSwap } from "@/domains/trade/hooks/useSwap";
import { formatTokenAmount } from "@/shared/lib/utils";
import { ArrowDownUp, Settings, Loader2 } from "lucide-react";
import { TokenSelector } from "@/domains/trade/components/TokenSelector";
import { PriceChart } from "@/domains/trade/components/PriceChart";
import { TxPipelineModal } from "@/shared/components/ui/tx-pipeline-modal";
import { useTxPipeline } from "@/shared/hooks/useTxPipeline";

const TOKEN_LIST = Object.entries(TOKENS) as [string, Address][];

export default function SwapPage() {
  const { address, isConnected } = useConnection();
  const [tokenIn, setTokenIn] = useState<Address>(TOKENS.wCTC);
  const [tokenOut, setTokenOut] = useState<Address>(TOKENS.sbUSD);
  const [amountInStr, setAmountInStr] = useState("");
  const [slippage, setSlippage] = useState(0.5);

  const amountIn = useMemo(() => {
    try {
      return amountInStr ? parseEther(amountInStr) : undefined;
    } catch {
      return undefined;
    }
  }, [amountInStr]);

  const { data: balanceIn } = useTokenBalance({
    address,
    token: tokenIn,
  });
  const { data: balanceOut } = useTokenBalance({
    address,
    token: tokenOut,
  });

  const {
    expectedAmountOut,
    isQuoteLoading,
    isApprovalNeeded,
    approve,
    isApprovePending,
    swap,
    isSwapPending,
  } = useSwap(tokenIn, tokenOut, amountIn);
  const pipeline = useTxPipeline();

  const flipTokens = () => {
    setTokenIn(tokenOut);
    setTokenOut(tokenIn);
    setAmountInStr("");
  };

  const tokenInInfo = TOKEN_INFO[tokenIn];
  const tokenOutInfo = TOKEN_INFO[tokenOut];

  const handleSwap = async () => {
    const steps = [];
    if (isApprovalNeeded) {
      steps.push({ id: "approve", type: "approve" as const, label: `Approve ${tokenInInfo?.symbol ?? "Token"}` });
    }
    steps.push({ id: "swap", type: "swap" as const, label: "Swap" });

    const executors: Record<string, () => Promise<`0x${string}` | undefined>> = {};
    if (isApprovalNeeded) {
      executors.approve = async () => {
        const h = await approve();
        return h as `0x${string}` | undefined;
      };
    }
    executors.swap = async () => {
      const h = await swap(slippage * 100);
      return h as `0x${string}` | undefined;
    };

    await pipeline.run(steps, executors);
    setAmountInStr("");
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 lg:py-12">
      <div className="grid grid-cols-1 lg:grid-cols-[480px_1fr] gap-6">
        <div className="order-2 lg:order-1">
      <Card>
        <CardHeader className="flex-row items-center justify-between pb-3">
          <CardTitle>Swap</CardTitle>
          <Button variant="ghost" size="icon">
            <Settings className="w-4 h-4" />
          </Button>
        </CardHeader>

        <CardContent className="space-y-2">
          {/* From */}
          <div className="rounded-xl bg-bg-input p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-text-tertiary font-semibold uppercase tracking-wider">From</span>
              {balanceIn && (
                <button
                  onClick={() =>
                    setAmountInStr(formatEther(balanceIn.value))
                  }
                  className="text-xs text-text-secondary hover:text-ice-400 transition-colors"
                >
                  Balance:{" "}
                  {formatTokenAmount(balanceIn.value, 18, 4)}
                </button>
              )}
            </div>
            <div className="flex items-center gap-3">
              <input
                type="text"
                inputMode="decimal"
                placeholder="0.0"
                value={amountInStr}
                onChange={(e) => setAmountInStr(e.target.value)}
                className="flex-1 min-w-0 bg-transparent text-2xl font-mono text-text-primary outline-none placeholder:text-text-tertiary"
              />
              <TokenSelector
                selectedToken={tokenIn}
                onSelectToken={(t) => setTokenIn(t)}
              />
            </div>
          </div>

          {/* Flip Button */}
          <div className="flex justify-center -my-3 relative z-10">
            <button
              onClick={flipTokens}
              className="w-10 h-10 rounded-xl bg-bg-card border border-border hover:border-ice-400/40 flex items-center justify-center transition-all hover:rotate-180 hover:shadow-[0_0_15px_rgba(96,165,250,0.2)] duration-300"
            >
              <ArrowDownUp className="w-5 h-5 text-ice-400" />
            </button>
          </div>

          {/* To */}
          <div className="rounded-xl bg-bg-input p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-text-tertiary font-semibold uppercase tracking-wider">To</span>
              {balanceOut && (
                <span className="text-xs text-text-secondary">
                  Balance:{" "}
                  {formatTokenAmount(balanceOut.value, 18, 4)}
                </span>
              )}
            </div>
            <div className="flex items-center gap-3">
              <div className="flex-1 text-2xl font-mono text-text-primary">
                {isQuoteLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin text-text-secondary" />
                ) : expectedAmountOut ? (
                  formatTokenAmount(expectedAmountOut, 18, 6)
                ) : (
                  <span className="text-text-tertiary">0.0</span>
                )}
              </div>
              <TokenSelector
                selectedToken={tokenOut}
                onSelectToken={(t) => setTokenOut(t)}
              />
            </div>
          </div>

          {/* Fee info — static fee tier */}
          <div className="flex items-center justify-between px-1 text-xs text-text-secondary">
            <span>Fee Tier</span>
            <Badge variant="secondary" className="bg-bg-input text-ice-400 hover:bg-bg-hover">0.3%</Badge>
          </div>

          {/* Action Button */}
          <div className="pt-2">
            {!isConnected ? (
              <Button className="w-full" disabled>
                Connect Wallet
              </Button>
            ) : !amountIn || amountIn === 0n ? (
              <Button className="w-full" variant="secondary" disabled>
                Enter an amount
              </Button>
            ) : (
              <Button
                className="w-full"
                onClick={handleSwap}
                disabled={isSwapPending || isApprovePending || !expectedAmountOut}
              >
                Swap
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
        </div>
        <div className="order-1 lg:order-2 min-w-0">
          <PriceChart tokenIn={tokenIn} tokenOut={tokenOut} />
        </div>
      </div>

      <TxPipelineModal
        open={pipeline.showTxModal}
        onClose={() => pipeline.reset()}
        steps={pipeline.txSteps}
        phase={pipeline.txPhase}
        title="Swap"
      />
    </div>
  );
}
