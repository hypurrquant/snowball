"use client";

import Link from "next/link";
import Image from "next/image";
import { Card, CardContent } from "@/shared/components/ui/card";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Settings2 } from "lucide-react";
import { TOKEN_INFO } from "@/core/config/addresses";
import type { UserPosition } from "@/domains/trade/hooks/useUserPositions";
import { formatUsdCompact } from "@/shared/lib/utils";

function feeTierLabel(fee: number): string {
  return `${(fee / 10_000).toFixed(fee % 10_000 === 0 ? 1 : 2)}%`;
}

function tokenIcon(symbol: string): string {
  return `/tokens/${symbol}.svg`;
}

/** Range bar: shows currentTick position relative to [tickLower, tickUpper] */
function RangeBar({
  tickLower,
  tickUpper,
  currentTick,
  isInRange,
}: {
  tickLower: number;
  tickUpper: number;
  currentTick: number;
  isInRange: boolean;
}) {
  const range = tickUpper - tickLower;
  // Clamp position to 0–100% with some padding for out-of-range visibility
  const rawPct = range > 0 ? ((currentTick - tickLower) / range) * 100 : 50;
  const pct = Math.max(0, Math.min(100, rawPct));

  const dotColor = isInRange ? "bg-success" : "bg-danger";
  const glowColor = isInRange
    ? "shadow-[0_0_6px_rgba(34,197,94,0.6)]"
    : "shadow-[0_0_6px_rgba(239,68,68,0.6)]";

  // Show a wider view: pad 20% of range on each side so the ice bar is centered
  const pad = range * 0.2;
  const viewLower = tickLower - pad;
  const viewRange = range + pad * 2;
  const toViewPct = (tick: number) =>
    viewRange > 0 ? Math.max(0, Math.min(100, ((tick - viewLower) / viewRange) * 100)) : 50;

  const rangeLPct = toViewPct(tickLower);
  const rangeRPct = toViewPct(tickUpper);
  const tickPct = toViewPct(currentTick);

  return (
    <div className="relative w-full h-1.5 rounded-full bg-white/10">
      {/* Ice-colored range bar (tickLower → tickUpper) */}
      <div
        className="absolute inset-y-0 rounded-full bg-ice-400/40"
        style={{ left: `${rangeLPct}%`, width: `${rangeRPct - rangeLPct}%` }}
      />
      {/* Current tick dot */}
      <div
        className={`absolute top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full ${dotColor} ${glowColor}`}
        style={{ left: `${tickPct}%`, marginLeft: "-5px" }}
      />
    </div>
  );
}

export function PositionCard({ position }: { position: UserPosition }) {
  const {
    token0,
    token1,
    token0Symbol,
    token1Symbol,
    fee,
    isInRange,
    currentTick,
    tickLower,
    tickUpper,
    valueUsd,
    feesUsd,
    tokensOwed0,
    tokensOwed1,
  } = position;

  const info0 = TOKEN_INFO[token0.toLowerCase()] ?? TOKEN_INFO[token0];
  const info1 = TOKEN_INFO[token1.toLowerCase()] ?? TOKEN_INFO[token1];
  const decimals0 = info0?.decimals ?? 18;
  const decimals1 = info1?.decimals ?? 18;
  const owed0 = Number(tokensOwed0) / 10 ** decimals0;
  const owed1 = Number(tokensOwed1) / 10 ** decimals1;

  return (
    <Card
      className={`bg-bg-card/60 backdrop-blur-xl border transition-all duration-300 ${
        isInRange
          ? "border-border hover:border-ice-400/30"
          : "border-danger/30 hover:border-danger/50"
      }`}
    >
      <CardContent className="p-4 space-y-3">
        {/* Header: pair + fee + range badge */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex -space-x-1.5">
              <Image
                src={tokenIcon(token0Symbol)}
                alt={token0Symbol}
                width={22}
                height={22}
                className="rounded-full ring-2 ring-bg-primary z-10 bg-bg-card"
              />
              <Image
                src={tokenIcon(token1Symbol)}
                alt={token1Symbol}
                width={22}
                height={22}
                className="rounded-full ring-2 ring-bg-primary bg-bg-card"
              />
            </div>
            <span className="font-semibold text-sm text-white">
              {token0Symbol}/{token1Symbol}
            </span>
            <Badge
              variant="secondary"
              className="bg-bg-input text-text-secondary text-[10px] px-1.5 py-0"
            >
              {feeTierLabel(fee)}
            </Badge>
          </div>
          <Badge
            className={`text-[10px] px-1.5 py-0 ${
              isInRange
                ? "bg-success/10 text-success border-success/30"
                : "bg-danger/10 text-danger border-danger/30"
            }`}
          >
            {isInRange ? "In Range" : "Out of Range"}
          </Badge>
        </div>

        {/* Value + Fees row */}
        <div className="flex items-baseline justify-between">
          <div>
            <span className="text-[10px] text-text-tertiary">Size</span>
            <div className="text-base font-mono font-semibold text-white">
              {formatUsdCompact(valueUsd)}
            </div>
          </div>
          <div className="text-right">
            <span className="text-[10px] text-text-tertiary">Fees</span>
            <div className="text-sm font-mono font-semibold text-success">
              {formatUsdCompact(feesUsd)}
            </div>
          </div>
        </div>

        {/* Range bar */}
        <RangeBar
          tickLower={tickLower}
          tickUpper={tickUpper}
          currentTick={currentTick}
          isInRange={isInRange}
        />

        {/* Manage button */}
        <div className="flex justify-end pt-0.5">
          <Button variant="secondary" size="sm" className="h-7 text-xs" asChild>
            <Link
              href={`/pool/${token0.toLowerCase()}-${token1.toLowerCase()}`}
            >
              <Settings2 className="w-3.5 h-3.5 mr-1" />
              Manage
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
