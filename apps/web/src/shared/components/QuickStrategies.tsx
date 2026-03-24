"use client";

import Link from "next/link";
import { Shield, TrendingUp, Zap, ArrowRight } from "lucide-react";

// ─── Strategy definitions ───

type RiskLevel = "Low" | "Medium" | "High";

interface Strategy {
  name: string;
  description: string;
  apy: string;
  steps: string[];
  href: string;
  risk: RiskLevel;
  icon: React.ElementType;
  color: "green" | "ice" | "yellow";
}

const STRATEGIES: Strategy[] = [
  {
    name: "Safe Yield",
    description: "Supply wCTC to Morpho for stable interest",
    apy: "~7%",
    steps: ["Approve wCTC", "Supply to Morpho"],
    href: "/earn/supply",
    risk: "Low",
    icon: Shield,
    color: "green",
  },
  {
    name: "sbUSD Farming",
    description: "Open CDP → mint sbUSD → LP sbUSD/USDC → Stake for emission",
    apy: "~25%",
    steps: ["Open CDP", "Add Liquidity", "Stake LP"],
    href: "/earn/strategy",
    risk: "Medium",
    icon: TrendingUp,
    color: "ice",
  },
  {
    name: "Leveraged Yield",
    description: "Supply → Borrow → Re-supply loop for amplified returns",
    apy: "~15%",
    steps: ["Supply collateral", "Borrow", "Re-supply"],
    href: "/earn/strategy",
    risk: "High",
    icon: Zap,
    color: "yellow",
  },
];

// ─── Color maps ───

const APY_COLOR: Record<Strategy["color"], string> = {
  green: "text-green-400",
  ice: "text-ice-400",
  yellow: "text-yellow-400",
};

const ICON_GRADIENT: Record<Strategy["color"], string> = {
  green: "from-green-500/20 to-emerald-500/20",
  ice: "from-ice-400/20 to-blue-500/20",
  yellow: "from-yellow-500/20 to-amber-500/20",
};

const BORDER_HOVER: Record<Strategy["color"], string> = {
  green: "hover:border-green-400/30",
  ice: "hover:border-ice-400/30",
  yellow: "hover:border-yellow-400/30",
};

const RISK_BADGE: Record<RiskLevel, string> = {
  Low: "bg-green-500/15 text-green-400 border border-green-500/20",
  Medium: "bg-yellow-500/15 text-yellow-400 border border-yellow-500/20",
  High: "bg-red-500/15 text-red-400 border border-red-500/20",
};

// ─── Component ───

export function QuickStrategies() {
  return (
    <div className="w-full max-w-2xl">
      <h2 className="text-sm font-medium text-text-tertiary uppercase tracking-wider mb-4 px-1">
        Quick Strategies
      </h2>

      {/* Mobile: horizontal scroll / Desktop: 3-col grid */}
      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide sm:pb-0 sm:grid sm:grid-cols-3">
        {STRATEGIES.map((strategy) => {
          const Icon = strategy.icon;
          return (
            <Link
              key={strategy.name}
              href={strategy.href}
              className="group shrink-0 w-[240px] sm:w-auto"
            >
              <div
                className={`flex flex-col gap-3 p-4 h-full rounded-xl bg-bg-card/60 backdrop-blur-xl border border-border ${BORDER_HOVER[strategy.color]} transition-all duration-200 group-hover:-translate-y-0.5`}
              >
                {/* Icon + risk badge row */}
                <div className="flex items-start justify-between">
                  <div
                    className={`w-10 h-10 rounded-lg bg-gradient-to-br ${ICON_GRADIENT[strategy.color]} flex items-center justify-center text-white shrink-0`}
                  >
                    <Icon className="w-5 h-5" />
                  </div>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${RISK_BADGE[strategy.risk]}`}>
                    {strategy.risk}
                  </span>
                </div>

                {/* Name + description */}
                <div className="flex-1">
                  <p className="font-semibold text-white text-sm mb-1">{strategy.name}</p>
                  <p className="text-xs text-text-secondary leading-relaxed">{strategy.description}</p>
                </div>

                {/* APY */}
                <div>
                  <p className="text-xs text-text-tertiary mb-0.5">Est. APY</p>
                  <p className={`text-2xl font-bold font-mono ${APY_COLOR[strategy.color]}`}>
                    {strategy.apy}
                  </p>
                </div>

                {/* Steps count */}
                <p className="text-xs text-text-tertiary">
                  {strategy.steps.length} steps
                </p>

                {/* CTA */}
                <div className="flex items-center gap-1 text-xs font-medium text-text-secondary group-hover:text-white transition-colors">
                  Start Strategy
                  <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
