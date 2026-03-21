"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { cn } from "@/shared/lib/utils";
import Image from "next/image";
import { PanelLeftClose, PanelLeft } from "lucide-react";
import { NAV_GROUPS } from "@/shared/config/nav";

export function Sidebar() {
  const pathname = usePathname();
  const [pinned, setPinned] = useState(false);
  const [hovered, setHovered] = useState(false);

  const expanded = pinned || hovered;

  return (
    <aside
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={cn(
        "hidden lg:flex flex-col h-screen border-r border-white/[0.06] sticky top-0 backdrop-blur-xl bg-[rgba(10,11,20,0.55)] transition-all duration-200 overflow-hidden",
        expanded ? "w-60" : "w-14"
      )}
    >
      {/* Logo */}
      <Link href="/" className={cn("flex items-center h-14 border-b border-white/[0.06] shrink-0", expanded ? "px-5 gap-2.5" : "justify-center")}>
        <Image src="/snowball-logo.png" alt="Snowball" width={28} height={28} className="rounded-lg brightness-0 invert shrink-0" />
        {expanded && (
          <span className="text-lg font-bold text-gradient-ice whitespace-nowrap">Snowball</span>
        )}
      </Link>

      {/* Nav Groups */}
      <nav className={cn("flex-1 overflow-y-auto py-4 space-y-5", expanded ? "px-3" : "px-1.5")}>
        {NAV_GROUPS.map((group) => (
          <div key={group.title}>
            {expanded && (
              <div className="section-title px-2 mb-1">{group.title}</div>
            )}
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
                      title={expanded ? undefined : item.label}
                      className={cn(
                        "flex items-center rounded-lg text-sm transition-colors",
                        expanded ? "gap-3 px-3 py-2" : "justify-center px-0 py-2",
                        isActive
                          ? "bg-ice-500/10 text-ice-400 font-medium"
                          : "text-text-secondary hover:text-text-primary hover:bg-bg-hover"
                      )}
                    >
                      {item.icon(cn("shrink-0", expanded ? "w-4 h-4" : "w-5 h-5"))}
                      {expanded && <span className="whitespace-nowrap">{item.label}</span>}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className={cn("border-t border-white/[0.06] shrink-0", expanded ? "px-3 py-3" : "px-1.5 py-3")}>
        {/* Pin toggle */}
        <button
          onClick={() => setPinned(!pinned)}
          title={pinned ? "Collapse sidebar" : "Pin sidebar open"}
          className={cn(
            "flex items-center rounded-lg text-xs text-text-tertiary hover:text-text-primary hover:bg-bg-hover transition-colors",
            expanded ? "gap-2 px-3 py-2 w-full" : "justify-center py-2 w-full"
          )}
        >
          {pinned ? (
            <PanelLeftClose className="w-4 h-4 shrink-0" />
          ) : (
            <PanelLeft className="w-4 h-4 shrink-0" />
          )}
          {expanded && <span className="whitespace-nowrap">{pinned ? "Collapse" : "Pin open"}</span>}
        </button>

        {/* Network indicator */}
        {expanded && (
          <div className="flex items-center gap-2 text-xs text-text-tertiary mt-2 px-3">
            <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
            Creditcoin Testnet
          </div>
        )}
      </div>
    </aside>
  );
}
