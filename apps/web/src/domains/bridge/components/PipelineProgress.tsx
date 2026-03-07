"use client";

import type { TxStep } from "@/shared/types/tx";
import { TxStepItem } from "@/shared/components/ui/tx-step-item";

interface PipelineProgressProps {
  steps: TxStep[];
}

export function PipelineProgress({ steps }: PipelineProgressProps) {
  return (
    <div className="space-y-0">
      {steps.map((step, i) => (
        <TxStepItem
          key={step.id}
          step={step}
          stepNumber={i + 1}
          isLast={i === steps.length - 1}
        />
      ))}
    </div>
  );
}
