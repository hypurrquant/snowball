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
  Layers,
  GlassWater,
  Building2,
  TrendingUp,
  Coins,
} from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: (className: string) => React.ReactNode;
}

export interface NavGroup {
  title: string;
  items: NavItem[];
}

export const NAV_GROUPS: NavGroup[] = [
  {
    title: "Trade",
    items: [
      { href: "/swap", label: "Swap", icon: (cls) => <ArrowLeftRight className={cls} /> },
      { href: "/pool", label: "Pool", icon: (cls) => <Droplets className={cls} /> },
      { href: "/pool/positions", label: "Positions", icon: (cls) => <Layers className={cls} /> },
    ],
  },
  {
    title: "DeFi",
    items: [
      { href: "/liquity", label: "CDP", icon: (cls) => <HandCoins className={cls} /> },
      { href: "/morpho", label: "Lending", icon: (cls) => <Landmark className={cls} /> },
      { href: "/aave", label: "Aave", icon: (cls) => <Building2 className={cls} /> },
      { href: "/yield", label: "Yield", icon: (cls) => <Vault className={cls} /> },
      { href: "/forward", label: "ForwardX", icon: (cls) => <TrendingUp className={cls} /> },
      { href: "/stake", label: "Stake", icon: (cls) => <Coins className={cls} /> },
      { href: "/bridge", label: "Hyperliquid DN Vault Bridge", icon: (cls) => <Link2 className={cls} /> },
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
    title: "More",
    items: [
      { href: "/faucet", label: "Faucet", icon: (cls) => <GlassWater className={cls} /> },
      { href: "/dashboard", label: "Dashboard", icon: (cls) => <LayoutDashboard className={cls} /> },
      { href: "/analytics", label: "Analytics", icon: (cls) => <BarChart3 className={cls} /> },
      { href: "/agent", label: "Agent", icon: (cls) => <Bot className={cls} /> },
      { href: "/chat", label: "Chat", icon: (cls) => <MessageSquare className={cls} /> },
    ],
  },
];
