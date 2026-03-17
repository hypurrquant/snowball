import {
  ArrowLeftRight,
  Droplets,
  Landmark,
  HandCoins,
  // ChartCandlestick,  // Options disabled
  // History,           // Options disabled
  LayoutDashboard,
  BarChart3,
  Bot,
  MessageSquare,
  Vault,
  Link2,
  GlassWater,
  Building2,
  TrendingUp,
  Coins,
  Waypoints,
} from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: (className: string) => React.ReactNode;
  matchPaths?: string[];  // Additional path prefixes that activate this nav item
}

export interface NavGroup {
  title: string;
  items: NavItem[];
}

export const NAV_GROUPS: NavGroup[] = [
  {
    title: "Earn",
    items: [
      { href: "/earn/supply", label: "Supply", icon: (cls) => <Landmark className={cls} />, matchPaths: ["/morpho/supply", "/aave/supply"] },
      { href: "/earn/strategy", label: "Strategy", icon: (cls) => <Waypoints className={cls} />, matchPaths: [] },
      { href: "/yield", label: "Yield Vaults", icon: (cls) => <Vault className={cls} />, matchPaths: ["/yield"] },
      { href: "/stake", label: "LP Staking", icon: (cls) => <Coins className={cls} />, matchPaths: ["/stake"] },
    ],
  },
  {
    title: "Borrow",
    items: [
      { href: "/liquity", label: "CDP", icon: (cls) => <HandCoins className={cls} />, matchPaths: ["/liquity/borrow", "/liquity/earn"] },
      { href: "/borrow/lending", label: "Lending", icon: (cls) => <Building2 className={cls} />, matchPaths: ["/morpho/borrow", "/aave/borrow"] },
    ],
  },
  {
    title: "Trade",
    items: [
      { href: "/swap", label: "Swap", icon: (cls) => <ArrowLeftRight className={cls} /> },
      { href: "/pool", label: "Pool", icon: (cls) => <Droplets className={cls} />, matchPaths: ["/pool/positions", "/pool/add"] },
      { href: "/forward", label: "ForwardX", icon: (cls) => <TrendingUp className={cls} />, matchPaths: ["/forward/trade", "/forward/positions", "/forward/marketplace"] },
    ],
  },
  // Options: disabled — EIP-712 not implemented + API schema mismatch + withdrawal broken (see options-fe-analysis.md)
  // {
  //   title: "Options",
  //   items: [
  //     { href: "/options", label: "Trade", icon: (cls) => <ChartCandlestick className={cls} /> },
  //     { href: "/options/history", label: "History", icon: (cls) => <History className={cls} /> },
  //   ],
  // },
  {
    title: "Manage",
    items: [
      { href: "/dashboard", label: "Dashboard", icon: (cls) => <LayoutDashboard className={cls} /> },
      { href: "/agent", label: "Agent", icon: (cls) => <Bot className={cls} />, matchPaths: ["/agent/register", "/agent/vault"] },
      { href: "/bridge", label: "Bridge", icon: (cls) => <Link2 className={cls} /> },
      { href: "/analytics", label: "Analytics", icon: (cls) => <BarChart3 className={cls} /> },
      { href: "/chat", label: "Chat", icon: (cls) => <MessageSquare className={cls} /> },
      { href: "/faucet", label: "Faucet", icon: (cls) => <GlassWater className={cls} /> },
    ],
  },
];
