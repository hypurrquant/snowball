"use client";

interface Props {
  rate: number;       // % (e.g. 5.0)
  median: number | null; // % (e.g. 4.5)
  isUser?: boolean;
  className?: string;
}

const RANGE_MIN = 0.5;
const RANGE_MAX = 15;

function toPct(v: number) {
  return Math.max(0, Math.min(100, ((v - RANGE_MIN) / (RANGE_MAX - RANGE_MIN)) * 100));
}

export function MiniRateGauge({ rate, median, isUser, className }: Props) {
  const ratePct = toPct(rate);
  const medianPct = median != null ? toPct(median) : null;

  return (
    <div className={`relative h-1.5 w-full min-w-[60px] rounded-full bg-bg-card/60 overflow-visible ${className ?? ""}`}>
      {/* Gradient track */}
      <div
        className="absolute inset-0 rounded-full opacity-30"
        style={{
          background: "linear-gradient(to right, #ef4444, #f59e0b 40%, #4ade80 80%, #22c55e)",
        }}
      />
      {/* Median marker */}
      {medianPct != null && (
        <div
          className="absolute top-0 h-full w-px bg-white/40"
          style={{ left: `${medianPct}%` }}
        />
      )}
      {/* Rate dot */}
      <div
        className={`absolute top-1/2 rounded-full ${
          isUser
            ? "w-2.5 h-2.5 bg-ice-400 border border-white/80 shadow-sm shadow-ice-400/30"
            : "w-2 h-2 bg-white/60"
        }`}
        style={{
          left: `${ratePct}%`,
          transform: "translate(-50%, -50%)",
        }}
      />
    </div>
  );
}
