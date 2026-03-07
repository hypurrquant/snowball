"use client";

/** Gradient gauge slider for interest rate */
export function InterestRateSlider({ value, onChange, avgRate }: { value: number; onChange: (v: number) => void; avgRate?: number | null }) {
  // thumb is 20px wide, so we need to offset the gauge to align with thumb center
  const THUMB = 20; // px, matches w-5
  const toPct = (v: number) => ((v - 0.5) / (25 - 0.5)) * 100;
  const pct = toPct(value);
  const avgPct = avgRate != null ? toPct(avgRate) : null;
  return (
    <div className="space-y-1">
      <div className="relative h-8 flex items-center">
        {/* Track background (unfilled portion) */}
        <div className="absolute inset-x-0 h-2.5 rounded-full bg-bg-input/50" />
        {/* Filled gradient gauge — offset by half-thumb so it aligns with thumb center */}
        <div
          className="absolute h-2.5 rounded-full"
          style={{
            left: 0,
            width: `calc(${pct}% + ${THUMB / 2 - (pct / 100) * THUMB}px)`,
            background: "linear-gradient(to right, #ef4444, #f59e0b 40%, #4ade80 80%, #22c55e)",
          }}
        />
        {/* Avg marker line on the track */}
        {avgPct !== null && (
          <div
            className="absolute top-1/2 -translate-y-1/2 w-0.5 h-5 bg-white/50 rounded-full pointer-events-none z-[5]"
            style={{ left: `calc(${avgPct}% + ${THUMB / 2 - (avgPct / 100) * THUMB}px)` }}
          />
        )}
        {/* Native range input (invisible but interactive) */}
        <input
          type="range"
          min={0.5}
          max={25}
          step={0.1}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="relative z-10 w-full h-2.5 appearance-none bg-transparent cursor-pointer
            [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white/90 [&::-webkit-slider-thumb]:bg-[#1a1b2e] [&::-webkit-slider-thumb]:shadow-lg [&::-webkit-slider-thumb]:cursor-grab [&::-webkit-slider-thumb]:active:cursor-grabbing
            [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-white/90 [&::-moz-range-thumb]:bg-[#1a1b2e] [&::-moz-range-thumb]:shadow-lg [&::-moz-range-thumb]:cursor-grab
            [&::-moz-range-track]:bg-transparent"
        />
      </div>
      {/* Avg label below, aligned to the marker */}
      {avgPct !== null && avgRate != null && (
        <div className="relative h-3">
          <span
            className="absolute text-[10px] text-white/50 whitespace-nowrap pointer-events-none"
            style={{
              left: `calc(${avgPct}% + ${THUMB / 2 - (avgPct / 100) * THUMB}px)`,
              transform: "translateX(-50%)",
            }}
          >
            Avg {avgRate.toFixed(1)}%
          </span>
        </div>
      )}
    </div>
  );
}
