"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ForwardOverview } from "@/domains/defi/forward/components/ForwardOverview";
import { TrendingUp } from "lucide-react";

const TABS = [
  { href: "/forward/trade", label: "Trade" },
  { href: "/forward/positions", label: "Positions" },
  { href: "/forward/marketplace", label: "Marketplace" },
];

export default function ForwardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 relative space-y-6">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-2xl h-[300px] bg-ice-400/5 rounded-[100%] blur-[100px] pointer-events-none -z-10" />

      <h1 className="text-2xl font-bold flex items-center gap-2 text-white">
        <TrendingUp className="w-6 h-6 text-emerald-400" />
        ForwardX
      </h1>

      <ForwardOverview />

      <div className="flex gap-1 bg-slate-800/40 rounded-lg p-1 w-fit">
        {TABS.map((tab) => (
          <Link
            key={tab.href}
            href={tab.href}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              pathname === tab.href
                ? "bg-slate-700 text-white"
                : "text-slate-400 hover:text-white"
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      {children}
    </div>
  );
}
