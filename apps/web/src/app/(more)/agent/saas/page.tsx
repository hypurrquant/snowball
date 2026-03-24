import Link from "next/link";
import {
  Bot,
  Check,
  ChevronRight,
  Zap,
  ShieldCheck,
  BarChart3,
  Network,
  Fuel,
} from "lucide-react";

// ─── Pricing plans ───

interface Plan {
  name: string;
  price: string;
  priceDetail: string;
  agents: string;
  strategy: string;
  execution: string;
  extras: string[];
  cta: string;
  ctaHref: string;
  highlight: boolean;
}

const PLANS: Plan[] = [
  {
    name: "Free",
    price: "0",
    priceDetail: "sbUSD/month",
    agents: "1 agent",
    strategy: "Basic strategy",
    execution: "Manual exec",
    extras: [],
    cta: "Start Free",
    ctaHref: "/agent",
    highlight: false,
  },
  {
    name: "Pro",
    price: "10",
    priceDetail: "sbUSD/month",
    agents: "5 agents",
    strategy: "Advanced strategy",
    execution: "Auto rebalance",
    extras: ["Priority execution", "Daily reports"],
    cta: "Subscribe",
    ctaHref: "/agent",
    highlight: true,
  },
  {
    name: "Protocol",
    price: "Contact",
    priceDetail: "custom pricing",
    agents: "Unlimited",
    strategy: "Custom strategy",
    execution: "API access",
    extras: ["Dedicated support", "White-label"],
    cta: "Contact Us",
    ctaHref: "mailto:hello@snowball.finance",
    highlight: false,
  },
];

// ─── Features ───

const FEATURES = [
  {
    icon: ShieldCheck,
    label: "On-chain reputation (ERC-8004)",
  },
  {
    icon: Zap,
    label: "Granular permissions (per-function)",
  },
  {
    icon: BarChart3,
    label: "Daily reports & analytics",
  },
  {
    icon: Network,
    label: "Multi-protocol optimization",
  },
  {
    icon: Fuel,
    label: "Gasless execution (Smart Account)",
  },
];

// ─── How it works ───

const HOW_IT_WORKS = [
  "Choose a plan",
  "Delegate assets to Agent Vault",
  "AI monitors & optimizes 24/7",
  "Claim profits anytime",
];

// ─── Stats ───

const STATS = [
  { label: "Avg APY", value: "12%" },
  { label: "Active Users", value: "1,234" },
  { label: "Protocols", value: "5" },
  { label: "Uptime", value: "99.9%" },
];

// ─── Page ───

export default function AgentSaasPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-12 space-y-16">
      {/* Header */}
      <div className="text-center space-y-4">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-bg-input/80 border border-ice-400/20 text-xs font-medium text-ice-400 backdrop-blur-md">
          <Bot className="w-3.5 h-3.5" />
          Snowball AI Agent — SaaS
        </div>
        <h1 className="text-4xl lg:text-5xl font-bold text-white tracking-tight">
          Let AI Optimize Your{" "}
          <span className="bg-gradient-to-r from-ice-400 to-blue-400 bg-clip-text text-transparent">
            DeFi Portfolio
          </span>
        </h1>
        <p className="text-text-secondary text-lg max-w-xl mx-auto">
          Automated 24/7 strategy execution powered by on-chain AI agents. No
          code required.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {STATS.map((s) => (
          <div
            key={s.label}
            className="rounded-xl bg-bg-card/60 backdrop-blur-xl border border-border p-4 text-center"
          >
            <p className="text-2xl font-bold text-white font-mono">{s.value}</p>
            <p className="text-xs text-text-secondary mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Pricing cards */}
      <div>
        <h2 className="text-sm font-medium text-text-tertiary uppercase tracking-wider mb-6">
          Plans
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {PLANS.map((plan) => (
            <div
              key={plan.name}
              className={`relative flex flex-col rounded-2xl border p-6 transition-all ${
                plan.highlight
                  ? "border-ice-400/40 bg-gradient-to-b from-ice-400/10 to-blue-500/5 shadow-[0_0_40px_rgba(96,165,250,0.08)]"
                  : "border-border bg-bg-card/60 backdrop-blur-xl"
              }`}
            >
              {plan.highlight && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="px-3 py-1 rounded-full bg-ice-400 text-white text-xs font-semibold">
                    Most Popular
                  </span>
                </div>
              )}

              {/* Plan name */}
              <p className="text-sm font-semibold text-text-secondary uppercase tracking-wider mb-4">
                {plan.name}
              </p>

              {/* Price */}
              <div className="mb-6">
                <div className="flex items-baseline gap-1">
                  {plan.price === "Contact" ? (
                    <span className="text-3xl font-bold text-white">
                      Contact
                    </span>
                  ) : (
                    <>
                      <span className="text-3xl font-bold text-white font-mono">
                        {plan.price}
                      </span>
                      <span className="text-sm text-text-secondary">
                        sbUSD
                      </span>
                    </>
                  )}
                </div>
                {plan.price !== "Contact" && (
                  <p className="text-xs text-text-tertiary mt-0.5">/month</p>
                )}
              </div>

              {/* Feature list */}
              <ul className="space-y-3 flex-1 mb-8">
                {[plan.agents, plan.strategy, plan.execution, ...plan.extras].map(
                  (feature) => (
                    <li
                      key={feature}
                      className="flex items-center gap-2 text-sm text-text-secondary"
                    >
                      <Check className="w-4 h-4 text-ice-400 shrink-0" />
                      {feature}
                    </li>
                  )
                )}
              </ul>

              {/* CTA */}
              <Link
                href={plan.ctaHref}
                className={`flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-sm font-semibold transition-all ${
                  plan.highlight
                    ? "bg-ice-400 text-white hover:bg-ice-500 hover:shadow-[0_0_20px_rgba(96,165,250,0.4)]"
                    : "bg-bg-input border border-border text-white hover:border-ice-400/30"
                }`}
              >
                {plan.cta}
                <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
          ))}
        </div>
      </div>

      {/* Features */}
      <div>
        <h2 className="text-sm font-medium text-text-tertiary uppercase tracking-wider mb-6">
          Features
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {FEATURES.map((f) => {
            const Icon = f.icon;
            return (
              <div
                key={f.label}
                className="flex items-center gap-3 p-4 rounded-xl bg-bg-card/60 backdrop-blur-xl border border-border"
              >
                <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-ice-400/20 to-blue-500/20 flex items-center justify-center shrink-0">
                  <Icon className="w-4.5 h-4.5 text-ice-400" />
                </div>
                <p className="text-sm text-white font-medium">{f.label}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* How It Works */}
      <div>
        <h2 className="text-sm font-medium text-text-tertiary uppercase tracking-wider mb-6">
          How It Works
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {HOW_IT_WORKS.map((step, i) => (
            <div
              key={step}
              className="flex flex-col gap-3 p-5 rounded-xl bg-bg-card/60 backdrop-blur-xl border border-border"
            >
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-ice-400/20 to-blue-500/20 border border-ice-400/20 flex items-center justify-center text-ice-400 font-bold text-sm">
                {i + 1}
              </div>
              <p className="text-sm text-white font-medium leading-snug">
                {step}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom CTA */}
      <div className="rounded-2xl bg-gradient-to-r from-ice-400/10 to-violet-500/10 border border-ice-400/20 p-8 text-center space-y-4">
        <Bot className="w-10 h-10 text-ice-400 mx-auto" />
        <h3 className="text-xl font-bold text-white">Ready to automate?</h3>
        <p className="text-text-secondary text-sm">
          Set up your Agent Vault and start earning while you sleep.
        </p>
        <Link
          href="/agent"
          className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-ice-400 text-white font-semibold hover:bg-ice-500 transition-all hover:shadow-[0_0_20px_rgba(96,165,250,0.4)]"
        >
          Go to Agent
          <ChevronRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
}
