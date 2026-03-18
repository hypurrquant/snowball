"use client";

import Link from "next/link";
import { X, Bot } from "lucide-react";
import { cn } from "@/shared/lib/utils";

export interface OpportunityToastProps {
  toastId: number | string;
  title: string;
  description: string;
  directAction: { label: string; href: string };
  agentAction: { label: string; href: string };
  onDismiss: () => void;
}

export function OpportunityToast({
  title,
  description,
  directAction,
  agentAction,
  onDismiss,
}: OpportunityToastProps) {
  return (
    <div
      className={cn(
        "relative w-full max-w-sm rounded-2xl border border-border-hover/40 bg-bg-card",
        "border-l-4 border-l-ice-400",
        "shadow-[0_0_20px_rgba(96,165,250,0.12)]",
        "p-4"
      )}
    >
      {/* Dismiss */}
      <button
        onClick={onDismiss}
        className="absolute top-3 right-3 rounded-lg p-1 text-text-tertiary hover:text-text-primary hover:bg-bg-hover transition-colors"
        aria-label="닫기"
      >
        <X className="h-4 w-4" />
      </button>

      {/* Title */}
      <p className="text-sm font-semibold text-text-primary pr-6 mb-1">
        {title}
      </p>

      {/* Description */}
      <p className="text-xs text-text-secondary mb-3 leading-relaxed">
        {description}
      </p>

      {/* CTA row */}
      <div className="flex items-center gap-2">
        <Link
          href={directAction.href}
          className="flex-1 text-center text-xs font-medium rounded-xl px-3 py-1.5 bg-ice-400/10 text-ice-400 hover:bg-ice-400/20 transition-colors border border-ice-400/30"
        >
          {directAction.label}
        </Link>
        <Link
          href={agentAction.href}
          className="flex items-center gap-1 text-xs font-medium rounded-xl px-3 py-1.5 bg-bg-hover text-text-secondary hover:text-text-primary transition-colors border border-border/50"
        >
          <Bot className="h-3 w-3 shrink-0" />
          {agentAction.label}
        </Link>
      </div>
    </div>
  );
}
