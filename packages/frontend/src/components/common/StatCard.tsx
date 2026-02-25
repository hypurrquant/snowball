"use client";

import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

interface StatCardProps {
  label: string;
  value: string;
  icon?: ReactNode;
  sub?: ReactNode;
  loading?: boolean;
  className?: string;
}

export function StatCard({
  label,
  value,
  icon,
  sub,
  loading = false,
  className,
}: StatCardProps) {
  return (
    <div className={cn("card card-hover", className)}>
      <div className="flex items-start justify-between mb-2">
        <span className="text-xs text-text-tertiary font-medium uppercase tracking-wider">
          {label}
        </span>
        {icon && (
          <div className="w-7 h-7 rounded-lg bg-ice-400/10 flex items-center justify-center text-ice-400">
            {icon}
          </div>
        )}
      </div>
      {loading ? (
        <div className="h-7 w-24 bg-bg-hover rounded-lg animate-pulse" />
      ) : (
        <div className="text-xl font-bold text-text-primary">{value}</div>
      )}
      {sub && (
        <div className="text-xs text-text-secondary mt-1">{sub}</div>
      )}
    </div>
  );
}
