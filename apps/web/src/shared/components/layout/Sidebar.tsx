"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/shared/lib/utils";
import Image from "next/image";
import { NAV_GROUPS } from "@/shared/config/nav";

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden lg:flex flex-col w-60 h-screen border-r border-white/[0.06] sticky top-0 backdrop-blur-xl bg-[rgba(10,11,20,0.55)]">
      {/* Logo */}
      <Link href="/" className="flex items-center gap-2.5 px-5 h-14 border-b border-white/[0.06]">
        <Image src="/snowball-logo.png" alt="Snowball" width={32} height={32} className="rounded-lg brightness-0 invert" />
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
                  (item.href !== "/" && pathname.startsWith(item.href)) ||
                  (item.matchPaths?.some((p) => pathname.startsWith(p)) ?? false);
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
                      {item.icon("w-4 h-4")}
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
      <div className="px-4 py-3 border-t border-white/[0.06]">
        <div className="flex items-center gap-2 text-xs text-text-tertiary">
          <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
          Creditcoin Testnet
        </div>
      </div>
    </aside>
  );
}
