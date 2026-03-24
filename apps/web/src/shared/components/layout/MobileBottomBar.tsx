"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/shared/lib/utils";
import { Landmark, Building2, ArrowLeftRight, LayoutDashboard, Zap } from "lucide-react";

const BOTTOM_NAV = [
  { href: "/earn/supply", label: "Earn", icon: Landmark },
  { href: "/liquity/borrow", label: "Borrow", icon: Building2 },
  { href: "/swap", label: "Swap", icon: ArrowLeftRight },
  { href: "/hyperevm", label: "HyperEVM", icon: Zap },
  { href: "/dashboard", label: "Manage", icon: LayoutDashboard },
] as const;

export function MobileBottomBar() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 md:hidden bg-bg-card/90 backdrop-blur-xl border-t border-border pb-safe">
      <div className="flex items-stretch">
        {BOTTOM_NAV.map(({ href, label, icon: Icon }) => {
          const isActive =
            pathname === href || pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex flex-1 flex-col items-center justify-center gap-1 py-2 min-h-[56px] text-xs transition-colors",
                isActive
                  ? "text-ice-400"
                  : "text-text-secondary hover:text-text-primary"
              )}
            >
              <Icon className={cn("w-5 h-5", isActive && "text-ice-400")} />
              <span>{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
