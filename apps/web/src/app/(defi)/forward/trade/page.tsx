"use client";

import { FORWARD } from "@snowball/core/src/config/addresses";

export default function ForwardTradePage() {
  const markets = FORWARD.markets;

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-white">Forward Markets</h2>

      <div className="space-y-3">
        {markets.map((market) => (
          <div
            key={market.name}
            className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-6 flex items-center justify-between"
          >
            <div>
              <p className="text-white font-medium text-lg">{market.pair}</p>
              <p className="text-xs text-slate-400 mt-1 font-mono">{market.id.slice(0, 18)}...</p>
            </div>
            <div className="flex gap-2">
              <button
                disabled
                className="px-4 py-2 rounded-lg bg-emerald-600/20 text-emerald-400 text-sm font-medium border border-emerald-600/30 opacity-50 cursor-not-allowed"
              >
                Long
              </button>
              <button
                disabled
                className="px-4 py-2 rounded-lg bg-red-600/20 text-red-400 text-sm font-medium border border-red-600/30 opacity-50 cursor-not-allowed"
              >
                Short
              </button>
            </div>
          </div>
        ))}
      </div>

      <p className="text-xs text-slate-500 text-center">
        ForwardX 미배포 — 배포 후 거래가 활성화됩니다
      </p>
    </div>
  );
}
