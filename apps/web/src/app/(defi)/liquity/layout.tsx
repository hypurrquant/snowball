"use client";

import { Suspense } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

const TABS = [
  { href: "/liquity/borrow", label: "Borrow" },
  { href: "/liquity/earn", label: "Earn" },
];

const BRANCHES = [
  { key: "wCTC", label: "wCTC" },
  { key: "lstCTC", label: "lstCTC" },
];

function LiquityNav({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const branch = searchParams.get("branch") ?? "wCTC";

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      {/* Branch selector */}
      <div className="flex items-center gap-4">
        <div className="flex gap-1 rounded-lg bg-bg-card/60 p-1 border border-border">
          {BRANCHES.map((b) => (
            <Link
              key={b.key}
              href={`${pathname}?branch=${b.key}`}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                branch === b.key
                  ? "bg-ice-400/20 text-ice-400"
                  : "text-text-secondary hover:text-white"
              }`}
            >
              {b.label}
            </Link>
          ))}
        </div>
      </div>

      {/* Tab navigation */}
      <div className="flex gap-1 border-b border-border">
        {TABS.map((tab) => {
          const isActive = pathname === tab.href;
          return (
            <Link
              key={tab.href}
              href={`${tab.href}?branch=${branch}`}
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

export default function LiquityLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense>
      <LiquityNav>{children}</LiquityNav>
    </Suspense>
  );
}
