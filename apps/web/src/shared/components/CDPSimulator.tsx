"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, ChevronUp, TrendingUp } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/shared/components/ui/card";
import { Slider } from "@/shared/components/ui/slider";
import { Button } from "@/shared/components/ui/button";

// wCTC mock price in USD (matches testnet oracle: $5)
const WCTC_PRICE_USD = 5;
// Minimum Collateral Ratio (110%)
const MCR = 1.1;

const MAX_COLLATERAL = 10_000;
const MAX_BORROW = 40_000;

function crColor(cr: number): string {
  if (cr === 0) return "text-text-tertiary";
  if (cr >= 200) return "text-emerald-400";
  if (cr >= 150) return "text-yellow-400";
  return "text-red-400";
}

function crLabel(cr: number): string {
  if (cr === 0) return "—";
  if (cr >= 200) return "Safe";
  if (cr >= 150) return "Caution";
  return "Danger";
}

export function CDPSimulator() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [collateral, setCollateral] = useState(500);
  const [borrow, setBorrow] = useState(1000);

  const collValueUsd = collateral * WCTC_PRICE_USD;

  const { cr, liqPrice, annualCost } = useMemo(() => {
    if (borrow === 0) return { cr: 0, liqPrice: 0, annualCost: 0 };
    const collRatio = (collValueUsd / borrow) * 100;
    // liqPrice = (debt * MCR) / collateral
    const liquidationPrice = (borrow * MCR) / collateral;
    return {
      cr: collRatio,
      liqPrice: liquidationPrice,
      annualCost: borrow * 0.05,
    };
  }, [collateral, borrow, collValueUsd]);

  const maxBorrowSafe = Math.floor(collValueUsd / 2); // 200% CR
  const borrowTooHigh = borrow > 0 && cr > 0 && cr < MCR * 100;

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
              <TrendingUp className="w-4 h-4 text-ice-400" />
              CDP Simulator
            </CardTitle>
            {isOpen ? (
              <ChevronUp className="w-4 h-4 text-text-tertiary" />
            ) : (
              <ChevronDown className="w-4 h-4 text-text-tertiary" />
            )}
          </div>
          {!isOpen && (
            <p className="text-xs text-text-tertiary mt-0.5">
              Plan your CDP position with live CR calculation
            </p>
          )}
        </CardHeader>
      </button>

      {isOpen && (
        <CardContent className="space-y-5">
          {/* Collateral slider */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-text-secondary font-medium">Collateral (wCTC)</span>
              <span className="font-mono text-white font-semibold">{collateral.toLocaleString()}</span>
            </div>
            <Slider
              min={1}
              max={MAX_COLLATERAL}
              step={1}
              value={[collateral]}
              onValueChange={([v]) => setCollateral(v)}
            />
            <p className="text-xs text-text-tertiary">
              = ${collValueUsd.toLocaleString(undefined, { maximumFractionDigits: 0 })} USD
            </p>
          </div>

          {/* Borrow slider */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-text-secondary font-medium">Borrow (sbUSD)</span>
              <span className="font-mono text-white font-semibold">{borrow.toLocaleString()}</span>
            </div>
            <Slider
              min={0}
              max={MAX_BORROW}
              step={10}
              value={[borrow]}
              onValueChange={([v]) => setBorrow(v)}
              rangeClassName={borrowTooHigh ? "bg-red-400" : undefined}
            />
            {maxBorrowSafe > 0 && (
              <p className="text-xs text-text-tertiary">
                Safe max:{" "}
                <button
                  className="text-emerald-400 hover:text-emerald-300 transition-colors"
                  onClick={() => setBorrow(maxBorrowSafe)}
                >
                  {maxBorrowSafe.toLocaleString()} sbUSD
                </button>{" "}
                (200% CR)
              </p>
            )}
          </div>

          {/* Results */}
          <div className="rounded-xl bg-bg-input/50 border border-white/5 p-4 space-y-2.5">
            <p className="text-xs text-text-tertiary font-medium uppercase tracking-wider mb-3">Results</p>
            <div className="flex items-center justify-between text-sm">
              <span className="text-text-secondary">Collateral Ratio</span>
              <span className={`font-mono font-bold ${crColor(cr)}`}>
                {cr === 0 ? "—" : `${cr.toFixed(1)}%`}{" "}
                {cr > 0 && (
                  <span className="text-xs font-normal ml-1 opacity-70">{crLabel(cr)}</span>
                )}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-text-secondary">Liquidation Price</span>
              <span className="font-mono text-white">
                {liqPrice > 0 ? `$${liqPrice.toFixed(2)}` : "—"}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-text-secondary">Interest Rate</span>
              <span className="font-mono text-white">5% APR</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-text-secondary">Annual Cost</span>
              <span className="font-mono text-white">
                {annualCost > 0 ? `${annualCost.toLocaleString(undefined, { maximumFractionDigits: 2 })} sbUSD` : "—"}
              </span>
            </div>
          </div>

          {/* Risk zones */}
          <div className="rounded-xl bg-bg-input/50 border border-white/5 p-4 space-y-2">
            <p className="text-xs text-text-tertiary font-medium uppercase tracking-wider mb-3">Risk Zones</p>
            <div className="space-y-1.5 text-xs">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 flex-shrink-0" />
                <span className="text-text-secondary">Safe: CR &gt; 200%</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-yellow-400 flex-shrink-0" />
                <span className="text-text-secondary">Caution: CR 150–200%</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-red-400 flex-shrink-0" />
                <span className="text-text-secondary">Danger: CR &lt; 150%</span>
              </div>
            </div>
          </div>

          <Button
            className="w-full"
            onClick={() => router.push("/liquity/borrow")}
          >
            Open CDP
          </Button>
        </CardContent>
      )}
    </Card>
  );
}
