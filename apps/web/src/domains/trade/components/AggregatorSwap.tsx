"use client";

import { useState, useMemo } from "react";
import { parseUnits, formatUnits, type Address } from "viem";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import { Input } from "@/shared/components/ui/input";
import { ArrowDownUp, Loader2, Trophy } from "lucide-react";
import { useDexAggregator, type AggregatorQuote } from "../hooks/useDexAggregator";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface TokenOption {
  symbol: string;
  address: Address;
  decimals: number;
}

interface AggregatorSwapProps {
  chainId: number;
  tokens: TokenOption[];
}

// ─── Component ────────────────────────────────────────────────────────────────

export function AggregatorSwap({ chainId, tokens }: AggregatorSwapProps) {
  const [tokenIn, setTokenIn] = useState<Address>(tokens[0]?.address ?? ("" as Address));
  const [tokenOut, setTokenOut] = useState<Address>(tokens[1]?.address ?? ("" as Address));
  const [amountInStr, setAmountInStr] = useState("");
  const [txError, setTxError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);

  const tokenInMeta = tokens.find((t) => t.address === tokenIn);
  const tokenOutMeta = tokens.find((t) => t.address === tokenOut);

  const amountIn = useMemo(() => {
    try {
      return amountInStr && tokenInMeta
        ? parseUnits(amountInStr, tokenInMeta.decimals)
        : undefined;
    } catch {
      return undefined;
    }
  }, [amountInStr, tokenInMeta]);

  const { quotes, bestQuote, isLoading, error, executeSwap } = useDexAggregator({
    chainId,
    tokenIn: tokenIn || undefined,
    tokenOut: tokenOut || undefined,
    amountIn,
  });

  const flipTokens = () => {
    setTokenIn(tokenOut);
    setTokenOut(tokenIn);
    setAmountInStr("");
    setTxError(null);
    setTxHash(null);
  };

  const handleSwap = async (quote: AggregatorQuote) => {
    setTxError(null);
    setTxHash(null);
    setIsExecuting(true);
    try {
      const hash = await executeSwap(quote);
      setTxHash(hash);
      setAmountInStr("");
    } catch (err) {
      setTxError(err instanceof Error ? err.message : "Transaction failed");
    } finally {
      setIsExecuting(false);
    }
  };

  const bestOutFormatted =
    bestQuote && tokenOutMeta
      ? formatUnits(bestQuote.amountOut, tokenOutMeta.decimals)
      : undefined;

  return (
    <Card className="bg-bg-card/60 backdrop-blur-xl border-white/5 max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="text-base text-white flex items-center gap-2">
          <ArrowDownUp className="w-4 h-4 text-emerald-400" />
          Aggregator Swap
          <Badge variant="outline" className="ml-auto text-xs border-emerald-400/30 text-emerald-300">
            Best Route
          </Badge>
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Token In */}
        <div className="space-y-1">
          <label className="text-xs text-text-secondary uppercase tracking-wider">
            You pay
          </label>
          <div className="flex gap-2">
            <select
              value={tokenIn}
              onChange={(e) => {
                setTokenIn(e.target.value as Address);
                setAmountInStr("");
                setTxError(null);
                setTxHash(null);
              }}
              className="rounded-lg bg-bg-input border border-white/10 text-white text-sm px-3 py-2 focus:outline-none focus:border-emerald-400/50"
            >
              {tokens
                .filter((t) => t.address !== tokenOut)
                .map((t) => (
                  <option key={t.address} value={t.address}>
                    {t.symbol}
                  </option>
                ))}
            </select>
            <Input
              type="number"
              min="0"
              placeholder="0.00"
              value={amountInStr}
              onChange={(e) => {
                setAmountInStr(e.target.value);
                setTxError(null);
                setTxHash(null);
              }}
              className="flex-1 bg-bg-input border-white/10 text-white placeholder:text-text-secondary"
            />
          </div>
        </div>

        {/* Flip button */}
        <div className="flex justify-center">
          <button
            onClick={flipTokens}
            className="p-2 rounded-lg bg-bg-input border border-white/10 hover:border-emerald-400/40 hover:bg-bg-hover transition-all"
          >
            <ArrowDownUp className="w-4 h-4 text-text-secondary" />
          </button>
        </div>

        {/* Token Out */}
        <div className="space-y-1">
          <label className="text-xs text-text-secondary uppercase tracking-wider">
            You receive
          </label>
          <div className="flex gap-2">
            <select
              value={tokenOut}
              onChange={(e) => setTokenOut(e.target.value as Address)}
              className="rounded-lg bg-bg-input border border-white/10 text-white text-sm px-3 py-2 focus:outline-none focus:border-emerald-400/50"
            >
              {tokens
                .filter((t) => t.address !== tokenIn)
                .map((t) => (
                  <option key={t.address} value={t.address}>
                    {t.symbol}
                  </option>
                ))}
            </select>
            <div className="flex-1 rounded-lg bg-bg-input border border-white/10 px-3 py-2 text-sm text-white min-h-[38px] flex items-center">
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin text-text-secondary" />
              ) : (
                <span className={bestOutFormatted ? "text-emerald-400 font-medium" : "text-text-secondary"}>
                  {bestOutFormatted ?? "—"}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Route comparison */}
        {(quotes.length > 0 || isLoading) && amountIn && amountIn > 0n && (
          <div className="rounded-lg border border-white/10 overflow-hidden">
            <div className="px-3 py-2 bg-white/[0.03] border-b border-white/5">
              <p className="text-xs text-text-secondary uppercase tracking-wider">
                Best Routes
              </p>
            </div>
            {isLoading && quotes.length === 0 ? (
              <div className="px-3 py-3 flex items-center gap-2 text-text-secondary text-sm">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Fetching quotes…
              </div>
            ) : (
              <div className="divide-y divide-white/5">
                {quotes.map((q, i) => {
                  const outFormatted = tokenOutMeta
                    ? Number(formatUnits(q.amountOut, tokenOutMeta.decimals)).toLocaleString(
                        undefined,
                        { maximumFractionDigits: 6 }
                      )
                    : q.amountOut.toString();
                  const isBest = i === 0;
                  return (
                    <div
                      key={q.aggregator}
                      className={`flex items-center justify-between px-3 py-2.5 ${
                        isBest ? "bg-emerald-400/5" : ""
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        {isBest && (
                          <Trophy className="w-3.5 h-3.5 text-emerald-400" />
                        )}
                        <span
                          className={`text-sm font-medium ${
                            isBest ? "text-emerald-400" : "text-text-secondary"
                          }`}
                        >
                          {q.aggregator}
                        </span>
                      </div>
                      <span
                        className={`text-sm font-mono ${
                          isBest ? "text-emerald-400" : "text-white/60"
                        }`}
                      >
                        {outFormatted}
                      </span>
                    </div>
                  );
                })}
                {quotes.length === 0 && (
                  <div className="px-3 py-3 text-sm text-text-secondary">
                    No quotes available for this pair.
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Error */}
        {(error || txError) && (
          <p className="text-xs text-red-400 text-center">
            {error ?? txError}
          </p>
        )}

        {/* Tx hash */}
        {txHash && (
          <p className="text-xs text-emerald-400 text-center break-all">
            TX: {txHash.slice(0, 10)}…{txHash.slice(-8)}
          </p>
        )}

        {/* Swap button */}
        <Button
          onClick={() => bestQuote && handleSwap(bestQuote)}
          disabled={isExecuting || isLoading || !bestQuote || !amountIn || amountIn === 0n}
          className="w-full bg-emerald-500 hover:bg-emerald-600 text-white disabled:opacity-50"
        >
          {isExecuting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          {bestQuote
            ? `Swap via ${bestQuote.aggregator}`
            : amountIn && amountIn > 0n
            ? "No routes found"
            : "Enter an amount"}
        </Button>

        <p className="text-xs text-text-secondary text-center">
          Quotes refresh every 15s · {quotes.length} aggregator
          {quotes.length !== 1 ? "s" : ""} checked
        </p>
      </CardContent>
    </Card>
  );
}
