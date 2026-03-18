"use client";

import Link from "next/link";
import { ArrowRight, X, Lightbulb } from "lucide-react";
import { Badge } from "@/shared/components/ui/badge";
import { cn } from "@/shared/lib/utils";

export interface NextAction {
  label: string;
  description: string;
  href: string;
  protocol?: string;
}

export interface NextActionBannerProps {
  title: string;
  actions: NextAction[];
  strategyLink?: string;
  onDismiss?: () => void;
  className?: string;
}

export function NextActionBanner({
  title,
  actions,
  strategyLink,
  onDismiss,
  className,
}: NextActionBannerProps) {
  return (
    <div
      className={cn(
        "relative w-full max-w-lg rounded-2xl border border-border-hover/40 bg-bg-card",
        "border-l-4 border-l-ice-400",
        "shadow-[0_0_20px_rgba(96,165,250,0.12)]",
        "p-4 animate-slide-up",
        className
      )}
    >
      {/* Dismiss button */}
      {onDismiss && (
        <button
          onClick={onDismiss}
          className="absolute top-3 right-3 rounded-lg p-1 text-text-tertiary hover:text-text-primary hover:bg-bg-hover transition-colors"
          aria-label="닫기"
        >
          <X className="h-4 w-4" />
        </button>
      )}

      {/* Title */}
      <div className="flex items-center gap-2 mb-3 pr-6">
        <Lightbulb className="h-4 w-4 text-ice-400 shrink-0" />
        <p className="text-sm font-medium text-text-primary">{title}</p>
      </div>

      {/* Action list */}
      <ul className="space-y-2 mb-4">
        {actions.map((action) => (
          <li key={action.href + action.label}>
            <Link
              href={action.href}
              className="flex items-center justify-between gap-3 rounded-xl px-3 py-2 hover:bg-bg-hover transition-colors group"
            >
              <div className="flex items-center gap-2 min-w-0">
                <ArrowRight className="h-3.5 w-3.5 text-ice-400 shrink-0 group-hover:translate-x-0.5 transition-transform" />
                <span className="text-sm text-text-primary font-medium truncate">
                  {action.label}
                </span>
                {action.protocol && (
                  <Badge variant="default" className="shrink-0 text-[10px] px-1.5 py-0">
                    {action.protocol}
                  </Badge>
                )}
              </div>
              <span className="text-xs text-text-secondary shrink-0">
                {action.description}
              </span>
            </Link>
          </li>
        ))}
      </ul>

      {/* Footer */}
      {strategyLink && (
        <div className="pt-3 border-t border-border/50">
          <Link
            href={strategyLink}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-ice-400 hover:text-ice-300 transition-colors"
          >
            최적 경로 찾기
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      )}
    </div>
  );
}
