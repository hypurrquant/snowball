import {
  ArrowLeftRight,
  Droplets,
  Landmark,
  HandCoins,
  // ChartCandlestick,  // Options 비활성화
  // History,           // Options 비활성화
  LayoutDashboard,
  BarChart3,
  Bot,
  MessageSquare,
  Vault,
  Link2,
  Layers,
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
      { href: "/liquity", label: "Liquity", icon: (cls) => <HandCoins className={cls} /> },
      { href: "/morpho", label: "Morpho", icon: (cls) => <Landmark className={cls} /> },
      { href: "/yield", label: "Yield", icon: (cls) => <Vault className={cls} /> },
      { href: "/bridge", label: "Bridge", icon: (cls) => <Link2 className={cls} /> },
    ],
  },
  // Options: 비활성화 — EIP-712 미구현 + API 스키마 불일치 + 출금 불가 (options-fe-analysis.md 참조)
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
      { href: "/dashboard", label: "Dashboard", icon: (cls) => <LayoutDashboard className={cls} /> },
      { href: "/analytics", label: "Analytics", icon: (cls) => <BarChart3 className={cls} /> },
      { href: "/agent", label: "Agent", icon: (cls) => <Bot className={cls} /> },
      { href: "/chat", label: "Chat", icon: (cls) => <MessageSquare className={cls} /> },
    ],
  },
];
