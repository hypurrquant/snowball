"use client";

import { useState } from "react";
import Link from "next/link";
import { useAccount } from "wagmi";
import { useYieldVaults } from "@/domains/defi/yield/hooks/useYieldVaults";
import { useMorphoPosition } from "@/domains/defi/morpho/hooks/useMorphoPosition";
import { useTroves } from "@/domains/defi/liquity/hooks/useTroves";
import { useUserPositions } from "@/domains/trade/hooks/useUserPositions";
import { LEND } from "@/core/config/addresses";
import { Card, CardHeader, CardTitle, CardContent } from "@/shared/components/ui/card";
import { LogOut, AlertTriangle, CheckSquare, Square, ExternalLink } from "lucide-react";
import { formatTokenAmount } from "@/shared/lib/utils";
import type { Address } from "viem";

// ─── Types ───

interface Position {
  id: string;
  label: string;
  detail: string;
  type: "morpho" | "staked-lp" | "vault" | "cdp";
  exitHref: string;
  exitLabel: string;
  hasCDPWarning?: boolean;
}

// ─── Exit step list ───

const EXIT_STEPS: Array<{ label: string; href: string }> = [
  { label: "Withdraw from Yield Vaults", href: "/yield" },
  { label: "Withdraw from Morpho Supply", href: "/morpho/supply" },
  { label: "Unstake LP positions", href: "/stake/my-stakes" },
  { label: "Close CDP Troves (manual)", href: "/liquity/borrow" },
];

// ─── Inner component (needs address) ───

function QuickExitInner({ address }: { address: Address }) {
  // Morpho positions
  const market0 = LEND.markets[0];
  const market1 = LEND.markets[1];
  const market2 = LEND.markets[2];

  const { position: pos0, isLoading: l0 } = useMorphoPosition(market0.id, address);
  const { position: pos1, isLoading: l1 } = useMorphoPosition(market1.id, address);
  const { position: pos2, isLoading: l2 } = useMorphoPosition(market2.id, address);

  // LP positions
  const { positionCount, isLoading: lpLoading } = useUserPositions(address);

  // Yield vaults
  const { vaults, isLoading: vaultsLoading } = useYieldVaults();

  // CDPs
  const { troves: wCTCTroves, isLoading: trovesLoading } = useTroves("wCTC", address);
  const { troves: lstCTCTroves, isLoading: lstCTCTrovesLoading } = useTroves("lstCTC", address);

  const isLoading = l0 || l1 || l2 || lpLoading || vaultsLoading || trovesLoading || lstCTCTrovesLoading;

  // Build active positions list
  const positions: Position[] = [];

  // Morpho supply positions
  const morphoPositions = [
    { pos: pos0, market: market0, label: "Morpho Supply" },
    { pos: pos1, market: market1, label: "Morpho Supply" },
    { pos: pos2, market: market2, label: "Morpho Supply" },
  ];
  morphoPositions.forEach(({ pos, label }, i) => {
    if (pos && pos.supplyAssets > 0n) {
      positions.push({
        id: `morpho-${i}`,
        label,
        detail: `${formatTokenAmount(pos.supplyAssets, 18, 2)} sbUSD`,
        type: "morpho",
        exitHref: "/morpho/supply",
        exitLabel: "Withdraw",
      });
    }
  });

  // LP positions
  if (positionCount > 0) {
    positions.push({
      id: "staked-lp",
      label: "LP Positions",
      detail: `${positionCount} position${positionCount !== 1 ? "s" : ""}`,
      type: "staked-lp",
      exitHref: "/stake/my-stakes",
      exitLabel: "Unstake",
    });
  }

  // Yield vault positions
  const activeVaults = vaults.filter(
    (v) => v.userShares !== undefined && v.userShares > 0n,
  );
  activeVaults.forEach((v) => {
    const assets =
      v.userShares && v.pricePerShare
        ? (v.userShares * v.pricePerShare) / 10n ** 18n
        : 0n;
    positions.push({
      id: `vault-${v.address}`,
      label: `Yield Vault (${v.name})`,
      detail: `${formatTokenAmount(assets, 18, 2)} ${v.wantSymbol}`,
      type: "vault",
      exitHref: "/yield",
      exitLabel: "Withdraw",
    });
  });

  // CDP troves
  const allTroves = [...wCTCTroves, ...lstCTCTroves];
  if (allTroves.length > 0) {
    positions.push({
      id: "cdp",
      label: "CDP Troves",
      detail: `${allTroves.length} trove${allTroves.length !== 1 ? "s" : ""} open`,
      type: "cdp",
      exitHref: "/liquity/borrow",
      exitLabel: "Manage",
      hasCDPWarning: true,
    });
  }

  // Checkbox state — all checked by default, CDPs unchecked by default
  const [checked, setChecked] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    positions.forEach((p) => {
      initial[p.id] = p.type !== "cdp";
    });
    return initial;
  });

  // Keep checked state in sync when positions load (initialize new ones)
  const toggle = (id: string) =>
    setChecked((prev) => ({ ...prev, [id]: !prev[id] }));

  const selectedPositions = positions.filter((p) => checked[p.id] ?? (p.type !== "cdp"));
  const selectedCount = selectedPositions.length;

  // Deduplicate exit steps relevant to selection
  const relevantSteps = EXIT_STEPS.filter((step) => {
    if (step.href === "/yield") return selectedPositions.some((p) => p.type === "vault");
    if (step.href === "/morpho/supply") return selectedPositions.some((p) => p.type === "morpho");
    if (step.href === "/stake/my-stakes") return selectedPositions.some((p) => p.type === "staked-lp");
    if (step.href === "/liquity/borrow") return selectedPositions.some((p) => p.type === "cdp");
    return false;
  });

  const hasCDPSelected = selectedPositions.some((p) => p.type === "cdp");

  if (isLoading) {
    return (
      <Card className="bg-bg-card/60 backdrop-blur-xl border-white/5">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-text-secondary flex items-center gap-2">
            <LogOut className="w-4 h-4 text-rose-400" />
            Quick Exit
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-8 rounded bg-bg-hover animate-pulse" />
          ))}
        </CardContent>
      </Card>
    );
  }

  if (positions.length === 0) {
    return (
      <Card className="bg-bg-card/60 backdrop-blur-xl border-white/5">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-text-secondary flex items-center gap-2">
            <LogOut className="w-4 h-4 text-rose-400" />
            Quick Exit
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-text-tertiary">No active positions to exit</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-bg-card/60 backdrop-blur-xl border-white/5">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium text-text-secondary flex items-center gap-2">
          <LogOut className="w-4 h-4 text-rose-400" />
          Quick Exit
        </CardTitle>
        <p className="text-xs text-text-tertiary">Select positions to exit</p>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Position checkboxes */}
        <div className="space-y-2">
          {positions.map((p) => {
            const isChecked = checked[p.id] ?? (p.type !== "cdp");
            return (
              <button
                key={p.id}
                onClick={() => toggle(p.id)}
                className="w-full flex items-center gap-3 p-2.5 rounded-lg hover:bg-bg-hover/50 transition-colors text-left"
              >
                <div className="shrink-0 text-text-secondary">
                  {isChecked ? (
                    <CheckSquare className="w-4 h-4 text-ice-400" />
                  ) : (
                    <Square className="w-4 h-4" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-sm text-white">{p.label}</span>
                  <span className="text-xs text-text-tertiary ml-2">{p.detail}</span>
                </div>
                {p.hasCDPWarning && (
                  <span className="text-xs text-amber-400 shrink-0">manual</span>
                )}
              </button>
            );
          })}
        </div>

        {/* CDP Warning */}
        {hasCDPSelected && (
          <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-400/10 border border-amber-400/20">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-300">
              CDPs require manual closure to avoid liquidation. Repay all debt before closing.
            </p>
          </div>
        )}

        {/* Exit steps */}
        {selectedCount > 0 && relevantSteps.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-xs text-text-tertiary font-medium">
              Exit steps ({relevantSteps.length}):
            </p>
            {relevantSteps.map((step, i) => (
              <Link
                key={step.href}
                href={step.href}
                className="flex items-center justify-between p-2.5 rounded-lg bg-bg-input/50 hover:bg-bg-hover transition-colors group"
              >
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-bg-card text-xs flex items-center justify-center text-text-tertiary font-medium">
                    {i + 1}
                  </span>
                  <span className="text-xs text-white">{step.label}</span>
                </div>
                <ExternalLink className="w-3 h-3 text-text-tertiary group-hover:text-ice-400 transition-colors" />
              </Link>
            ))}
          </div>
        )}

        {selectedCount === 0 && (
          <p className="text-xs text-text-tertiary text-center py-2">
            Select at least one position to see exit steps
          </p>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Main Export ───

export function QuickExit() {
  const { address, isConnected } = useAccount();

  if (!isConnected || !address) return null;

  return <QuickExitInner address={address} />;
}
