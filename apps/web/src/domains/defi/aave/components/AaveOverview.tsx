"use client";

import { useAavePosition } from "../hooks/useAavePosition";

export function AaveOverview() {
  const { position, isLoading } = useAavePosition();

  if (isLoading) {
    return (
      <div className="grid grid-cols-3 gap-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="bg-slate-800/60 rounded-xl p-4 animate-pulse h-20" />
        ))}
      </div>
    );
  }

  if (!position) {
    return (
      <div className="grid grid-cols-3 gap-4">
        <Stat label="Total Collateral" value="—" />
        <Stat label="Total Debt" value="—" />
        <Stat label="Health Factor" value="—" />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-3 gap-4">
      <Stat label="Total Collateral" value={`$${formatBase(position.totalCollateralBase)}`} />
      <Stat label="Total Debt" value={`$${formatBase(position.totalDebtBase)}`} />
      <Stat
        label="Health Factor"
        value={position.healthFactor === Infinity ? "∞" : position.healthFactor.toFixed(2)}
        className={position.healthFactor < 1.2 ? "text-red-400" : "text-green-400"}
      />
    </div>
  );
}

function Stat({ label, value, className }: { label: string; value: string; className?: string }) {
  return (
    <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-4">
      <p className="text-xs text-slate-400">{label}</p>
      <p className={`text-lg font-semibold mt-1 ${className ?? "text-white"}`}>{value}</p>
    </div>
  );
}

function formatBase(value: bigint): string {
  // Aave base currency unit is typically 1e8 (USD)
  return (Number(value) / 1e8).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
