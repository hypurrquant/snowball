"use client";

import Link from "next/link";
import { TrendingUp, Zap, ExternalLink } from "lucide-react";
import { useUnifiedSupplyMarkets } from "@/domains/defi/unified/hooks/useUnifiedSupplyMarkets";

// ─── Competitor data (hardcoded realistic values; production: defi-cli) ───

interface CompetitorRate {
  protocol: string;
  chain: string;
  apy: number;
}

interface AssetComparison {
  label: string;
  /** Match against assetSymbol from useUnifiedSupplyMarkets (substring, case-insensitive) */
  symbolMatch: string;
  competitors: CompetitorRate[];
}

const COMPARISONS: AssetComparison[] = [
  {
    label: "USDC Supply APY",
    symbolMatch: "usdc",
    competitors: [
      { protocol: "Aave v3", chain: "Ethereum", apy: 3.1 },
      { protocol: "Compound", chain: "Ethereum", apy: 2.8 },
      { protocol: "Morpho", chain: "Base", apy: 4.5 },
    ],
  },
  {
    label: "wCTC / ETH Supply APY",
    symbolMatch: "wctc",
    competitors: [
      { protocol: "Aave v3", chain: "Ethereum", apy: 2.1 },
      { protocol: "Lido", chain: "Ethereum", apy: 3.2 },
    ],
  },
];

// ─── Sub-components ───

interface TableRowProps {
  protocol: string;
  chain: string;
  apy: number;
  isSnowball?: boolean;
}

function TableRow({ protocol, chain, apy, isSnowball = false }: TableRowProps) {
  return (
    <tr
      className={
        isSnowball
          ? "bg-ice-400/10 border-b border-ice-400/20"
          : "border-b border-border/40 even:bg-bg-card/20"
      }
    >
      <td className="px-3 py-2.5 text-sm font-medium whitespace-nowrap">
        {isSnowball ? (
          <span className="flex items-center gap-1.5 text-ice-400 font-semibold">
            <Zap className="w-3.5 h-3.5 shrink-0" />
            {protocol}
          </span>
        ) : (
          <span className="text-text-primary">{protocol}</span>
        )}
      </td>
      <td className="px-3 py-2.5 text-sm text-text-secondary whitespace-nowrap">
        {chain}
      </td>
      <td className="px-3 py-2.5 text-right whitespace-nowrap">
        <span
          className={
            isSnowball
              ? "font-mono font-bold text-ice-400"
              : "font-mono text-sm text-text-primary"
          }
        >
          {apy.toFixed(1)}%
        </span>
        {isSnowball && (
          <span className="ml-2 text-xs text-ice-400/70 font-medium">
            ← you
          </span>
        )}
      </td>
    </tr>
  );
}

interface ComparisonTableProps {
  label: string;
  symbolMatch: string;
  competitors: CompetitorRate[];
  supplyMarkets: Array<{ assetSymbol: string; supplyAPY: number; isActive: boolean }>;
  isLoading: boolean;
}

function ComparisonTable({
  label,
  symbolMatch,
  competitors,
  supplyMarkets,
  isLoading,
}: ComparisonTableProps) {
  const snowballMarket = supplyMarkets
    .filter((m) => m.isActive)
    .find((m) => m.assetSymbol.toLowerCase().includes(symbolMatch));

  const snowballAPY = snowballMarket?.supplyAPY ?? null;

  // Build all rows: Snowball first if found, then competitors sorted desc
  const allRows: Array<{ protocol: string; chain: string; apy: number; isSnowball: boolean }> = [];

  if (snowballAPY !== null) {
    allRows.push({ protocol: "Snowball", chain: "GIWA", apy: snowballAPY, isSnowball: true });
  }

  const sortedCompetitors = [...competitors].sort((a, b) => b.apy - a.apy);
  for (const c of sortedCompetitors) {
    allRows.push({ ...c, isSnowball: false });
  }

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold text-text-primary">{label}</h3>
      <div className="overflow-hidden rounded-xl border border-border/60 bg-bg-card/40">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border/60 bg-bg-card/60">
              <th className="px-3 py-2 text-left text-xs font-medium text-text-tertiary uppercase tracking-wide">
                Protocol
              </th>
              <th className="px-3 py-2 text-left text-xs font-medium text-text-tertiary uppercase tracking-wide">
                Chain
              </th>
              <th className="px-3 py-2 text-right text-xs font-medium text-text-tertiary uppercase tracking-wide">
                APY
              </th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={3} className="px-3 py-4 text-center">
                  <div className="flex items-center justify-center gap-2 text-xs text-text-tertiary">
                    <div className="w-3 h-3 rounded-full border border-ice-400/40 border-t-ice-400 animate-spin" />
                    Loading Snowball rate...
                  </div>
                </td>
              </tr>
            ) : (
              allRows.map((row, i) => (
                <TableRow
                  key={i}
                  protocol={row.protocol}
                  chain={row.chain}
                  apy={row.apy}
                  isSnowball={row.isSnowball}
                />
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Main component ───

export function YieldComparison() {
  const { markets, isLoading } = useUnifiedSupplyMarkets();

  return (
    <div className="w-full max-w-2xl">
      {/* Section header */}
      <div className="mb-5 px-1">
        <div className="flex items-center gap-2 mb-1">
          <TrendingUp className="w-4 h-4 text-ice-400" />
          <h2 className="text-sm font-medium text-text-tertiary uppercase tracking-wider">
            Why Snowball?
          </h2>
        </div>
        <p className="text-xs text-text-tertiary pl-6">
          How our rates compare to other chains
        </p>
      </div>

      {/* Comparison tables */}
      <div className="rounded-2xl bg-bg-card/60 backdrop-blur-xl border border-border p-5 space-y-5">
        {COMPARISONS.map((c) => (
          <ComparisonTable
            key={c.symbolMatch}
            label={c.label}
            symbolMatch={c.symbolMatch}
            competitors={c.competitors}
            supplyMarkets={markets}
            isLoading={isLoading}
          />
        ))}

        {/* Footer CTA */}
        <div className="pt-1 border-t border-border/40">
          <Link
            href="/chat"
            className="flex items-center justify-between px-4 py-2.5 rounded-xl bg-bg-input/60 hover:bg-ice-400/10 hover:border-ice-400/30 border border-transparent transition-all duration-200 group"
          >
            <span className="text-sm text-text-secondary group-hover:text-white transition-colors">
              Open DeFi Terminal for full cross-chain scan
            </span>
            <ExternalLink className="w-4 h-4 text-text-tertiary group-hover:text-ice-400 transition-colors shrink-0 ml-2" />
          </Link>
        </div>
      </div>
    </div>
  );
}
