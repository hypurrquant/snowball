"use client";

import { useState, useMemo } from "react";
import { useParams } from "next/navigation";
import { useConnection } from "wagmi";
import { useTokenBalance } from "@/shared/hooks/useTokenBalance";
import { type Address } from "viem";
import { Card, CardHeader, CardTitle, CardContent } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Badge } from "@/shared/components/ui/badge";
import { TOKEN_INFO } from "@/core/config/addresses";
import { useAddLiquidity } from "@/domains/trade/hooks/useAddLiquidity";
import { usePoolTicks } from "@/domains/trade/hooks/usePoolTicks";
import { PriceRangeSelector } from "@/domains/trade/components/PriceRangeSelector";
import { alignTickToSpacing } from "@/core/dex/calculators";
import { formatTokenAmount, parseTokenAmount } from "@/shared/lib/utils";
import { ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";

export default function PoolDetailPage() {
  const params = useParams<{ pair: string }>();
  const [token0, token1] = params.pair.split("-") as [Address, Address];

  const { address, isConnected } = useConnection();
  const [amount0Str, setAmount0Str] = useState("");
  const [amount1Str, setAmount1Str] = useState("");

  const token0Info = TOKEN_INFO[token0];
  const token1Info = TOKEN_INFO[token1];
  const decimals0 = token0Info?.decimals ?? 18;
  const decimals1 = token1Info?.decimals ?? 18;

  const { data: balance0 } = useTokenBalance({ address, token: token0 });
  const { data: balance1 } = useTokenBalance({ address, token: token1 });

  const {
    ticks,
    currentPrice,
    currentTick,
    tickSpacing,
    isLoading: ticksLoading,
  } = usePoolTicks(token0, token1, decimals0, decimals1);

  const { approveToken, isApprovePending, mint, isMintPending } =
    useAddLiquidity();

  // Initialize tick range to Common (10%) preset once currentTick is known
  const defaultRange = useMemo(() => {
    if (!currentTick || !tickSpacing) return { tickLower: -12000, tickUpper: 12000 };
    const delta = Math.log(1.1) / Math.log(1.0001); // 10%
    return {
      tickLower: Math.floor((currentTick - Math.abs(delta)) / tickSpacing) * tickSpacing,
      tickUpper: Math.ceil((currentTick + Math.abs(delta)) / tickSpacing) * tickSpacing,
    };
  }, [currentTick, tickSpacing]);

  const [tickRange, setTickRange] = useState<{ tickLower: number; tickUpper: number } | null>(null);
  const range = tickRange ?? defaultRange;

  const handleTickRangeChange = (tickLower: number, tickUpper: number) => {
    setTickRange({ tickLower, tickUpper });
  };

  const handleMint = async () => {
    if (!amount0Str || !amount1Str) return;
    try {
      const a0 = parseTokenAmount(amount0Str, decimals0);
      const a1 = parseTokenAmount(amount1Str, decimals1);
      await approveToken(token0, a0);
      await approveToken(token1, a1);
      await mint({
        token0,
        token1,
        tickLower: range.tickLower,
        tickUpper: range.tickUpper,
        amount0Desired: a0,
        amount1Desired: a1,
      });
      setAmount0Str("");
      setAmount1Str("");
    } catch (err) {
      console.error("Add liquidity failed:", err);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      {/* Back */}
      <Link
        href="/pool"
        className="flex items-center gap-2 text-sm text-text-secondary hover:text-text-primary mb-4 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Pools
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-4">
        {/* Form */}
        <Card>
          <CardHeader>
            <CardTitle>
              {token0Info?.symbol} / {token1Info?.symbol} — New Position
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Pair Info */}
            <div>
              <div className="section-title">Pair</div>
              <div className="flex items-center gap-3">
                <Badge variant="secondary">{token0Info?.symbol}</Badge>
                <span className="text-text-secondary">/</span>
                <Badge variant="secondary">{token1Info?.symbol}</Badge>
                {tickSpacing > 0 && (
                  <Badge variant="outline" className="ml-auto">
                    Fee: {tickSpacing === 10 ? "0.05" : tickSpacing === 60 ? "0.3" : "1"}%
                  </Badge>
                )}
              </div>
            </div>

            {/* Price Range with Liquidity Chart */}
            <div>
              <div className="section-title">Price Range</div>
              <PriceRangeSelector
                currentTick={currentTick}
                tickLower={range.tickLower}
                tickUpper={range.tickUpper}
                tickSpacing={tickSpacing}
                ticks={ticks}
                ticksLoading={ticksLoading}
                token0Decimals={decimals0}
                token1Decimals={decimals1}
                token0Symbol={token0Info?.symbol ?? "Token0"}
                token1Symbol={token1Info?.symbol ?? "Token1"}
                onTickRangeChange={handleTickRangeChange}
              />
            </div>

            {/* Deposit Amounts */}
            <div>
              <div className="section-title">Deposit Amounts</div>
              <div className="space-y-3">
                <div className="rounded-xl bg-bg-input p-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-text-tertiary">{token0Info?.symbol}</span>
                    {balance0 && (
                      <button
                        onClick={() =>
                          setAmount0Str(
                            formatTokenAmount(balance0.value, decimals0, decimals0).replace(/,/g, ""),
                          )
                        }
                        className="text-xs text-text-secondary hover:text-ice-400"
                      >
                        Max: {formatTokenAmount(balance0.value, decimals0, 4)}
                      </button>
                    )}
                  </div>
                  <Input
                    type="text"
                    inputMode="decimal"
                    placeholder="0.0"
                    value={amount0Str}
                    onChange={(e) => setAmount0Str(e.target.value)}
                    className="border-0 bg-transparent text-lg font-mono p-0 h-auto"
                  />
                </div>
                <div className="rounded-xl bg-bg-input p-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-text-tertiary">{token1Info?.symbol}</span>
                    {balance1 && (
                      <button
                        onClick={() =>
                          setAmount1Str(
                            formatTokenAmount(balance1.value, decimals1, decimals1).replace(/,/g, ""),
                          )
                        }
                        className="text-xs text-text-secondary hover:text-ice-400"
                      >
                        Max: {formatTokenAmount(balance1.value, decimals1, 4)}
                      </button>
                    )}
                  </div>
                  <Input
                    type="text"
                    inputMode="decimal"
                    placeholder="0.0"
                    value={amount1Str}
                    onChange={(e) => setAmount1Str(e.target.value)}
                    className="border-0 bg-transparent text-lg font-mono p-0 h-auto"
                  />
                </div>
              </div>
            </div>

            {/* Action */}
            <Button
              className="w-full"
              onClick={handleMint}
              disabled={
                !isConnected ||
                !amount0Str ||
                !amount1Str ||
                isMintPending ||
                isApprovePending
              }
            >
              {isMintPending || isApprovePending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : null}
              {isApprovePending
                ? "Approving..."
                : isMintPending
                  ? "Adding..."
                  : "Add Liquidity"}
            </Button>
          </CardContent>
        </Card>

        {/* Preview Sidebar */}
        <Card className="h-fit sticky top-20">
          <CardHeader>
            <CardTitle className="text-sm">Preview</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-text-secondary">Pair</span>
              <span>
                {token0Info?.symbol} / {token1Info?.symbol}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-secondary">Current Price</span>
              <span className="font-mono">
                {currentPrice ? currentPrice.toFixed(4) : "—"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-secondary">Tick Range</span>
              <span className="font-mono text-xs">
                [{range.tickLower}, {range.tickUpper}]
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-secondary">{token0Info?.symbol}</span>
              <span className="font-mono">{amount0Str || "0"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-secondary">{token1Info?.symbol}</span>
              <span className="font-mono">{amount1Str || "0"}</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
