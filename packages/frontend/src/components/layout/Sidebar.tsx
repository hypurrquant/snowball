"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
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
  Snowflake,
  Vault,
} from "lucide-react";

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    title: "Trade",
    items: [
      { href: "/swap", label: "Swap", icon: <ArrowLeftRight className="w-4 h-4" /> },
      { href: "/pool", label: "Pool", icon: <Droplets className="w-4 h-4" /> },
    ],
  },
  {
    title: "DeFi",
    items: [
      { href: "/lend", label: "Lend", icon: <Landmark className="w-4 h-4" /> },
      { href: "/borrow", label: "Borrow", icon: <HandCoins className="w-4 h-4" /> },
      { href: "/earn", label: "Earn", icon: <Percent className="w-4 h-4" /> },
      { href: "/yield", label: "Yield", icon: <Vault className="w-4 h-4" /> },
    ],
  },
  {
    title: "Options",
    items: [
      { href: "/options", label: "Trade", icon: <ChartCandlestick className="w-4 h-4" /> },
      { href: "/options/history", label: "History", icon: <History className="w-4 h-4" /> },
    ],
  },
  {
    title: "More",
    items: [
      { href: "/dashboard", label: "Dashboard", icon: <LayoutDashboard className="w-4 h-4" /> },
      { href: "/analytics", label: "Analytics", icon: <BarChart3 className="w-4 h-4" /> },
      { href: "/agent", label: "Agent", icon: <Bot className="w-4 h-4" /> },
      { href: "/chat", label: "Chat", icon: <MessageSquare className="w-4 h-4" /> },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden lg:flex flex-col w-60 h-screen bg-bg-secondary border-r border-border sticky top-0">
      {/* Logo */}
      <Link href="/" className="flex items-center gap-2.5 px-5 py-4 border-b border-border">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-ice-400 to-ice-600 flex items-center justify-center">
          <Snowflake className="w-4 h-4 text-white" />
        </div>
        <span className="text-lg font-bold text-gradient-ice">Snowball</span>
      </Link>

      {/* Nav Groups */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-5">
        {NAV_GROUPS.map((group) => (
          <div key={group.title}>
            <div className="section-title px-2">{group.title}</div>
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const isActive =
                  pathname === item.href ||
                  (item.href !== "/" && pathname.startsWith(item.href));
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors",
                        isActive
                          ? "bg-ice-500/10 text-ice-400 font-medium"
                          : "text-text-secondary hover:text-text-primary hover:bg-bg-hover"
                      )}
                    >
                      {item.icon}
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-border">
        <div className="flex items-center gap-2 text-xs text-text-tertiary">
          <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
          Creditcoin Testnet
        </div>
      </div>
    </aside>
  );
}
