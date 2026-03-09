import { YIELD } from "@/core/config/addresses";

export const STRATEGY_FEE_MULTIPLIER = 0.955; // 1 - 45/1000 (CALL_FEE=5 + STRAT_FEE=5 + TREASURY_FEE=35)

export const morphoVaults = YIELD.vaults.filter(
  (v): v is typeof v & { morphoMarketId: `0x${string}` } =>
    v.strategyType === "morpho" && "morphoMarketId" in v,
);
