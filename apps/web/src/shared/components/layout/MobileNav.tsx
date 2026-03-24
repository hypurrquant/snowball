"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/shared/lib/utils";
import { X } from "lucide-react";
import Image from "next/image";
import { NAV_GROUPS } from "@/shared/config/nav";
import { useEffect, useState } from "react";

export function MobileNav({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const pathname = usePathname();
  // Drive CSS transition: mounted=true one frame after open becomes true
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (open) {
      const raf = requestAnimationFrame(() => setMounted(true));
      return () => cancelAnimationFrame(raf);
    } else {
      setMounted(false);
    }
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      {/* Backdrop */}
      <div
        className={cn(
          "absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300",
          mounted ? "opacity-100" : "opacity-0"
        )}
        onClick={onClose}
      />

      {/* Drawer — slides in from left */}
      <div
        className={cn(
          "absolute left-0 top-0 bottom-0 w-72 bg-bg-secondary border-r border-border transition-transform duration-300 ease-out",
          mounted ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div className="flex items-center gap-2.5">
            <Image src="/snowball-logo.png" alt="Snowball" width={32} height={32} className="rounded-lg brightness-0 invert" />
            <span className="text-lg font-bold text-gradient-ice">Snowball</span>
          </div>
          <button
            onClick={onClose}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg hover:bg-bg-hover transition-colors"
          >
            <X className="w-5 h-5 text-text-secondary" />
          </button>
        </div>

        {/* Grouped Links */}
        <nav className="py-4 px-3 space-y-5 overflow-y-auto">
          {NAV_GROUPS.map((group) => (
            <div key={group.title}>
              <div className="section-title px-2 mb-1">{group.title}</div>
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
                        onClick={onClose}
                        className={cn(
                          "flex items-center gap-3 px-3 py-3 min-h-[44px] rounded-lg text-sm transition-colors",
                          isActive
                            ? "bg-ice-500/10 text-ice-400 font-medium"
                            : "text-text-secondary hover:text-text-primary hover:bg-bg-hover"
                        )}
                      >
                        {item.icon("w-5 h-5")}
                        {item.label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>
      </div>
    </div>
  );
}
