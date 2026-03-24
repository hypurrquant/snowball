"use client";

import { useState, useMemo } from "react";
import { Calculator, ChevronDown, ChevronUp, AlertTriangle } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/shared/components/ui/card";
import { formatUSD } from "@/shared/lib/utils";

const TOKEN_PAIRS = [
  { label: "wCTC / USDC", token0: "wCTC", token1: "USDC" },
  { label: "wCTC / sbUSD", token0: "wCTC", token1: "sbUSD" },
  { label: "lstCTC / USDC", token0: "lstCTC", token1: "USDC" },
  { label: "lstCTC / sbUSD", token0: "lstCTC", token1: "sbUSD" },
  { label: "sbUSD / USDC", token0: "sbUSD", token1: "USDC" },
] as const;

/** IL = 2 * sqrt(ratio) / (1 + ratio) - 1  (negative value = loss) */
function calcIL(priceRatio: number): number {
  return (2 * Math.sqrt(priceRatio)) / (1 + priceRatio) - 1;
}

export function ILSimulator() {
  const [isOpen, setIsOpen] = useState(false);
  const [pairIndex, setPairIndex] = useState(0);
  const [entryPrice, setEntryPrice] = useState("5.00");
  const [futurePrice, setFuturePrice] = useState("");

  const result = useMemo(() => {
    const entry = parseFloat(entryPrice);
    const future = parseFloat(futurePrice);
    if (!entry || entry <= 0 || !future || future <= 0) return null;

    const ratio = future / entry;
    const ilFraction = calcIL(ratio);
    const ilPct = ilFraction * 100;
    const depositUsd = 1000;
    const lpValue = depositUsd * (1 + ilFraction);
    const holdValue = depositUsd * Math.sqrt(ratio) * 2 / (1 + ratio) * (1 + ratio) / 2;
    // Simpler: held value = deposit * (1 + ratio) / 2 * ... use classic formula
    // Held value = deposit (both tokens appreciate/depreciate proportionally vs pool)
    // Classic: holdValue = depositUsd * (1 + Math.sqrt(ratio)) / 2 ... no, simpler:
    // V_hold = initial * (1 + ratio)/2   ... actually:
    // V_hold at price P1 = P0*qty_token + qty_stable
    //   where qty_token = deposit/2 / P0, qty_stable = deposit/2
    //   = (deposit/2/P0)*P1 + deposit/2  = deposit/2 * (P1/P0 + 1) = deposit/2 * (ratio+1)
    const holdValueCalc = (depositUsd / 2) * (ratio + 1);
    const lpValueCalc = depositUsd * (2 * Math.sqrt(ratio)) / (1 + ratio) * ((ratio + 1) / 2);
    // simplify: lpValue = deposit * sqrt(ratio)  ... classic Uniswap v2
    const lpValueSimple = depositUsd * Math.sqrt(ratio) * (2 / (1 + ratio)) * ((ratio + 1) / 2);
    // The cleanest: V_LP = sqrt(ratio) * deposit
    const lpFinal = depositUsd * Math.sqrt(ratio);
    const loss = holdValueCalc - lpFinal;
    const pctChange = (ratio - 1) * 100;

    return {
      ilPct,
      pctChange,
      lpFinal,
      holdValue: holdValueCalc,
      loss,
    };
  }, [entryPrice, futurePrice]);

  const ilColor =
    !result
      ? "text-text-secondary"
      : Math.abs(result.ilPct) < 1
      ? "text-emerald-400"
      : Math.abs(result.ilPct) < 5
      ? "text-amber-400"
      : "text-red-400";

  const ilSeverityLabel =
    !result
      ? null
      : Math.abs(result.ilPct) < 1
      ? "Low IL risk"
      : Math.abs(result.ilPct) < 5
      ? "Moderate IL risk"
      : "High IL risk — consider carefully";

  return (
    <Card className="bg-bg-card/60 backdrop-blur-xl border-white/5">
      {/* Collapsible header */}
      <button
        type="button"
        className="w-full text-left"
        onClick={() => setIsOpen((v) => !v)}
      >
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium text-text-secondary flex items-center gap-2">
              <Calculator className="w-4 h-4 text-violet-400" />
              IL Calculator
            </CardTitle>
            {isOpen ? (
              <ChevronUp className="w-4 h-4 text-text-tertiary" />
            ) : (
              <ChevronDown className="w-4 h-4 text-text-tertiary" />
            )}
          </div>
          {!isOpen && (
            <p className="text-xs text-text-tertiary mt-0.5">
              Estimate impermanent loss for LP positions
            </p>
          )}
        </CardHeader>
      </button>

      {isOpen && (
        <CardContent className="space-y-4">
          {/* Token pair selector */}
          <div className="space-y-1">
            <label className="text-xs text-text-secondary font-medium">Token Pair</label>
            <select
              className="w-full rounded-lg bg-bg-input border border-white/10 text-white text-sm px-3 py-2 focus:outline-none focus:border-ice-400/50"
              value={pairIndex}
              onChange={(e) => setPairIndex(Number(e.target.value))}
            >
              {TOKEN_PAIRS.map((p, i) => (
                <option key={p.label} value={i}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>

          {/* Price inputs */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs text-text-secondary font-medium">
                Entry Price ($)
              </label>
              <input
                type="number"
                min="0"
                step="any"
                placeholder="5.00"
                className="w-full rounded-lg bg-bg-input border border-white/10 text-white text-sm px-3 py-2 focus:outline-none focus:border-ice-400/50"
                value={entryPrice}
                onChange={(e) => setEntryPrice(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-text-secondary font-medium">
                Future Price ($)
              </label>
              <input
                type="number"
                min="0"
                step="any"
                placeholder="e.g. 6.00"
                className="w-full rounded-lg bg-bg-input border border-white/10 text-white text-sm px-3 py-2 focus:outline-none focus:border-ice-400/50"
                value={futurePrice}
                onChange={(e) => setFuturePrice(e.target.value)}
              />
            </div>
          </div>

          {/* Results */}
          {result ? (
            <div className="rounded-xl bg-bg-input/50 border border-white/5 p-4 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-text-secondary">Price Change</span>
                <span
                  className={
                    result.pctChange >= 0 ? "text-emerald-400 font-medium" : "text-red-400 font-medium"
                  }
                >
                  {result.pctChange >= 0 ? "+" : ""}
                  {result.pctChange.toFixed(2)}%
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-text-secondary">Impermanent Loss</span>
                <span className={`font-bold ${ilColor}`}>
                  {result.ilPct.toFixed(4)}%
                </span>
              </div>
              <div className="border-t border-white/5 pt-2 mt-2 space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-text-tertiary">If you held ($1,000)</span>
                  <span className="text-white font-medium">{formatUSD(result.holdValue)}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-text-tertiary">As LP ($1,000)</span>
                  <span className="text-white font-medium">{formatUSD(result.lpFinal)}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-text-tertiary">Opportunity Loss</span>
                  <span className={`font-semibold ${ilColor}`}>
                    -{formatUSD(Math.max(0, result.loss))}
                  </span>
                </div>
              </div>
              {ilSeverityLabel && (
                <div
                  className={`flex items-center gap-1.5 text-xs mt-1 ${ilColor}`}
                >
                  <AlertTriangle className="w-3 h-3 flex-shrink-0" />
                  <span>{ilSeverityLabel}</span>
                </div>
              )}
            </div>
          ) : (
            <p className="text-xs text-text-tertiary text-center py-2">
              Enter entry and future prices to calculate IL
            </p>
          )}

          <p className="text-xs text-text-tertiary leading-relaxed">
            IL is the difference between holding tokens vs providing liquidity when prices change.
            Higher price divergence = higher impermanent loss.
          </p>
        </CardContent>
      )}
    </Card>
  );
}
