"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/shared/lib/utils";
import { X } from "lucide-react";
import Image from "next/image";
import { NAV_GROUPS } from "@/shared/config/nav";

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
            <Image src="/snowball-logo.png" alt="Snowball" width={32} height={32} className="rounded-lg brightness-0 invert" />
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
          {NAV_GROUPS.flatMap((g) => g.items).map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== "/" && pathname.startsWith(item.href)) ||
              (item.matchPaths?.some((p) => pathname.startsWith(p)) ?? false);
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
                {item.icon("w-5 h-5")}
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
