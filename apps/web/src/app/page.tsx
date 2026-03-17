import Link from "next/link";
import {
  ArrowLeftRight,
  Landmark,
  Building2,
  LayoutDashboard,
  ArrowRight,
} from "lucide-react";

const FEATURES = [
  {
    href: "/earn/supply",
    title: "Earn",
    desc: "Supply assets and earn interest across Morpho and Aave markets, or stake LP tokens for emission rewards.",
    icon: <Landmark className="w-6 h-6" />,
    gradient: "from-green-500/20 to-emerald-500/20",
  },
  {
    href: "/borrow/lending",
    title: "Borrow",
    desc: "Mint sbUSD via CDP or borrow from lending markets at the best rates.",
    icon: <Building2 className="w-6 h-6" />,
    gradient: "from-blue-500/20 to-cyan-500/20",
  },
  {
    href: "/swap",
    title: "Trade",
    desc: "Swap tokens, provide liquidity to pools, or trade forward contracts.",
    icon: <ArrowLeftRight className="w-6 h-6" />,
    gradient: "from-purple-500/20 to-violet-500/20",
  },
  {
    href: "/dashboard",
    title: "Manage",
    desc: "View your portfolio, delegate positions to AI agents, or bridge assets.",
    icon: <LayoutDashboard className="w-6 h-6" />,
    gradient: "from-amber-500/20 to-orange-500/20",
  },
];

export default function HomePage() {
  return (
    <div className="flex flex-col items-center px-4 py-12 lg:py-24 relative overflow-hidden">
      {/* Background Graphic */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-4xl h-[500px] bg-gradient-to-tr from-ice-400/20 via-violet-500/10 to-emerald-400/10 rounded-full blur-[120px] pointer-events-none -z-10 animate-pulse" />

      {/* Hero */}
      <div className="text-center max-w-3xl mb-16 relative">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-bg-input/80 border border-white/10 text-xs font-medium text-ice-400 mb-6 backdrop-blur-md">
          <span className="w-2 h-2 rounded-full bg-ice-400 animate-pulse" />
          Testnet Live
        </div>
        <h1 className="text-5xl lg:text-7xl font-bold mb-6 tracking-tight z-10 realtive text-white drop-shadow-lg">
          <span className="bg-gradient-to-r from-ice-400 via-ice-300 to-slate-50 bg-clip-text text-transparent">Snowball</span> DeFi
        </h1>
        <p className="text-text-secondary text-lg lg:text-xl font-medium max-w-2xl mx-auto leading-relaxed">
          The unified DeFi protocol on Creditcoin.
          <br className="hidden sm:block" /> Swap, Lend, Borrow, and Earn in one seamless experience.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-4 mt-8">
          <Link href="/swap" className="px-8 py-3 rounded-full bg-ice-400 text-white font-semibold hover:bg-ice-500 transition-all hover:shadow-[0_0_20px_rgba(96,165,250,0.5)] active:scale-95">
            Launch App
          </Link>
        </div>
      </div>

      {/* Feature Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 w-full max-w-5xl relative z-10">
        {FEATURES.map((f, i) => (
          <Link
            key={f.href}
            href={f.href}
            className="group relative"
          >
            <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent opacity-0 group-hover:opacity-100 rounded-2xl transition-opacity duration-500" />
            <div className="relative flex flex-col gap-4 p-6 rounded-2xl bg-bg-card/60 backdrop-blur-xl border border-border group-hover:border-ice-400/30 transition-all duration-300 h-full group-hover:-translate-y-1 group-hover:shadow-[0_8px_32px_rgba(96,165,250,0.1)]">
              <div
                className={`w-12 h-12 rounded-xl bg-gradient-to-br ${f.gradient} flex items-center justify-center text-white shadow-lg`}
              >
                {f.icon}
              </div>
              <div>
                <h3 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
                  {f.title}
                  <ArrowRight className="w-4 h-4 text-text-secondary group-hover:text-ice-400 group-hover:translate-x-1 transition-all" />
                </h3>
                <p className="text-[15px] text-text-secondary leading-relaxed font-medium">
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
