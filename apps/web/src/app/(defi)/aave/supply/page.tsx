"use client";

import { useAaveMarkets } from "@/domains/defi/aave/hooks/useAaveMarkets";

export default function AaveSupplyPage() {
  const { markets, isLoading } = useAaveMarkets();

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-white">Supply Markets</h2>

      {isLoading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-slate-800/60 rounded-xl p-4 animate-pulse h-16" />
          ))}
        </div>
      ) : markets.length === 0 ? (
        <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-8 text-center">
          <p className="text-slate-400">Aave V3 미배포 — 배포 후 마켓이 표시됩니다</p>
        </div>
      ) : (
        <div className="space-y-3">
          {markets.filter((m) => m.isActive).map((market) => (
            <div
              key={market.symbol}
              className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-4 flex items-center justify-between"
            >
              <div>
                <p className="text-white font-medium">{market.symbol}</p>
                <p className="text-xs text-slate-400">LTV {market.ltv}%</p>
              </div>
              <div className="text-right">
                <p className="text-green-400 font-medium">{market.supplyAPY.toFixed(2)}% APY</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
