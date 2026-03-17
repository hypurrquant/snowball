"use client";

import { useForwardVault } from "../hooks/useForwardVault";
import { formatUSDC } from "../lib/forwardMath";

export function ForwardOverview() {
  const { balance, isLoading } = useForwardVault();

  if (isLoading) {
    return (
      <div className="grid grid-cols-3 gap-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="bg-slate-800/60 rounded-xl p-4 animate-pulse h-20" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-3 gap-4">
      <Stat label="Free Balance" value={balance ? `$${formatUSDC(balance.free)}` : "—"} />
      <Stat label="Locked Balance" value={balance ? `$${formatUSDC(balance.locked)}` : "—"} />
      <Stat
        label="Total Balance"
        value={balance ? `$${formatUSDC(balance.free + balance.locked)}` : "—"}
      />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-4">
      <p className="text-xs text-slate-400">{label}</p>
      <p className="text-lg font-semibold mt-1 text-white">{value}</p>
    </div>
  );
}
