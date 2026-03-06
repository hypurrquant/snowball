"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

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
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
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
