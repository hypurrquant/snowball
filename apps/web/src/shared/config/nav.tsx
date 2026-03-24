import {
  ArrowLeftRight,
  Droplets,
  Landmark,
  HandCoins,
  LayoutDashboard,
  Bot,
  Vault,
  Link2,
  Building2,
  Coins,
} from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: (className: string) => React.ReactNode;
  matchPaths?: string[];
}

export interface NavGroup {
  title: string;
  items: NavItem[];
}

export const NAV_GROUPS: NavGroup[] = [
  {
    title: "Earn",
    items: [
      { href: "/earn/supply", label: "Supply", icon: (cls) => <Landmark className={cls} />, matchPaths: ["/morpho/supply", "/aave/supply", "/earn/strategy"] },
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
      { href: "/pool", label: "Pool", icon: (cls) => <Droplets className={cls} />, matchPaths: ["/pool/positions", "/pool/add", "/forward", "/forward/trade", "/forward/positions", "/forward/marketplace"] },
    ],
  },
  {
    title: "Manage",
    items: [
      { href: "/dashboard", label: "Dashboard", icon: (cls) => <LayoutDashboard className={cls} />, matchPaths: ["/analytics"] },
      { href: "/agent", label: "Agent", icon: (cls) => <Bot className={cls} />, matchPaths: ["/agent/register", "/agent/vault", "/agent/saas", "/chat"] },
      { href: "/bridge", label: "Bridge", icon: (cls) => <Link2 className={cls} /> },
    ],
  },
];
