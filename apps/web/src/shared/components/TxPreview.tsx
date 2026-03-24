"use client";

import { AlertTriangle, ArrowRight, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/shared/components/ui/dialog";
import { Button } from "@/shared/components/ui/button";

export interface TxPreviewChange {
  label: string;
  before: string;
  after: string;
  type: "increase" | "decrease" | "neutral";
}

export interface TxPreviewProps {
  open: boolean;
  title: string;
  changes: TxPreviewChange[];
  warnings?: string[];
  onConfirm: () => void;
  onCancel: () => void;
  isLoading?: boolean;
}

function ChangeRow({ change }: { change: TxPreviewChange }) {
  const arrowColor =
    change.type === "increase"
      ? "text-emerald-400"
      : change.type === "decrease"
        ? "text-red-400"
        : "text-text-tertiary";

  const afterColor =
    change.type === "increase"
      ? "text-emerald-400"
      : change.type === "decrease"
        ? "text-red-400"
        : "text-white";

  return (
    <div className="flex items-center justify-between py-2.5 border-b border-white/5 last:border-0">
      <span className="text-sm text-text-secondary">{change.label}</span>
      <div className="flex items-center gap-2 text-sm font-mono">
        <span className="text-text-tertiary">{change.before}</span>
        <ArrowRight className={`w-3.5 h-3.5 flex-shrink-0 ${arrowColor}`} />
        <span className={`font-medium ${afterColor}`}>{change.after}</span>
      </div>
    </div>
  );
}

export function TxPreview({
  open,
  title,
  changes,
  warnings = [],
  onConfirm,
  onCancel,
  isLoading = false,
}: TxPreviewProps) {
  return (
    <Dialog open={open} onOpenChange={(v) => !v && !isLoading && onCancel()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Transaction Preview</DialogTitle>
          <DialogDescription>{title}</DialogDescription>
        </DialogHeader>

        {/* Changes */}
        <div className="rounded-xl bg-bg-input/50 border border-white/5 px-4 py-1">
          {changes.map((c, i) => (
            <ChangeRow key={i} change={c} />
          ))}
        </div>

        {/* Warnings */}
        {warnings.length > 0 && (
          <div className="space-y-2">
            {warnings.map((w, i) => (
              <div
                key={i}
                className="flex items-start gap-2 rounded-xl bg-yellow-400/10 border border-yellow-400/20 px-3 py-2.5 text-xs text-yellow-400"
              >
                <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                <span>{w}</span>
              </div>
            ))}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 pt-1">
          <Button
            variant="secondary"
            className="flex-1"
            onClick={onCancel}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button className="flex-1" onClick={onConfirm} disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                Confirming...
              </>
            ) : (
              "Confirm TX"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
