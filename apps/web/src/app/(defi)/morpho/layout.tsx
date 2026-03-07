"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MorphoOverview } from "@/domains/defi/morpho/components/MorphoOverview";
import { Landmark } from "lucide-react";

const TABS = [
  { href: "/morpho/supply", label: "Supply" },
  { href: "/morpho/borrow", label: "Borrow" },
];

export default function MorphoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 relative space-y-6">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-2xl h-[300px] bg-ice-400/5 rounded-[100%] blur-[100px] pointer-events-none -z-10" />

      {/* Header */}
      <h1 className="text-2xl font-bold flex items-center gap-2 text-white">
        <Landmark className="w-6 h-6 text-ice-400" />
        SnowballLend
      </h1>

      {/* Protocol Overview */}
      <MorphoOverview />

      {/* Tab navigation */}
      <div className="flex gap-1 border-b border-border">
        {TABS.map((tab) => {
          const isActive = pathname === tab.href;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                isActive
                  ? "border-ice-400 text-ice-400"
                  : "border-transparent text-text-secondary hover:text-white"
              }`}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>

      {children}
    </div>
  );
}
