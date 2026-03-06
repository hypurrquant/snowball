import { useMemo } from "react";
import { computeCR, liquidationPrice } from "../lib/liquityMath";

const WAD = 10n ** 18n;
const DAYS_7 = 7n;
const DAYS_365 = 365n;

export interface PositionPreview {
  cr: number;
  liquidationPrice: bigint;
  upfrontFee: bigint;
  annualCost: bigint;
  maxBorrow: bigint;
  isAboveMCR: boolean;
  isAboveCCR: boolean;
  crColor: string;
}

export function usePositionPreview(params: {
  coll: bigint;
  debt: bigint;
  rate: bigint; // 18 decimals (5% = 5e16)
  price: bigint;
  mcr: bigint;
  ccr: bigint;
}): PositionPreview {
  return useMemo(() => {
    const { coll, debt, rate, price, mcr, ccr } = params;

    const cr = debt > 0n ? computeCR(coll, debt, price) : 0;
    const liqPrice = liquidationPrice(coll, debt, mcr);

    // upfrontFee = debt * rate * 7 / 365 (all 18-decimal math)
    const upfrontFee =
      debt > 0n && rate > 0n
        ? (debt * rate * DAYS_7) / (DAYS_365 * WAD)
        : 0n;

    // annualCost = debt * rate / 1e18
    const annualCost =
      debt > 0n && rate > 0n ? (debt * rate) / WAD : 0n;

    // maxBorrow = coll * price / mcr
    const maxBorrow =
      coll > 0n && price > 0n && mcr > 0n
        ? (coll * price) / mcr
        : 0n;

    // MCR is 18 decimals (e.g. 1.1e18 = 110%)
    const mcrPct = Number(mcr) / 1e16;
    const ccrPct = Number(ccr) / 1e16;
    const isAboveMCR = cr >= mcrPct;
    const isAboveCCR = cr >= ccrPct;

    const crColor =
      cr === 0
        ? "text-text-tertiary"
        : cr >= 200
          ? "text-success"
          : cr >= 150
            ? "text-yellow-400"
            : "text-red-400";

    return {
      cr,
      liquidationPrice: liqPrice,
      upfrontFee,
      annualCost,
      maxBorrow,
      isAboveMCR,
      isAboveCCR,
      crColor,
    };
  }, [params.coll, params.debt, params.rate, params.price, params.mcr, params.ccr]);
}
