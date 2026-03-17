"use client";

import { TOKEN_INFO } from "@snowball/core/src/config/addresses";
import { useMorphoMarkets } from "../../morpho/hooks/useMorphoMarkets";
import { useAaveMarkets } from "../../aave/hooks/useAaveMarkets";
import { aprToAPY, apyToAPR } from "../lib/rateConversion";
import type { UnifiedBorrowMarket } from "../types";

export function useUnifiedBorrowMarkets(): {
  markets: UnifiedBorrowMarket[];
  isLoading: boolean;
  refetch: () => void;
} {
  const { markets: morphoMarkets, isLoading: morphoLoading, refetch: morphoRefetch } = useMorphoMarkets();
  const { markets: aaveMarkets, isLoading: aaveLoading, refetch: aaveRefetch } = useAaveMarkets();

  const morphoUnified: UnifiedBorrowMarket[] = morphoMarkets.map((m) => {
    const tokenInfo = TOKEN_INFO[m.loanToken.toLowerCase()];
    const lltv = Number(m.lltv) / 1e18 * 100;
    return {
      protocol: "morpho",
      asset: m.loanToken,
      assetSymbol: tokenInfo?.symbol ?? m.loanSymbol,
      assetDecimals: tokenInfo?.decimals ?? 18,
      borrowAPR: m.borrowAPR,
      borrowAPY: aprToAPY(m.borrowAPR),
      totalBorrow: m.totalBorrow,
      ltv: lltv,
      liquidationThreshold: lltv,
      isActive: true,
      raw: {
        morphoMarketId: m.id,
      },
    };
  });

  const aaveUnified: UnifiedBorrowMarket[] = aaveMarkets.map((m) => ({
    protocol: "aave",
    asset: m.underlying,
    assetSymbol: m.symbol,
    assetDecimals: m.decimals,
    borrowAPY: m.borrowAPY,
    borrowAPR: apyToAPR(m.borrowAPY),
    totalBorrow: m.totalBorrow,
    ltv: m.ltv,
    liquidationThreshold: m.liquidationThreshold,
    isActive: m.isActive,
    raw: {
      aaveReserveAddress: m.underlying,
    },
  }));

  const markets = [...morphoUnified, ...aaveUnified].sort(
    (a, b) => a.borrowAPY - b.borrowAPY
  );

  const isLoading = morphoLoading || aaveLoading;

  function refetch() {
    morphoRefetch();
    aaveRefetch();
  }

  return { markets, isLoading, refetch };
}
