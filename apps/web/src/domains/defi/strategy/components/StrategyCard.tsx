"use client";

import { ArrowRight, Landmark, Zap, Vault, Coins, GitBranch } from "lucide-react";
import { Card, CardContent } from "@/shared/components/ui/card";
import { Badge } from "@/shared/components/ui/badge";
import type { YieldPath, RiskLevel } from "../types";

// ── Protocol badge ────────────────────────────────────────────────────────────

function ProtocolBadge({ protocol }: { protocol: string }) {
  const p = protocol.toLowerCase();
  if (p.includes("morpho")) {
    return (
      <Badge className="bg-ice-400/15 text-ice-400 border-ice-400/30 text-xs font-medium">
        <Landmark className="w-3 h-3 mr-1" />
        Morpho
      </Badge>
    );
  }
  if (p.includes("aave")) {
    return (
      <Badge className="bg-purple-500/15 text-purple-400 border-purple-500/30 text-xs font-medium">
        <Zap className="w-3 h-3 mr-1" />
        Aave
      </Badge>
    );
  }
  if (p.includes("liquity") || p.includes("cdp")) {
    return (
      <Badge className="bg-blue-500/15 text-blue-400 border-blue-500/30 text-xs font-medium">
        <Coins className="w-3 h-3 mr-1" />
        Liquity
      </Badge>
    );
  }
  if (p.includes("yield")) {
    return (
      <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30 text-xs font-medium">
        <Vault className="w-3 h-3 mr-1" />
        Yield
      </Badge>
    );
  }
  return (
    <Badge className="bg-ice-400/15 text-ice-400 border-ice-400/30 text-xs font-medium">
      <GitBranch className="w-3 h-3 mr-1" />
      {protocol}
    </Badge>
  );
}

// ── Risk badge ────────────────────────────────────────────────────────────────

function RiskBadge({ risk }: { risk: RiskLevel }) {
  if (risk === "low") {
    return <Badge variant="success">Low Risk</Badge>;
  }
  if (risk === "medium") {
    return <Badge variant="warning">Medium Risk</Badge>;
  }
  return <Badge variant="destructive">High Risk</Badge>;
}

// ── Step visualization ────────────────────────────────────────────────────────

function StepChain({ steps }: { steps: { action: string; protocol: string; inputToken: string; outputToken?: string }[] }) {
  if (steps.length === 0) return null;

  // Build unique nodes: token → protocol → token
  const nodes: string[] = [];
  for (const step of steps) {
    if (nodes.length === 0) nodes.push(step.inputToken);
    // Add protocol action
    nodes.push(`${step.protocol} (${step.action})`);
    // Add output token if it differs from the next step's input or last step
    if (step.outputToken && step.outputToken !== step.inputToken) {
      nodes.push(step.outputToken);
    }
  }

  return (
    <div className="flex items-center flex-wrap gap-1 text-xs text-text-secondary">
      {nodes.map((node, i) => (
        <span key={i} className="flex items-center gap-1">
          {i > 0 && <ArrowRight className="w-3 h-3 text-text-secondary/50 shrink-0" />}
          <span className={node.includes("(") ? "text-text-secondary" : "text-text-primary font-medium"}>
            {node}
          </span>
        </span>
      ))}
    </div>
  );
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

export function StrategyCardSkeleton() {
  return (
    <div className="bg-bg-card/60 border border-border rounded-2xl p-5 animate-pulse space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-5 w-28 bg-bg-input rounded" />
          <div className="h-5 w-16 bg-bg-input rounded-lg" />
        </div>
        <div className="h-7 w-16 bg-bg-input rounded" />
      </div>
      <div className="flex gap-2">
        <div className="h-5 w-20 bg-bg-input rounded-lg" />
        <div className="h-5 w-16 bg-bg-input rounded-lg" />
      </div>
      <div className="h-4 w-48 bg-bg-input rounded" />
      <div className="h-9 w-28 bg-bg-input rounded-xl ml-auto" />
    </div>
  );
}

// ── Main card ─────────────────────────────────────────────────────────────────

interface StrategyCardProps {
  path: YieldPath;
  rank: number;
  onExecute: (path: YieldPath) => void;
}

export function StrategyCard({ path, rank, onExecute }: StrategyCardProps) {
  const isTop = rank === 1;

  return (
    <Card
      className={[
        "bg-bg-card/60 border transition-all duration-200",
        isTop
          ? "border-ice-400/40 shadow-[0_0_12px_0_rgba(var(--color-ice-400)/0.08)]"
          : "border-border hover:border-ice-400/20",
      ].join(" ")}
    >
      <CardContent className="p-5 space-y-3">
        {/* Header row: name + APY */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap min-w-0">
            {isTop && (
              <span className="text-xs font-bold text-ice-400 shrink-0">★ #1</span>
            )}
            {!isTop && (
              <span className="text-xs text-text-secondary shrink-0">#{rank}</span>
            )}
            <span className="font-semibold text-white truncate">{path.name}</span>
            <ProtocolBadge protocol={path.protocol} />
            {path.isMultiHop && (
              <Badge className="bg-orange-500/15 text-orange-400 border-orange-500/30 text-xs">
                Multi-hop
              </Badge>
            )}
          </div>

          {/* APY */}
          <div className="text-right shrink-0">
            <div className="text-xs text-text-secondary mb-0.5">Est. APY</div>
            {path.estimatedAPY !== null ? (
              <div className="text-success font-mono font-bold text-xl leading-none">
                {path.apyLabel}
              </div>
            ) : (
              <Badge variant="secondary" className="text-sm font-medium">
                Variable
              </Badge>
            )}
          </div>
        </div>

        {/* Badges row: risk + step count */}
        <div className="flex items-center gap-2 flex-wrap">
          <RiskBadge risk={path.riskLevel} />
          <Badge variant="outline">{path.stepCount} step{path.stepCount !== 1 ? "s" : ""}</Badge>
        </div>

        {/* Step visualization */}
        <StepChain steps={path.steps} />

        {/* Description */}
        <p className="text-xs text-text-secondary">{path.description}</p>

        {/* Execute button */}
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => onExecute(path)}
            className="flex items-center gap-1.5 bg-ice-400 hover:bg-ice-500 text-white text-sm font-medium px-4 py-2 rounded-xl transition-colors"
          >
            Execute
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </CardContent>
    </Card>
  );
}
