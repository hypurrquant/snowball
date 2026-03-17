"use client";

import { TOKEN_INFO } from "@snowball/core/src/config/addresses";
import { useMorphoMarkets } from "../../morpho/hooks/useMorphoMarkets";
import { useAaveMarkets } from "../../aave/hooks/useAaveMarkets";
import type { UnifiedSupplyMarket } from "../types";

export function useUnifiedSupplyMarkets(): {
  markets: UnifiedSupplyMarket[];
  isLoading: boolean;
  refetch: () => void;
} {
  const { markets: morphoMarkets, isLoading: morphoLoading, refetch: morphoRefetch } = useMorphoMarkets();
  const { markets: aaveMarkets, isLoading: aaveLoading, refetch: aaveRefetch } = useAaveMarkets();

  const morphoUnified: UnifiedSupplyMarket[] = morphoMarkets.map((m) => {
    const tokenInfo = TOKEN_INFO[m.loanToken.toLowerCase()];
    const lltv = Number(m.lltv) / 1e18 * 100;
    return {
      protocol: "morpho",
      asset: m.loanToken,
      assetSymbol: tokenInfo?.symbol ?? m.loanSymbol,
      assetDecimals: tokenInfo?.decimals ?? 18,
      supplyAPY: m.supplyAPY,
      totalSupply: m.totalSupply,
      ltv: lltv,
      liquidationThreshold: lltv,
      isActive: true,
      raw: {
        morphoMarketId: m.id,
      },
    };
  });

  const aaveUnified: UnifiedSupplyMarket[] = aaveMarkets.map((m) => ({
    protocol: "aave",
    asset: m.underlying,
    assetSymbol: m.symbol,
    assetDecimals: m.decimals,
    supplyAPY: m.supplyAPY,
    totalSupply: m.totalSupply,
    ltv: m.ltv,
    liquidationThreshold: m.liquidationThreshold,
    isActive: m.isActive,
    raw: {
      aaveReserveAddress: m.underlying,
    },
  }));

  const markets = [...morphoUnified, ...aaveUnified].sort(
    (a, b) => b.supplyAPY - a.supplyAPY
  );

  const isLoading = morphoLoading || aaveLoading;

  function refetch() {
    morphoRefetch();
    aaveRefetch();
  }

  return { markets, isLoading, refetch };
}
