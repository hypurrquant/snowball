"use client";

import Link from "next/link";
import { useAccount, useReadContracts } from "wagmi";
import { erc20Abi, type Address } from "viem";
import { TOKENS, TOKEN_INFO } from "@snowball/core/src/config/addresses";
import { DEX_POOLS } from "@snowball/core/src/config/pools";
import { useUnifiedSupplyMarkets } from "@/domains/defi/unified/hooks/useUnifiedSupplyMarkets";
import { useUnifiedBorrowMarkets } from "@/domains/defi/unified/hooks/useUnifiedBorrowMarkets";
import { formatTokenAmount } from "@/shared/lib/utils";
import {
  Landmark,
  Building2,
  ArrowLeftRight,
  LayoutDashboard,
  ArrowRight,
  Wallet,
  Bot,
  Zap,
} from "lucide-react";
import { QuickStrategies } from "@/shared/components/QuickStrategies";
import { YieldComparison } from "@/shared/components/YieldComparison";
import { AgentSaasBanner } from "@/shared/components/AgentSaasBanner";
import { SavingsAccount } from "@/shared/components/SavingsAccount";

// ─── Token list for balance display ───

const DISPLAY_TOKENS = [
  { address: TOKENS.wCTC, key: "wCTC" },
  { address: TOKENS.lstCTC, key: "lstCTC" },
  { address: TOKENS.sbUSD, key: "sbUSD" },
  { address: TOKENS.USDC, key: "USDC" },
] as const;

// ─── Explore links ───

// Static emission estimate (% added on top of base APY for agent leverage strategy)
const EMISSION_BOOST_PCT = 8;
const LEVERAGE_MULTIPLIER = 2;

// ─── Wallet Balances ───

function WalletBalances({ address }: { address: Address }) {
  const contracts = DISPLAY_TOKENS.map((t) => ({
    address: t.address as Address,
    abi: erc20Abi,
    functionName: "balanceOf" as const,
    args: [address] as const,
  }));

  const { data, isLoading } = useReadContracts({
    contracts,
    query: { refetchInterval: 15_000 },
  });

  let totalUsd = 0;
  const rows = DISPLAY_TOKENS.map((t, i) => {
    const raw = data?.[i]?.result as bigint | undefined;
    const balance = raw ?? 0n;
    const info = TOKEN_INFO[t.address];
    const human = Number(balance) / 10 ** info.decimals;
    const usd = human * info.mockPriceUsd;
    totalUsd += usd;

    return {
      symbol: info.symbol,
      balance,
      decimals: info.decimals,
      usd,
      hasBalance: balance > 0n,
    };
  });

  return (
    <div className="w-full max-w-2xl rounded-2xl bg-bg-card/60 backdrop-blur-xl border border-border overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border/50">
        <div className="flex items-center gap-2.5">
          <Wallet className="w-5 h-5 text-ice-400" />
          <span className="font-semibold text-white">My Wallet</span>
        </div>
        <div className="text-right">
          <span className="text-sm text-text-tertiary">Total </span>
          {isLoading ? (
            <span className="text-sm text-text-tertiary">...</span>
          ) : (
            <span className="font-semibold text-white">
              ${totalUsd.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </span>
          )}
        </div>
      </div>

      {/* Token rows */}
      <div className="divide-y divide-border/30">
        {rows.map((row) => (
          <div
            key={row.symbol}
            className="flex items-center justify-between px-6 py-3.5"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-bg-input flex items-center justify-center text-xs font-bold text-ice-400">
                {row.symbol.slice(0, 2)}
              </div>
              <span className="font-medium text-white">{row.symbol}</span>
            </div>
            <div className="text-right">
              {isLoading ? (
                <div className="h-4 w-20 bg-bg-input rounded animate-pulse" />
              ) : (
                <>
                  <p className="font-mono text-sm text-white">
                    {formatTokenAmount(row.balance, row.decimals, 2)}
                  </p>
                  <p className="text-xs text-text-tertiary">
                    ${row.usd.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                  </p>
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Page ───

export default function HomePage() {
  const { address, isConnected } = useAccount();
  const { markets: supplyMarkets, isLoading: supplyLoading } = useUnifiedSupplyMarkets();
  const { markets: borrowMarkets, isLoading: borrowLoading } = useUnifiedBorrowMarkets();

  // Best supply APY across all markets
  const bestSupplyAPY = supplyMarkets.length > 0
    ? Math.max(...supplyMarkets.filter((m) => m.isActive).map((m) => m.supplyAPY))
    : 0;

  // Lowest borrow APR across all markets
  const lowestBorrowAPR = borrowMarkets.length > 0
    ? Math.min(...borrowMarkets.filter((m) => m.isActive).map((m) => m.borrowAPR))
    : 0;

  // Agent: leverage * best supply + emission boost
  const agentMaxAPY = bestSupplyAPY * LEVERAGE_MULTIPLIER + EMISSION_BOOST_PCT;

  const rateLoading = supplyLoading || borrowLoading;

  const EXPLORE = [
    {
      href: "/earn/supply",
      title: "Earn",
      desc: "Supply & stake for yield",
      icon: <Landmark className="w-5 h-5" />,
      gradient: "from-green-500/20 to-emerald-500/20",
      rate: rateLoading ? "..." : `Up to ${bestSupplyAPY.toFixed(1)}% APY`,
    },
    {
      href: "/liquity/borrow",
      title: "Borrow",
      desc: "Mint sbUSD or borrow assets",
      icon: <Building2 className="w-5 h-5" />,
      gradient: "from-blue-500/20 to-cyan-500/20",
      rate: rateLoading ? "..." : `From ${lowestBorrowAPR.toFixed(1)}% APR`,
    },
    {
      href: "/swap",
      title: "Trade",
      desc: "Swap & provide liquidity",
      icon: <ArrowLeftRight className="w-5 h-5" />,
      gradient: "from-purple-500/20 to-violet-500/20",
      rate: `${DEX_POOLS.length} pools live`,
    },
    {
      href: "/dashboard",
      title: "Manage",
      desc: "Portfolio, Agent, Bridge",
      icon: <LayoutDashboard className="w-5 h-5" />,
      gradient: "from-amber-500/20 to-orange-500/20",
      rate: null as string | null,
    },
    {
      href: "/hyperevm",
      title: "HyperEVM",
      desc: "HyperLend + HyperSwap + Felix",
      icon: <Zap className="w-5 h-5" />,
      gradient: "from-orange-500/20 to-amber-400/20",
      rate: null as string | null,
    },
  ];

  const AGENT_CARD = {
    href: "/agent",
    title: "AI Agent",
    desc: "Leverage + emission 자동 최적화로 수익 극대화",
    icon: <Bot className="w-5 h-5" />,
    gradient: "from-ice-400/20 to-blue-500/20",
    rate: rateLoading ? "..." : `Up to ${agentMaxAPY.toFixed(1)}% APY`,
  };

  return (
    <div className="flex flex-col items-center px-4 py-12 lg:py-24 relative overflow-hidden">
      {/* Background */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-4xl h-[500px] bg-gradient-to-tr from-ice-400/20 via-violet-500/10 to-emerald-400/10 rounded-full blur-[120px] pointer-events-none -z-10 animate-pulse" />

      {/* Hero */}
      <div className="text-center max-w-3xl mb-12 relative">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-bg-input/80 border border-white/10 text-xs font-medium text-ice-400 mb-6 backdrop-blur-md">
          <span className="w-2 h-2 rounded-full bg-ice-400 animate-pulse" />
          Testnet Live
        </div>
        <h1 className="text-5xl lg:text-7xl font-bold mb-6 tracking-tight text-white drop-shadow-lg">
          <span className="bg-gradient-to-r from-ice-400 via-ice-300 to-slate-50 bg-clip-text text-transparent">
            Snowball
          </span>{" "}
          DeFi
        </h1>
        <p className="text-text-secondary text-lg font-medium max-w-2xl mx-auto leading-relaxed">
          The unified DeFi protocol on Creditcoin.
        </p>
      </div>

      {/* Wallet Balances (connected) or CTA (not connected) */}
      {isConnected && address ? (
        <div className="w-full flex justify-center mb-12">
          <WalletBalances address={address} />
        </div>
      ) : (
        <div className="mb-12">
          <Link
            href="/swap"
            className="px-8 py-3 rounded-full bg-ice-400 text-white font-semibold hover:bg-ice-500 transition-all hover:shadow-[0_0_20px_rgba(96,165,250,0.5)] active:scale-95"
          >
            Launch App
          </Link>
        </div>
      )}

      {/* Explore */}
      <div className="w-full max-w-2xl">
        <h2 className="text-sm font-medium text-text-tertiary uppercase tracking-wider mb-4 px-1">
          Explore
        </h2>
        <div className="grid grid-cols-2 gap-3">
          {EXPLORE.map((f) => (
            <Link key={f.href} href={f.href} className="group">
              <div className="flex items-center justify-between p-4 rounded-xl bg-bg-card/60 backdrop-blur-xl border border-border hover:border-ice-400/30 transition-all duration-200 group-hover:-translate-y-0.5">
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`w-10 h-10 rounded-lg bg-gradient-to-br ${f.gradient} flex items-center justify-center text-white shrink-0`}
                  >
                    {f.icon}
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-white text-sm flex items-center gap-1.5">
                      {f.title}
                      <ArrowRight className="w-3 h-3 text-text-tertiary group-hover:text-ice-400 group-hover:translate-x-0.5 transition-all" />
                    </p>
                    <p className="text-xs text-text-secondary truncate">{f.desc}</p>
                  </div>
                </div>
                {f.rate && (
                  <span className="text-xs font-medium text-ice-400 whitespace-nowrap ml-2">
                    {f.rate}
                  </span>
                )}
              </div>
            </Link>
          ))}
        </div>

        {/* Quick Strategies — only when wallet connected */}
        {isConnected && (
          <div className="mt-6 space-y-3">
            <QuickStrategies />
            <AgentSaasBanner />
          </div>
        )}

        {/* Savings Account — only when wallet connected */}
        {isConnected && (
          <div className="mt-6 flex justify-center">
            <SavingsAccount />
          </div>
        )}

        {/* Agent — full width */}
        <Link href={AGENT_CARD.href} className="group block mt-3">
          <div className="flex items-center justify-between p-4 rounded-xl bg-bg-card/60 backdrop-blur-xl border border-ice-400/20 hover:border-ice-400/40 transition-all duration-200 group-hover:-translate-y-0.5">
            <div className="flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded-lg bg-gradient-to-br ${AGENT_CARD.gradient} flex items-center justify-center text-white shrink-0`}
              >
                {AGENT_CARD.icon}
              </div>
              <div>
                <p className="font-semibold text-white text-sm flex items-center gap-1.5">
                  {AGENT_CARD.title}
                  <ArrowRight className="w-3 h-3 text-text-tertiary group-hover:text-ice-400 group-hover:translate-x-0.5 transition-all" />
                </p>
                <p className="text-xs text-text-secondary">{AGENT_CARD.desc}</p>
              </div>
            </div>
            <span className="text-sm font-semibold text-ice-400 whitespace-nowrap ml-2">
              {AGENT_CARD.rate}
            </span>
          </div>
        </Link>

        {/* Yield Comparison — visible to all */}
        <div className="mt-10">
          <YieldComparison />
        </div>
      </div>
    </div>
  );
}
