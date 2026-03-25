"use client";

import { useState } from "react";
import { useAccount } from "wagmi";
import type { Address } from "viem";
import { AggregatorSwap } from "@/domains/trade/components/AggregatorSwap";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/shared/components/ui/card";
import { Badge } from "@/shared/components/ui/badge";
import { Skeleton } from "@/shared/components/ui/skeleton";
import {
  Gem,
  Landmark,
  ArrowDownUp,
  TrendingUp,
  ExternalLink,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { monadTestnet } from "@/core/config/chain";
import {
  MONAD_TOKENS,
  MONAD_UNISWAP,
  MONAD_MORPHO,
  MONAD_CURVE,
  KURU,
  CURVANCE,
  UPSHIFT,
} from "@/core/config/monad";
import { useNeverlandMarkets } from "@/domains/defi/neverland/hooks/useNeverlandMarkets";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function truncateAddr(addr: string) {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

function AddrRow({ label, addr }: { label: string; addr: string }) {
  return (
    <div className="flex items-center justify-between py-1">
      <span className="text-xs text-text-secondary">{label}</span>
      <span className="text-xs font-mono text-white/70">{truncateAddr(addr)}</span>
    </div>
  );
}

// ─── Tab types ────────────────────────────────────────────────────────────────

type Tab = "lending" | "dex" | "yield";

// ─── Lending tab ──────────────────────────────────────────────────────────────

function NeverlandMarketsTable() {
  const { markets, isLoading } = useNeverlandMarkets();

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-8 w-full rounded" />
        ))}
      </div>
    );
  }

  if (markets.length === 0) {
    return (
      <p className="text-xs text-text-secondary">
        No market data available. Switch to Monad to load live rates.
      </p>
    );
  }

  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-white/10">
          <th className="px-2 py-2 text-left text-xs text-text-secondary font-medium">
            Asset
          </th>
          <th className="px-2 py-2 text-right text-xs text-text-secondary font-medium">
            Supply APY
          </th>
          <th className="px-2 py-2 text-right text-xs text-text-secondary font-medium">
            Borrow APY
          </th>
        </tr>
      </thead>
      <tbody>
        {markets.map((m) => (
          <tr
            key={m.underlying}
            className="border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors"
          >
            <td className="px-2 py-2 font-medium text-white">{m.symbol}</td>
            <td className="px-2 py-2 text-right text-emerald-400">
              {m.supplyAPY.toFixed(2)}%
            </td>
            <td className="px-2 py-2 text-right text-amber-400">
              {m.borrowAPY.toFixed(2)}%
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function LendingTab() {
  return (
    <div className="space-y-4">
      {/* Morpho */}
      <Card className="bg-bg-card/60 backdrop-blur-xl border-white/5">
        <CardHeader>
          <CardTitle className="text-base text-white flex items-center gap-2">
            <Landmark className="w-4 h-4 text-purple-400" />
            Morpho
            <Badge variant="outline" className="ml-auto text-xs border-purple-400/30 text-purple-300">
              ~$90M TVL
            </Badge>
            <a
              href="https://app.morpho.org"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs text-text-secondary hover:text-purple-400 transition-colors"
            >
              <ExternalLink className="w-3 h-3" />
            </a>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-text-secondary mb-3">
            Permissionless isolated lending markets. Supply assets or open
            collateralized borrow positions against any ERC-20 pair.
          </p>
          <div className="divide-y divide-white/5">
            <AddrRow label="Morpho" addr={MONAD_MORPHO.morpho} />
            <AddrRow label="AdaptiveCurveIRM" addr={MONAD_MORPHO.adaptiveCurveIRM} />
            <AddrRow label="MetaMorphoFactory" addr={MONAD_MORPHO.metaMorphoFactory} />
          </div>
        </CardContent>
      </Card>

      {/* Neverland */}
      <Card className="bg-bg-card/60 backdrop-blur-xl border-white/5">
        <CardHeader>
          <CardTitle className="text-base text-white flex items-center gap-2">
            <Landmark className="w-4 h-4 text-purple-400" />
            Neverland
            <Badge variant="outline" className="ml-auto text-xs border-purple-400/30 text-purple-300">
              Aave V3 Fork
            </Badge>
            <a
              href="https://neverland.finance"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs text-text-secondary hover:text-purple-400 transition-colors"
            >
              <ExternalLink className="w-3 h-3" />
            </a>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-text-secondary mb-3">
            Aave V3 fork with veTokenomics. Earn yield by supplying assets or
            borrow against collateral with variable/stable rates.
          </p>
          <NeverlandMarketsTable />
        </CardContent>
      </Card>

      {/* Curvance */}
      <Card className="bg-bg-card/60 backdrop-blur-xl border-white/5">
        <CardHeader>
          <CardTitle className="text-base text-white flex items-center gap-2">
            <Landmark className="w-4 h-4 text-purple-400" />
            Curvance
            <Badge variant="outline" className="ml-auto text-xs border-purple-400/30 text-purple-300">
              ~$58M TVL
            </Badge>
            <a
              href="https://curvance.com"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs text-text-secondary hover:text-purple-400 transition-colors"
            >
              <ExternalLink className="w-3 h-3" />
            </a>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-text-secondary mb-3">
            ERC-4626 vault lending. Deposit LST collateral and borrow against
            it via isolated cToken markets.
          </p>
          <div className="divide-y divide-white/5">
            <AddrRow label="CentralRegistry" addr={CURVANCE.centralRegistry} />
            <AddrRow label="OracleManager" addr={CURVANCE.oracleManager} />
          </div>
          <p className="text-xs text-text-secondary mt-3 mb-1 uppercase tracking-wider">
            Markets
          </p>
          <div className="grid grid-cols-2 gap-2">
            {(["aprMON", "shMON", "sMON", "gMON"] as const).map((key) => (
              <div
                key={key}
                className="rounded-lg bg-purple-400/5 border border-purple-400/10 px-3 py-2"
              >
                <p className="text-xs font-medium text-white">{key}</p>
                <p className="text-xs font-mono text-white/50 mt-0.5">
                  {truncateAddr(CURVANCE.markets[key].cToken)}
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Monad swap token list ─────────────────────────────────────────────────────

const MONAD_SWAP_TOKENS: { symbol: string; address: Address; decimals: number }[] = [
  { symbol: "WMON", address: MONAD_TOKENS.WMON, decimals: 18 },
  { symbol: "USDC", address: MONAD_TOKENS.USDC, decimals: 6 },
  { symbol: "USDT0", address: MONAD_TOKENS.USDT0, decimals: 6 },
  { symbol: "WETH", address: MONAD_TOKENS.WETH, decimals: 18 },
  { symbol: "AUSD", address: MONAD_TOKENS.AUSD, decimals: 18 },
];

// ─── DEX tab ──────────────────────────────────────────────────────────────────

function DexTab() {
  return (
    <div className="space-y-4">
      {/* Uniswap V3 */}
      <Card className="bg-bg-card/60 backdrop-blur-xl border-white/5">
        <CardHeader>
          <CardTitle className="text-base text-white flex items-center gap-2">
            <ArrowDownUp className="w-4 h-4 text-purple-400" />
            Uniswap V3
            <Badge variant="outline" className="ml-auto text-xs border-purple-400/30 text-purple-300">
              ~$60M TVL
            </Badge>
            <a
              href="https://app.uniswap.org"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs text-text-secondary hover:text-purple-400 transition-colors"
            >
              <ExternalLink className="w-3 h-3" />
            </a>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-text-secondary mb-3">
            Concentrated liquidity DEX. Provide liquidity in custom price ranges
            and earn trading fees proportional to your range position.
          </p>
          <div className="divide-y divide-white/5">
            <AddrRow label="Factory" addr={MONAD_UNISWAP.factory} />
            <AddrRow label="SwapRouter02" addr={MONAD_UNISWAP.swapRouter02} />
            <AddrRow label="PositionManager" addr={MONAD_UNISWAP.nonfungiblePositionManager} />
          </div>
        </CardContent>
      </Card>

      {/* Curve */}
      <Card className="bg-bg-card/60 backdrop-blur-xl border-white/5">
        <CardHeader>
          <CardTitle className="text-base text-white flex items-center gap-2">
            <ArrowDownUp className="w-4 h-4 text-purple-400" />
            Curve
            <Badge variant="outline" className="ml-auto text-xs border-purple-400/30 text-purple-300">
              ~$21M TVL
            </Badge>
            <a
              href="https://curve.fi"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs text-text-secondary hover:text-purple-400 transition-colors"
            >
              <ExternalLink className="w-3 h-3" />
            </a>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-text-secondary mb-3">
            StableSwap AMM optimised for pegged assets. Low slippage stablecoin
            and LST swaps via stable and crypto pools.
          </p>
          <div className="divide-y divide-white/5">
            <AddrRow label="Router" addr={MONAD_CURVE.router} />
            <AddrRow label="StableswapFactory" addr={MONAD_CURVE.stableswapFactory} />
          </div>
        </CardContent>
      </Card>

      {/* Kuru */}
      <Card className="bg-bg-card/60 backdrop-blur-xl border-white/5">
        <CardHeader>
          <CardTitle className="text-base text-white flex items-center gap-2">
            <ArrowDownUp className="w-4 h-4 text-purple-400" />
            Kuru Exchange
            <Badge variant="outline" className="ml-auto text-xs border-purple-400/30 text-purple-300">
              ~$1.2M TVL
            </Badge>
            <a
              href="https://www.kuru.io"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs text-text-secondary hover:text-purple-400 transition-colors"
            >
              <ExternalLink className="w-3 h-3" />
            </a>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-text-secondary mb-3">
            CLOB + AMM hybrid DEX native to Monad. Ultra-low latency order book
            execution with on-chain settlement.
          </p>
          <div className="divide-y divide-white/5">
            <AddrRow label="FlowEntrypoint" addr={KURU.flowEntrypoint} />
            <AddrRow label="Router" addr={KURU.router} />
          </div>
        </CardContent>
      </Card>

      {/* Aggregator swap */}
      <div>
        <p className="text-xs text-text-secondary uppercase tracking-wider mb-3 text-center">
          Swap via Aggregators
        </p>
        <AggregatorSwap
          chainId={143}
          tokens={MONAD_SWAP_TOKENS}
        />
      </div>
    </div>
  );
}

// ─── Yield tab ────────────────────────────────────────────────────────────────

function YieldTab() {
  return (
    <div className="space-y-4">
      {/* Upshift */}
      <Card className="bg-bg-card/60 backdrop-blur-xl border-white/5">
        <CardHeader>
          <CardTitle className="text-base text-white flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-purple-400" />
            Upshift
            <Badge variant="outline" className="ml-auto text-xs border-purple-400/30 text-purple-300">
              ~$82M TVL
            </Badge>
            <a
              href="https://upshift.finance"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs text-text-secondary hover:text-purple-400 transition-colors"
            >
              <ExternalLink className="w-3 h-3" />
            </a>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-text-secondary mb-3">
            Multi-strategy yield vaults. Deposit stablecoins or MON-correlated
            assets and earn optimised yield routed across Monad DeFi protocols.
          </p>
          <div className="divide-y divide-white/5">
            <AddrRow label="earnAUSD Vault" addr={UPSHIFT.earnAUSD} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Token Section ────────────────────────────────────────────────────────────

function TokenSection() {
  const [open, setOpen] = useState(false);

  return (
    <Card className="bg-bg-card/60 backdrop-blur-xl border-white/5">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-6 py-4 text-sm font-medium text-white hover:text-purple-300 transition-colors"
      >
        <span>Monad Token Addresses</span>
        {open ? (
          <ChevronUp className="w-4 h-4 text-text-secondary" />
        ) : (
          <ChevronDown className="w-4 h-4 text-text-secondary" />
        )}
      </button>
      {open && (
        <CardContent className="pt-0">
          <div className="divide-y divide-white/5">
            {(Object.entries(MONAD_TOKENS) as [string, string][]).map(
              ([symbol, addr]) => (
                <AddrRow key={symbol} label={symbol} addr={addr} />
              )
            )}
          </div>
        </CardContent>
      )}
    </Card>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function MonadPage() {
  const [activeTab, setActiveTab] = useState<Tab>("lending");
  const { chain } = useAccount();
  const isMonad = chain?.id === monadTestnet.id;

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "lending", label: "Lending", icon: <Landmark className="w-3.5 h-3.5" /> },
    { id: "dex", label: "DEX", icon: <ArrowDownUp className="w-3.5 h-3.5" /> },
    { id: "yield", label: "Yield", icon: <TrendingUp className="w-3.5 h-3.5" /> },
  ];

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Gem className="w-6 h-6 text-purple-400" />
            Monad DeFi Hub
          </h1>
          <Badge className="bg-purple-400/10 text-purple-400 border-purple-400/20">
            10,000 TPS
          </Badge>
          <Badge className="bg-pink-400/10 text-pink-400 border-pink-400/20 hidden sm:inline-flex">
            Sub-second finality
          </Badge>
        </div>
        <div className="flex gap-3 text-sm text-text-secondary">
          <a
            href="https://app.morpho.org"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-purple-400 transition-colors flex items-center gap-1"
          >
            Morpho <ExternalLink className="w-3 h-3" />
          </a>
          <span>·</span>
          <a
            href="https://www.kuru.io"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-purple-400 transition-colors flex items-center gap-1"
          >
            Kuru <ExternalLink className="w-3 h-3" />
          </a>
          <span>·</span>
          <a
            href="https://upshift.finance"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-purple-400 transition-colors flex items-center gap-1"
          >
            Upshift <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>

      {/* Chain gate */}
      {!isMonad && (
        <Card className="bg-purple-400/5 border-purple-400/20">
          <CardContent className="py-4 text-center text-purple-400 text-sm">
            Switch to Monad Testnet (Chain ID: {monadTestnet.id}) to interact
            with these protocols.
          </CardContent>
        </Card>
      )}

      {/* Tabs — pill style */}
      <nav className="flex gap-1 rounded-lg bg-white/5 p-1 w-fit">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`rounded-md px-5 py-2 text-sm font-medium transition-colors flex items-center gap-1.5 ${
              activeTab === tab.id
                ? "bg-white/10 text-white shadow-sm"
                : "text-text-secondary hover:text-white"
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </nav>

      {/* Tab content */}
      {activeTab === "lending" && <LendingTab />}
      {activeTab === "dex" && <DexTab />}
      {activeTab === "yield" && <YieldTab />}

      {/* Token section */}
      <TokenSection />
    </div>
  );
}
