import Link from "next/link";
import { Bot } from "lucide-react";

export function AgentSaasBanner() {
  return (
    <div className="bg-gradient-to-r from-ice-400/10 to-violet-500/10 border border-ice-400/20 rounded-xl p-4">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-ice-400/20 to-blue-500/20 flex items-center justify-center shrink-0">
            <Bot className="w-4 h-4 text-ice-400" />
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-white text-sm">
              AI Agent — Automate Your DeFi
            </p>
            <p className="text-xs text-text-secondary truncate">
              Let AI optimize your portfolio 24/7. From 0 sbUSD/month.
            </p>
          </div>
        </div>
        <Link
          href="/agent/saas"
          className="shrink-0 px-3 py-1.5 rounded-lg bg-ice-400 text-white text-xs font-semibold hover:bg-ice-500 transition-colors whitespace-nowrap"
        >
          Learn More →
        </Link>
      </div>
    </div>
  );
}
