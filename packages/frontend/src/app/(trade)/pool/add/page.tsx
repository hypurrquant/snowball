"use client";

import { useState } from "react";
import { useConnection } from "wagmi";
import { useTokenBalance } from "@/hooks/useTokenBalance";
import { parseEther, type Address } from "viem";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { TOKENS, TOKEN_INFO } from "@/config/addresses";
import { useAddLiquidity } from "@/hooks/trade/useAddLiquidity";
import { usePool } from "@/hooks/trade/usePool";
import { formatTokenAmount } from "@/lib/utils";
import { ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";

const TOKEN_LIST = Object.entries(TOKENS) as [string, Address][];

const RANGE_PRESETS = [
  { label: "Full", tickLower: -887220, tickUpper: 887220 },
  { label: "Safe", tickLower: -60000, tickUpper: 60000 },
  { label: "Common", tickLower: -12000, tickUpper: 12000 },
  { label: "Expert", tickLower: -600, tickUpper: 600 },
];

export default function AddLiquidityPage() {
  const { address, isConnected } = useConnection();
  const [token0, setToken0] = useState<Address>(TOKENS.wCTC);
  const [token1, setToken1] = useState<Address>(TOKENS.sbUSD);
  const [amount0Str, setAmount0Str] = useState("");
  const [amount1Str, setAmount1Str] = useState("");
  const [selectedRange, setSelectedRange] = useState(0);

  const { data: balance0 } = useTokenBalance({ address, token: token0 });
  const { data: balance1 } = useTokenBalance({ address, token: token1 });
  const pool = usePool(token0, token1);
  const { approveToken, isApprovePending, mint, isMintPending } =
    useAddLiquidity();

  const token0Info = TOKEN_INFO[token0];
  const token1Info = TOKEN_INFO[token1];
  const range = RANGE_PRESETS[selectedRange];

  const handleMint = async () => {
    if (!amount0Str || !amount1Str) return;
    try {
      const a0 = parseEther(amount0Str);
      const a1 = parseEther(amount1Str);
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
            <CardTitle>Add Liquidity</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Step 1: Select Pair */}
            <div>
              <div className="section-title">1. Select Pair</div>
              <div className="flex gap-3">
                <select
                  value={token0}
                  onChange={(e) => setToken0(e.target.value as Address)}
                  className="flex-1 bg-bg-input border border-border rounded-xl px-3 py-2 text-sm"
                >
                  {TOKEN_LIST.map(([sym, addr]) => (
                    <option key={addr} value={addr}>{sym}</option>
                  ))}
                </select>
                <select
                  value={token1}
                  onChange={(e) => setToken1(e.target.value as Address)}
                  className="flex-1 bg-bg-input border border-border rounded-xl px-3 py-2 text-sm"
                >
                  {TOKEN_LIST.map(([sym, addr]) => (
                    <option key={addr} value={addr}>{sym}</option>
                  ))}
                </select>
              </div>
              {pool.dynamicFee !== undefined && (
                <div className="mt-2 text-xs text-text-secondary">
                  Dynamic Fee: <Badge variant="secondary">{Number(pool.dynamicFee) / 100}%</Badge>
                </div>
              )}
            </div>

            {/* Step 2: Price Range */}
            <div>
              <div className="section-title">2. Price Range</div>
              <div className="flex gap-2 mb-3">
                {RANGE_PRESETS.map((preset, i) => (
                  <Button
                    key={preset.label}
                    variant={selectedRange === i ? "default" : "secondary"}
                    size="sm"
                    onClick={() => setSelectedRange(i)}
                  >
                    {preset.label}
                  </Button>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-bg-input p-3 text-center">
                  <span className="text-xs text-text-tertiary">Min Price</span>
                  <div className="text-lg font-mono mt-1">
                    {range.tickLower === -887220 ? "0" : range.tickLower}
                  </div>
                </div>
                <div className="rounded-xl bg-bg-input p-3 text-center">
                  <span className="text-xs text-text-tertiary">Max Price</span>
                  <div className="text-lg font-mono mt-1">
                    {range.tickUpper === 887220 ? "∞" : range.tickUpper}
                  </div>
                </div>
              </div>
            </div>

            {/* Step 3: Amounts */}
            <div>
              <div className="section-title">3. Deposit Amounts</div>
              <div className="space-y-3">
                <div className="rounded-xl bg-bg-input p-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-text-tertiary">{token0Info?.symbol}</span>
                    {balance0 && (
                      <button
                        onClick={() => setAmount0Str(formatTokenAmount(balance0.value, 18, 18).replace(/,/g, ""))}
                        className="text-xs text-text-secondary hover:text-ice-400"
                      >
                        Max: {formatTokenAmount(balance0.value, 18, 4)}
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
                        onClick={() => setAmount1Str(formatTokenAmount(balance1.value, 18, 18).replace(/,/g, ""))}
                        className="text-xs text-text-secondary hover:text-ice-400"
                      >
                        Max: {formatTokenAmount(balance1.value, 18, 4)}
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
              <span>{token0Info?.symbol} / {token1Info?.symbol}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-secondary">Range</span>
              <span>{range.label}</span>
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
