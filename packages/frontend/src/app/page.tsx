import Link from "next/link";
import {
  ArrowLeftRight,
  Landmark,
  HandCoins,
  Percent,
  ChartCandlestick,
  ArrowRight,
} from "lucide-react";

const FEATURES = [
  {
    href: "/swap",
    title: "Swap",
    desc: "Trade tokens with concentrated liquidity AMM",
    icon: <ArrowLeftRight className="w-6 h-6" />,
    gradient: "from-blue-500/20 to-cyan-500/20",
  },
  {
    href: "/lend",
    title: "Lend",
    desc: "Supply assets and earn interest via Morpho markets",
    icon: <Landmark className="w-6 h-6" />,
    gradient: "from-emerald-500/20 to-teal-500/20",
  },
  {
    href: "/borrow",
    title: "Borrow",
    desc: "Open Troves and borrow sbUSD against collateral",
    icon: <HandCoins className="w-6 h-6" />,
    gradient: "from-amber-500/20 to-orange-500/20",
  },
  {
    href: "/earn",
    title: "Earn",
    desc: "Deposit sbUSD in the Stability Pool for rewards",
    icon: <Percent className="w-6 h-6" />,
    gradient: "from-purple-500/20 to-pink-500/20",
  },
  {
    href: "/options",
    title: "Options",
    desc: "Trade BTC binary options with real-time oracle pricing",
    icon: <ChartCandlestick className="w-6 h-6" />,
    gradient: "from-rose-500/20 to-red-500/20",
  },
];

export default function HomePage() {
  return (
    <div className="flex flex-col items-center px-4 py-12 lg:py-24 relative overflow-hidden">
      {/* Background Graphic */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-4xl h-[500px] bg-gradient-to-tr from-[#60a5fa]/20 via-[#8B5CF6]/10 to-[#34D399]/10 rounded-full blur-[120px] pointer-events-none -z-10 animate-pulse" />

      {/* Hero */}
      <div className="text-center max-w-3xl mb-16 relative">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#1C1D30]/80 border border-white/10 text-xs font-medium text-[#60a5fa] mb-6 backdrop-blur-md">
          <span className="w-2 h-2 rounded-full bg-[#60a5fa] animate-pulse" />
          Testnet Live
        </div>
        <h1 className="text-5xl lg:text-7xl font-bold mb-6 tracking-tight z-10 realtive text-white drop-shadow-lg">
          <span className="bg-gradient-to-r from-[#60a5fa] via-[#93c5fd] to-[#f8fafc] bg-clip-text text-transparent">Snowball</span> DeFi
        </h1>
        <p className="text-[#8B8D97] text-lg lg:text-xl font-medium max-w-2xl mx-auto leading-relaxed">
          The unified DeFi protocol on Creditcoin.
          <br className="hidden sm:block" /> Swap, Lend, Borrow, Earn, and Trade Binary Options in one seamless experience.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-4 mt-8">
          <Link href="/swap" className="px-8 py-3 rounded-full bg-[#60a5fa] text-white font-semibold hover:bg-[#3b82f6] transition-all hover:shadow-[0_0_20px_rgba(96,165,250,0.5)] active:scale-95">
            Launch App
          </Link>
          <Link href="https://docs.snowball.fi" target="_blank" className="px-8 py-3 rounded-full bg-[#1C1D30] text-white font-semibold hover:bg-[#1a2035] border border-[#1F2037] hover:border-white/20 transition-all active:scale-95">
            Read Docs
          </Link>
        </div>
      </div>

      {/* Feature Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 w-full max-w-5xl relative z-10">
        {FEATURES.map((f, i) => (
          <Link
            key={f.href}
            href={f.href}
            className="group relative"
          >
            <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent opacity-0 group-hover:opacity-100 rounded-2xl transition-opacity duration-500" />
            <div className="relative flex flex-col gap-4 p-6 rounded-2xl bg-[#141525]/60 backdrop-blur-xl border border-[#1F2037] group-hover:border-[#60a5fa]/30 transition-all duration-300 h-full group-hover:-translate-y-1 group-hover:shadow-[0_8px_32px_rgba(96,165,250,0.1)]">
              <div
                className={`w-12 h-12 rounded-xl bg-gradient-to-br ${f.gradient} flex items-center justify-center text-white shadow-lg`}
              >
                {f.icon}
              </div>
              <div>
                <h3 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
                  {f.title}
                  <ArrowRight className="w-4 h-4 text-[#8B8D97] group-hover:text-[#60a5fa] group-hover:translate-x-1 transition-all" />
                </h3>
                <p className="text-[15px] text-[#8B8D97] leading-relaxed font-medium">
                  {f.desc}
                </p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
