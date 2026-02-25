"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { X, Snowflake } from "lucide-react";
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
} from "lucide-react";

const MOBILE_NAV = [
  { href: "/swap", label: "Swap", icon: <ArrowLeftRight className="w-5 h-5" /> },
  { href: "/pool", label: "Pool", icon: <Droplets className="w-5 h-5" /> },
  { href: "/lend", label: "Lend", icon: <Landmark className="w-5 h-5" /> },
  { href: "/borrow", label: "Borrow", icon: <HandCoins className="w-5 h-5" /> },
  { href: "/earn", label: "Earn", icon: <Percent className="w-5 h-5" /> },
  { href: "/options", label: "Options", icon: <ChartCandlestick className="w-5 h-5" /> },
  { href: "/options/history", label: "History", icon: <History className="w-5 h-5" /> },
  { href: "/dashboard", label: "Dashboard", icon: <LayoutDashboard className="w-5 h-5" /> },
  { href: "/analytics", label: "Analytics", icon: <BarChart3 className="w-5 h-5" /> },
  { href: "/agent", label: "Agent", icon: <Bot className="w-5 h-5" /> },
  { href: "/chat", label: "Chat", icon: <MessageSquare className="w-5 h-5" /> },
];

export function MobileNav({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const pathname = usePathname();

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="absolute left-0 top-0 bottom-0 w-72 bg-bg-secondary border-r border-border animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-ice-400 to-ice-600 flex items-center justify-center">
              <Snowflake className="w-4 h-4 text-white" />
            </div>
            <span className="text-lg font-bold text-gradient-ice">Snowball</span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-bg-hover transition-colors"
          >
            <X className="w-5 h-5 text-text-secondary" />
          </button>
        </div>

        {/* Links */}
        <nav className="py-4 px-3 space-y-1 overflow-y-auto">
          {MOBILE_NAV.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== "/" && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors",
                  isActive
                    ? "bg-ice-500/10 text-ice-400 font-medium"
                    : "text-text-secondary hover:text-text-primary hover:bg-bg-hover"
                )}
              >
                {item.icon}
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
