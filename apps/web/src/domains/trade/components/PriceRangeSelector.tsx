"use client";

import { useMemo, useEffect, useLayoutEffect, useRef, useState, useCallback } from "react";
import {
  tickToPrice,
  priceToTick,
  alignTickToSpacing,
  formatPriceCompact,
} from "@/core/dex/calculators";
import type { TickDisplayData } from "@/core/dex/types";
import { RANGE_PRESETS } from "../lib/constants";

// ────────────────────────────────────────────
// Types
// ────────────────────────────────────────────

interface PriceRangeSelectorProps {
  currentTick: number;
  tickLower: number;
  tickUpper: number;
  tickSpacing: number;
  ticks: TickDisplayData[];
  ticksLoading: boolean;
  token0Decimals: number;
  token1Decimals: number;
  token0Symbol: string;
  token1Symbol: string;
  onTickRangeChange: (tickLower: number, tickUpper: number) => void;
}

type TickRange = { priceLower: number; priceUpper: number };

// Mini histogram bar patterns for each preset (5 bars, heights out of 5)
const PRESET_MINI_BARS: Record<string, number[]> = {
  Narrow: [1, 3, 5, 3, 1],
  Common: [2, 4, 5, 4, 2],
  Wide: [3, 4, 5, 4, 3],
  Full: [4, 4, 5, 4, 4],
  Custom: [2, 3, 5, 2, 4],
};

// Viewport: inactive ticks guaranteed on each side
const MIN_SIDE_TICKS = 5;

// ────────────────────────────────────────────
// Main Component
// ────────────────────────────────────────────

export function PriceRangeSelector({
  currentTick,
  tickLower,
  tickUpper,
  tickSpacing,
  ticks,
  ticksLoading,
  token0Decimals,
  token1Decimals,
  token0Symbol,
  token1Symbol,
  onTickRangeChange,
}: PriceRangeSelectorProps) {
  const currentPrice = tickToPrice(currentTick, token0Decimals, token1Decimals);
  const minPrice = tickToPrice(tickLower, token0Decimals, token1Decimals);
  const maxPrice = tickToPrice(tickUpper, token0Decimals, token1Decimals);

  // Frozen ticks during drag (prevents bar reflow)
  const [frozenTicks, setFrozenTicks] = useState<TickDisplayData[] | null>(null);

  // Viewport filtering — show active range + proportional margin + min side ticks
  const viewportTicks = useMemo(() => {
    if (frozenTicks !== null) return frozenTicks;
    if (!ticks.length) return ticks;

    // Find active range tick indices
    let firstActiveIdx = -1;
    let lastActiveIdx = -1;
    for (let i = 0; i < ticks.length; i++) {
      const mid = (ticks[i].priceLower + ticks[i].priceUpper) / 2;
      if (mid >= minPrice && mid <= maxPrice) {
        if (firstActiveIdx === -1) firstActiveIdx = i;
        lastActiveIdx = i;
      }
    }

    // Proportional margin (50% of price span on each side)
    const priceSpan = maxPrice - minPrice;
    const proportionalMargin = priceSpan * 0.5;

    // Min tick guarantee on each side
    let tickMarginLeft = 0;
    let tickMarginRight = 0;
    if (firstActiveIdx >= 0) {
      const leftIdx = Math.max(0, firstActiveIdx - MIN_SIDE_TICKS);
      const rightIdx = Math.min(ticks.length - 1, lastActiveIdx + MIN_SIDE_TICKS);
      tickMarginLeft = minPrice - ticks[leftIdx].priceLower;
      tickMarginRight = ticks[rightIdx].priceUpper - maxPrice;
      const maxMargin = priceSpan * 4;
      tickMarginLeft = Math.min(tickMarginLeft, maxMargin);
      tickMarginRight = Math.min(tickMarginRight, maxMargin);
    }

    const finalViewMin = minPrice - Math.max(proportionalMargin, tickMarginLeft);
    const finalViewMax = maxPrice + Math.max(proportionalMargin, tickMarginRight);

    return ticks.filter((t) => t.priceUpper >= finalViewMin && t.priceLower <= finalViewMax);
  }, [frozenTicks, ticks, minPrice, maxPrice]);

  const ticksRef = useRef(viewportTicks);
  ticksRef.current = viewportTicks;

  const handleDragStateChange = useCallback((isDragging: boolean) => {
    if (isDragging) {
      setFrozenTicks(ticksRef.current);
    } else {
      setFrozenTicks(null);
    }
  }, []);

  // % diff from current price
  const minPctDiff = currentPrice > 0 ? ((minPrice - currentPrice) / currentPrice) * 100 : 0;
  const maxPctDiff = currentPrice > 0 ? ((maxPrice - currentPrice) / currentPrice) * 100 : 0;

  // Active preset detection
  const activePreset = useMemo(() => {
    for (const preset of RANGE_PRESETS) {
      if (preset.label === "Custom") continue;
      if (preset.percent === -1) {
        const fullLower = alignTickToSpacing(-887272, tickSpacing, true);
        const fullUpper = alignTickToSpacing(887272, tickSpacing, false);
        if (tickLower === fullLower && tickUpper === fullUpper) return "Full";
      } else {
        const delta = Math.log(1 + preset.percent / 100) / Math.log(1.0001);
        const expectedLower = Math.floor((currentTick - Math.abs(delta)) / tickSpacing) * tickSpacing;
        const expectedUpper = Math.ceil((currentTick + Math.abs(delta)) / tickSpacing) * tickSpacing;
        if (tickLower === expectedLower && tickUpper === expectedUpper) return preset.label;
      }
    }
    return "Custom";
  }, [tickLower, tickUpper, currentTick, tickSpacing]);

  // Preset handler
  const handlePreset = (preset: typeof RANGE_PRESETS[number]) => {
    if (preset.label === "Custom") return;
    setFrozenTicks(null);
    if (preset.percent === -1) {
      onTickRangeChange(
        alignTickToSpacing(-887272, tickSpacing, true),
        alignTickToSpacing(887272, tickSpacing, false),
      );
    } else {
      const delta = Math.log(1 + preset.percent / 100) / Math.log(1.0001);
      const lower = Math.floor((currentTick - Math.abs(delta)) / tickSpacing) * tickSpacing;
      const upper = Math.ceil((currentTick + Math.abs(delta)) / tickSpacing) * tickSpacing;
      onTickRangeChange(lower, upper);
    }
  };

  // +/- step handlers
  const stepMin = (direction: 1 | -1) => {
    const newTickLower = tickLower + direction * tickSpacing;
    if (newTickLower < tickUpper) onTickRangeChange(newTickLower, tickUpper);
  };

  const stepMax = (direction: 1 | -1) => {
    const newTickUpper = tickUpper + direction * tickSpacing;
    if (newTickUpper > tickLower) onTickRangeChange(tickLower, newTickUpper);
  };

  // Direct price input
  const handleMinPriceInput = (value: string) => {
    const price = parseFloat(value);
    if (isNaN(price) || price <= 0) return;
    const tick = alignTickToSpacing(priceToTick(price, token0Decimals, token1Decimals), tickSpacing, true);
    if (tick < tickUpper) onTickRangeChange(tick, tickUpper);
  };

  const handleMaxPriceInput = (value: string) => {
    const price = parseFloat(value);
    if (isNaN(price) || price <= 0) return;
    const tick = alignTickToSpacing(priceToTick(price, token0Decimals, token1Decimals), tickSpacing, false);
    if (tick > tickLower) onTickRangeChange(tickLower, tick);
  };

  const tokenPair = `${token0Symbol}/${token1Symbol}`;

  return (
    <div className="space-y-3">
      {/* Preset cards */}
      <div className="flex gap-1.5">
        {RANGE_PRESETS.map((preset) => (
          <button
            key={preset.label}
            onClick={() => handlePreset(preset)}
            className={`flex-1 py-1.5 px-1 text-xs font-medium rounded-lg border transition-colors flex flex-col items-center gap-1 ${
              activePreset === preset.label
                ? "border-ice-400 bg-ice-400/15 text-ice-400"
                : "border-border-primary bg-bg-input text-text-secondary hover:border-border-secondary"
            }`}
          >
            {/* Mini histogram bars */}
            <div className="flex items-end gap-[1px] h-[10px]">
              {(PRESET_MINI_BARS[preset.label] ?? [3, 3, 3, 3, 3]).map((h, i) => (
                <div
                  key={i}
                  className={`w-[3px] rounded-t-[1px] ${
                    activePreset === preset.label ? "bg-ice-400" : "bg-text-tertiary/40"
                  }`}
                  style={{ height: `${(h / 5) * 10}px` }}
                />
              ))}
            </div>
            {preset.label}
          </button>
        ))}
      </div>

      {/* Liquidity histogram */}
      <LiquidityHistogram
        ticks={viewportTicks}
        currentPrice={currentPrice}
        minPrice={minPrice}
        maxPrice={maxPrice}
        isLoading={ticksLoading}
        tickSpacing={tickSpacing}
        tickLower={tickLower}
        tickUpper={tickUpper}
        token0Decimals={token0Decimals}
        token1Decimals={token1Decimals}
        onTickRangeChange={onTickRangeChange}
        onDragStateChange={handleDragStateChange}
      />

      {/* MIN / MAX price inputs */}
      <div className="grid grid-cols-2 gap-3">
        <PriceInput
          label="Min Price"
          price={minPrice}
          pctDiff={minPctDiff}
          pctColor={minPctDiff >= 0 ? "text-green-400" : "text-red-400"}
          onStep={stepMin}
          onPriceChange={handleMinPriceInput}
          tokenPair={tokenPair}
        />
        <PriceInput
          label="Max Price"
          price={maxPrice}
          pctDiff={maxPctDiff}
          pctColor={maxPctDiff >= 0 ? "text-green-400" : "text-red-400"}
          onStep={stepMax}
          onPriceChange={handleMaxPriceInput}
          tokenPair={tokenPair}
        />
      </div>

      {/* Current price */}
      <div className="text-center text-xs text-text-tertiary">
        Current Price:{" "}
        <span className="text-text-primary font-medium">
          {currentPrice > 0 ? formatPriceCompact(currentPrice) : "—"}
        </span>{" "}
        {currentPrice > 0 ? tokenPair : ""}
      </div>
    </div>
  );
}

// ────────────────────────────────────────────
// PriceInput sub-component
// ────────────────────────────────────────────

function PriceInput({
  label,
  price,
  pctDiff,
  pctColor,
  onStep,
  onPriceChange,
  tokenPair,
}: {
  label: string;
  price: number;
  pctDiff: number;
  pctColor: string;
  onStep: (direction: 1 | -1) => void;
  onPriceChange: (value: string) => void;
  tokenPair: string;
}) {
  const pctText = pctDiff >= 0 ? `+${pctDiff.toFixed(1)}%` : `${pctDiff.toFixed(1)}%`;

  return (
    <div className="bg-bg-input border border-border-primary rounded-xl p-2.5">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[10px] text-text-tertiary">{label}</span>
        <span className={`text-[10px] ${pctColor}`}>{pctText}</span>
      </div>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onStep(-1)}
          className="w-6 h-6 flex items-center justify-center rounded bg-bg-secondary text-text-secondary hover:text-text-primary hover:bg-bg-tertiary transition-colors text-sm font-bold"
        >
          -
        </button>
        <input
          type="text"
          inputMode="decimal"
          defaultValue={formatPriceCompact(price)}
          key={`${Math.round(price * 1e8)}`}
          onBlur={(e) => onPriceChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") onPriceChange(e.currentTarget.value);
          }}
          className="flex-1 min-w-0 bg-transparent text-center text-sm font-medium text-text-primary outline-none"
        />
        <button
          onClick={() => onStep(1)}
          className="w-6 h-6 flex items-center justify-center rounded bg-bg-secondary text-text-secondary hover:text-text-primary hover:bg-bg-tertiary transition-colors text-sm font-bold"
        >
          +
        </button>
      </div>
      <div className="text-center text-[9px] text-text-tertiary mt-1">{tokenPair}</div>
    </div>
  );
}

// ────────────────────────────────────────────
// LiquidityHistogram sub-component
// ────────────────────────────────────────────

interface LiquidityHistogramProps {
  ticks: TickDisplayData[];
  currentPrice: number;
  minPrice: number;
  maxPrice: number;
  isLoading: boolean;
  tickSpacing: number;
  tickLower: number;
  tickUpper: number;
  token0Decimals: number;
  token1Decimals: number;
  onTickRangeChange: (tickLower: number, tickUpper: number) => void;
  onDragStateChange: (isDragging: boolean) => void;
}

function LiquidityHistogram(props: LiquidityHistogramProps) {
  const {
    ticks,
    currentPrice,
    minPrice,
    maxPrice,
    isLoading,
    tickSpacing,
    tickLower,
    tickUpper,
    token0Decimals,
    token1Decimals,
    onTickRangeChange,
    onDragStateChange,
  } = props;

  // Bar area width measurement with ResizeObserver (on inner zoomable container)
  const barAreaRef = useRef<HTMLDivElement | null>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  const [barAreaWidth, setBarAreaWidth] = useState(0);

  const barAreaCallbackRef = useCallback((node: HTMLDivElement | null) => {
    if (resizeObserverRef.current) {
      resizeObserverRef.current.disconnect();
      resizeObserverRef.current = null;
    }
    barAreaRef.current = node;
    if (node) {
      setBarAreaWidth(node.getBoundingClientRect().width);
      const observer = new ResizeObserver((entries) => {
        for (const entry of entries) {
          setBarAreaWidth(entry.contentRect.width);
        }
      });
      observer.observe(node);
      resizeObserverRef.current = observer;
    } else {
      setBarAreaWidth(0);
    }
  }, []);

  useLayoutEffect(() => {
    if (barAreaRef.current && barAreaWidth === 0) {
      setBarAreaWidth(barAreaRef.current.getBoundingClientRect().width);
    }
  });

  // Drag context
  const dragRef = useRef<{
    handle: "min" | "max";
    containerRect: DOMRect;
    ticks: TickRange[];
  } | null>(null);
  const rafRef = useRef<number | null>(null);

  const maxLiquidity = useMemo(() => {
    if (!ticks.length) return 0;
    const max = Math.max(...ticks.map((t) => t.liquidityUsd));
    return Number.isFinite(max) ? max : 0;
  }, [ticks]);

  // Cleanup rAF on unmount
  useEffect(() => {
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  // Handle + overlay positions (tick-index coordinate system)
  const minHandlePx = priceToPx(minPrice, ticks, barAreaWidth);
  const maxHandlePx = priceToPx(maxPrice, ticks, barAreaWidth);
  const currentPricePx = priceToPx(currentPrice, ticks, barAreaWidth);
  const minPctDiff = currentPrice > 0 ? ((minPrice - currentPrice) / currentPrice) * 100 : 0;
  const maxPctDiff = currentPrice > 0 ? ((maxPrice - currentPrice) / currentPrice) * 100 : 0;
  const showHandles = barAreaWidth > 0 && ticks.length > 0;

  // Window-level drag handlers
  const dragPropsRef = useRef({
    tickLower,
    tickUpper,
    tickSpacing,
    token0Decimals,
    token1Decimals,
    onTickRangeChange,
    onDragStateChange,
  });
  dragPropsRef.current = {
    tickLower,
    tickUpper,
    tickSpacing,
    token0Decimals,
    token1Decimals,
    onTickRangeChange,
    onDragStateChange,
  };

  const handlePointerDown = (handle: "min" | "max", e: React.PointerEvent) => {
    const rect = barAreaRef.current?.getBoundingClientRect();
    if (!rect) return;
    e.preventDefault();
    dragRef.current = { handle, containerRect: rect, ticks };
    onDragStateChange(true);

    const onMove = (me: PointerEvent) => {
      if (!dragRef.current) return;
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      const clientX = me.clientX;
      rafRef.current = requestAnimationFrame(() => {
        const ctx = dragRef.current;
        if (!ctx) return;
        const p = dragPropsRef.current;
        const px = Math.max(0, Math.min(ctx.containerRect.width, clientX - ctx.containerRect.left));
        const price = pxToPrice(px, ctx.ticks, ctx.containerRect.width);
        const rawTick = priceToTick(price, p.token0Decimals, p.token1Decimals);
        if (ctx.handle === "min") {
          const snapped = alignTickToSpacing(rawTick, p.tickSpacing, true);
          const clamped = Math.min(snapped, p.tickUpper - p.tickSpacing);
          p.onTickRangeChange(clamped, p.tickUpper);
        } else {
          const snapped = alignTickToSpacing(rawTick, p.tickSpacing, false);
          const clamped = Math.max(snapped, p.tickLower + p.tickSpacing);
          p.onTickRangeChange(p.tickLower, clamped);
        }
        rafRef.current = null;
      });
    };

    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      dragRef.current = null;
      dragPropsRef.current.onDragStateChange(false);
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
  };

  if (isLoading) {
    return (
      <div className="h-[160px] bg-bg-input rounded-xl flex items-center justify-center">
        <div className="w-4 h-4 border-2 border-ice-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!ticks.length) {
    return (
      <div className="h-[160px] bg-bg-input rounded-xl flex items-center justify-center">
        <span className="text-xs text-text-tertiary">No liquidity data</span>
      </div>
    );
  }

  return (
    <div className="h-[160px] bg-bg-input rounded-xl p-2 relative">
      <div ref={barAreaCallbackRef} className="h-full relative">
        {/* Bar chart */}
        <div className="h-full flex items-end gap-px">
            {ticks.map((tick, i) => {
              const rawPct = maxLiquidity > 0 ? Math.sqrt(tick.liquidityUsd / maxLiquidity) * 100 : 0;
              const heightPct = Number.isFinite(rawPct) ? rawPct : 0;
              const midPrice = (tick.priceLower + tick.priceUpper) / 2;
              const isInRange = midPrice >= minPrice && midPrice <= maxPrice;
              const isCurrent = tick.isCurrentTick;

              return (
                <div key={i} className="flex-1 h-full flex items-end">
                  <div
                    className={`w-full rounded-t-sm transition-colors ${
                      isInRange
                        ? isCurrent
                          ? "bg-yellow-400"
                          : "bg-ice-400"
                        : "bg-white/15"
                    }`}
                    style={{ height: `${Math.max(2, heightPct)}%` }}
                  />
                </div>
              );
            })}
          </div>

          {/* Range overlay */}
          {showHandles && (
            <div
              className="absolute inset-y-0 z-10 bg-ice-400/10 pointer-events-none rounded-sm"
              style={{ left: `${minHandlePx}px`, width: `${maxHandlePx - minHandlePx}px` }}
            />
          )}

          {/* Current price vertical line */}
          {showHandles && (
            <div
              className="absolute inset-y-0 z-10 w-[1px] bg-yellow-400/50 pointer-events-none"
              style={{ left: `${currentPricePx}px` }}
            />
          )}

          {/* Drag handles */}
          {showHandles && (
            <>
              <DragHandle
                side="min"
                pxOffset={minHandlePx}
                pctDiff={minPctDiff}
                onPointerDown={(e) => handlePointerDown("min", e)}
              />
              <DragHandle
                side="max"
                pxOffset={maxHandlePx}
                pctDiff={maxPctDiff}
                onPointerDown={(e) => handlePointerDown("max", e)}
              />
            </>
          )}
        </div>

      {/* Price axis labels */}
      <div className="absolute bottom-1 left-2 right-2">
        <div className="flex justify-between text-[8px] text-text-tertiary">
          <span>{formatPriceCompact(ticks[0]?.priceLower ?? 0)}</span>
          <span className="text-yellow-400">{formatPriceCompact(currentPrice)}</span>
          <span>{formatPriceCompact(ticks[ticks.length - 1]?.priceUpper ?? 0)}</span>
        </div>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────
// DragHandle sub-component
// ────────────────────────────────────────────

function DragHandle({
  side,
  pxOffset,
  pctDiff,
  onPointerDown,
}: {
  side: "min" | "max";
  pxOffset: number;
  pctDiff: number;
  onPointerDown: (e: React.PointerEvent) => void;
}) {
  const pctText = pctDiff >= 0 ? `+${pctDiff.toFixed(1)}%` : `${pctDiff.toFixed(1)}%`;
  const pctColor = pctDiff >= 0 ? "text-green-400" : "text-red-400";

  return (
    <div className="absolute top-0 bottom-0 z-20" style={{ left: `${pxOffset}px` }}>
      {/* % deviation label */}
      <div
        className={`absolute -top-0.5 left-1/2 -translate-x-1/2 whitespace-nowrap text-[9px] font-medium ${pctColor}`}
      >
        {pctText}
      </div>

      {/* Hit area for easy grabbing */}
      <div
        className="absolute inset-y-0 w-6 -translate-x-1/2 cursor-ew-resize touch-none"
        data-handle={side}
        onPointerDown={onPointerDown}
      />

      {/* Visual line */}
      <div className="absolute top-2 bottom-2 w-[2px] -translate-x-1/2 bg-ice-400 pointer-events-none rounded-full" />

      {/* Grip indicator */}
      <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-[8px] h-[16px] bg-ice-400 rounded-sm pointer-events-none border border-ice-300/50" />
    </div>
  );
}

// ────────────────────────────────────────────
// Price <-> Pixel helpers (tick-index coordinate system)
// ────────────────────────────────────────────

function priceToPx(price: number, ticks: TickRange[], barAreaWidth: number): number {
  const N = ticks.length;
  if (N === 0) return 0;
  if (price <= ticks[0].priceLower) return 0;
  if (price >= ticks[N - 1].priceUpper) return barAreaWidth;
  for (let i = 0; i < N; i++) {
    if (price <= ticks[i].priceUpper) {
      const range = ticks[i].priceUpper - ticks[i].priceLower;
      const t = range > 0 ? (price - ticks[i].priceLower) / range : 0;
      return ((i + t) / N) * barAreaWidth;
    }
  }
  return barAreaWidth;
}

function pxToPrice(px: number, ticks: TickRange[], barAreaWidth: number): number {
  const N = ticks.length;
  if (N === 0 || barAreaWidth === 0) return 0;
  const fractionalIndex = Math.max(0, Math.min(N, (px / barAreaWidth) * N));
  const i = Math.min(Math.floor(fractionalIndex), N - 1);
  const frac = fractionalIndex - i;
  return ticks[i].priceLower + frac * (ticks[i].priceUpper - ticks[i].priceLower);
}
