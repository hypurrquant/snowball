import { useMemo } from "react";
import {
  computePositionPreview,
  type PositionPreviewInput,
  type PositionPreviewResult,
} from "../lib/liquityMath";

export interface PositionPreview extends PositionPreviewResult {
  crColor: string;
}

export function usePositionPreview(params: PositionPreviewInput): PositionPreview {
  return useMemo(() => {
    const result = computePositionPreview(params);

    const crColor =
      result.cr === 0
        ? "text-text-tertiary"
        : result.cr >= 200
          ? "text-success"
          : result.cr >= 150
            ? "text-yellow-400"
            : "text-red-400";

    return { ...result, crColor };
  }, [params.coll, params.debt, params.rate, params.price, params.mcr, params.ccr]);
}
