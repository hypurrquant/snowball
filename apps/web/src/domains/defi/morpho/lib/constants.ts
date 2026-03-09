import type { Address } from "viem";

export const ORACLE_SCALE = 10n ** 36n;
export const FALLBACK_BORROW_APR_MULTIPLIER = 0.08;
export type MarketTuple = readonly [bigint, bigint, bigint, bigint, bigint, bigint];
export type ParamsTuple = readonly [Address, Address, Address, Address, bigint];
