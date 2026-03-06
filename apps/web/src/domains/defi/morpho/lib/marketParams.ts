import type { Address } from "viem";
import { TOKENS, LEND } from "@/core/config/addresses";

interface MarketConfig {
  loanToken: Address;
  collateralToken: Address;
  lltv: bigint;
}

interface MarketParams {
  loanToken: Address;
  collateralToken: Address;
  oracle: Address;
  irm: Address;
  lltv: bigint;
}

const oracleMap: Record<string, Address> = {
  [TOKENS.wCTC]: LEND.oracles.wCTC,
  [TOKENS.lstCTC]: LEND.oracles.lstCTC,
  [TOKENS.sbUSD]: LEND.oracles.sbUSD,
};

export function getMarketParams(market: MarketConfig): MarketParams {
  return {
    loanToken: market.loanToken,
    collateralToken: market.collateralToken,
    oracle: oracleMap[market.collateralToken] ?? LEND.oracles.wCTC,
    irm: LEND.adaptiveCurveIRM,
    lltv: market.lltv,
  };
}
