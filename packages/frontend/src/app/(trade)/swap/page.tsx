"use client";

import { useState, useMemo } from "react";
import { useConnection } from "wagmi";
import { useTokenBalance } from "@/hooks/useTokenBalance";
import { parseEther, formatEther, type Address } from "viem";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TOKENS, TOKEN_INFO } from "@/config/addresses";
import { useSwap } from "@/hooks/trade/useSwap";
import { formatTokenAmount } from "@/lib/utils";
import { ArrowDownUp, Settings, Loader2 } from "lucide-react";
import { TokenSelector } from "@/components/common/TokenSelector";

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
    fee,
    isQuoteLoading,
    isApprovalNeeded,
    approve,
    isApprovePending,
    swap,
    isSwapPending,
  } = useSwap(tokenIn, tokenOut, amountIn);

  const flipTokens = () => {
    setTokenIn(tokenOut);
    setTokenOut(tokenIn);
    setAmountInStr("");
  };

  const tokenInInfo = TOKEN_INFO[tokenIn];
  const tokenOutInfo = TOKEN_INFO[tokenOut];

  const handleSwap = async () => {
    try {
      if (isApprovalNeeded) {
        await approve();
      }
      await swap(slippage * 100);
      setAmountInStr("");
    } catch (err) {
      console.error("Swap failed:", err);
    }
  };

  return (
    <div className="flex justify-center px-4 py-8 lg:py-12">
      <Card className="w-full max-w-[480px]">
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
              <span className="text-xs text-[#4A4B57] font-semibold uppercase tracking-wider">From</span>
              {balanceIn && (
                <button
                  onClick={() =>
                    setAmountInStr(formatEther(balanceIn.value))
                  }
                  className="text-xs text-[#8B8D97] hover:text-[#60a5fa] transition-colors"
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
                className="flex-1 bg-transparent text-2xl font-mono text-text-primary outline-none placeholder:text-[#4A4B57]"
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
              className="w-10 h-10 rounded-xl bg-[#141525] border border-[#1F2037] hover:border-[#60a5fa]/40 flex items-center justify-center transition-all hover:rotate-180 hover:shadow-[0_0_15px_rgba(96,165,250,0.2)] duration-300"
            >
              <ArrowDownUp className="w-5 h-5 text-[#60a5fa]" />
            </button>
          </div>

          {/* To */}
          <div className="rounded-xl bg-[#1C1D30] p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-[#4A4B57] font-semibold uppercase tracking-wider">To</span>
              {balanceOut && (
                <span className="text-xs text-[#8B8D97]">
                  Balance:{" "}
                  {formatTokenAmount(balanceOut.value, 18, 4)}
                </span>
              )}
            </div>
            <div className="flex items-center gap-3">
              <div className="flex-1 text-2xl font-mono text-[#F5F5F7]">
                {isQuoteLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin text-[#8B8D97]" />
                ) : expectedAmountOut ? (
                  formatTokenAmount(expectedAmountOut, 18, 6)
                ) : (
                  <span className="text-[#4A4B57]">0.0</span>
                )}
              </div>
              <TokenSelector
                selectedToken={tokenOut}
                onSelectToken={(t) => setTokenOut(t)}
              />
            </div>
          </div>

          {/* Fee info */}
          {fee !== undefined && (
            <div className="flex items-center justify-between px-1 text-xs text-[#8B8D97]">
              <span>Dynamic Fee</span>
              <Badge variant="secondary" className="bg-[#1C1D30] text-[#60a5fa] hover:bg-[#1a2035]">{Number(fee) / 100}%</Badge>
            </div>
          )}

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
            ) : isApprovalNeeded ? (
              <Button
                className="w-full"
                variant="warning"
                onClick={approve}
                disabled={isApprovePending}
              >
                {isApprovePending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : null}
                Approve {tokenInInfo?.symbol}
              </Button>
            ) : (
              <Button
                className="w-full"
                onClick={handleSwap}
                disabled={isSwapPending || !expectedAmountOut}
              >
                {isSwapPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : null}
                Swap
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
