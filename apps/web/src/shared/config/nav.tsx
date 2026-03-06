import {
  ArrowLeftRight,
  Droplets,
  Landmark,
  HandCoins,
  Percent,
  ChartCandlestick,
  History,
  LayoutDashboard,
  BarChart3,
  Bot,
  MessageSquare,
  Vault,
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
    ],
  },
  {
    title: "DeFi",
    items: [
      { href: "/lend", label: "Lend", icon: (cls) => <Landmark className={cls} /> },
      { href: "/borrow", label: "Borrow", icon: (cls) => <HandCoins className={cls} /> },
      { href: "/earn", label: "Earn", icon: (cls) => <Percent className={cls} /> },
      { href: "/yield", label: "Yield", icon: (cls) => <Vault className={cls} /> },
    ],
  },
  {
    title: "Options",
    items: [
      { href: "/options", label: "Trade", icon: (cls) => <ChartCandlestick className={cls} /> },
      { href: "/options/history", label: "History", icon: (cls) => <History className={cls} /> },
    ],
  },
  {
    title: "More",
    items: [
      { href: "/dashboard", label: "Dashboard", icon: (cls) => <LayoutDashboard className={cls} /> },
      { href: "/analytics", label: "Analytics", icon: (cls) => <BarChart3 className={cls} /> },
      { href: "/agent", label: "Agent", icon: (cls) => <Bot className={cls} /> },
      { href: "/chat", label: "Chat", icon: (cls) => <MessageSquare className={cls} /> },
    ],
  },
];
