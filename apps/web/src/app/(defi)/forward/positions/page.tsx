"use client";

export default function ForwardPositionsPage() {
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-white">My Positions</h2>

      <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-8 text-center">
        <p className="text-slate-400">포지션이 없습니다</p>
        <p className="text-xs text-slate-500 mt-2">Forward 거래를 시작하면 여기에 표시됩니다</p>
      </div>
    </div>
  );
}
