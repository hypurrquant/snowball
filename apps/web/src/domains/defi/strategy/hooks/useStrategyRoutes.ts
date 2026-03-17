"use client";

import { useMemo } from "react";
import { useMorphoMarkets } from "../../morpho/hooks/useMorphoMarkets";
import { useAaveMarkets } from "../../aave/hooks/useAaveMarkets";
import { useYieldVaults } from "../../yield/hooks/useYieldVaults";
import { useYieldVaultAPY } from "../../yield/hooks/useYieldVaultAPY";
import { calculatePaths } from "../lib/pathCalculator";
import type { YieldPath } from "../types";
import type { Address } from "viem";

export function useStrategyRoutes(
  asset: Address | undefined,
  amount: bigint,
): { paths: YieldPath[]; isLoading: boolean; error: string | null } {
  const { markets: morphoMarkets, isLoading: morphoLoading, refetch: morphoRefetch } = useMorphoMarkets();
  const { markets: aaveMarkets, isLoading: aaveLoading, refetch: aaveRefetch } = useAaveMarkets();
  const { vaults, isLoading: vaultsLoading, refetch: vaultsRefetch } = useYieldVaults();
  const vaultAPYs = useYieldVaultAPY();

  const isLoading = morphoLoading || aaveLoading || vaultsLoading;

  const paths: YieldPath[] = useMemo(() => {
    if (!asset || amount === 0n || isLoading) return [];

    return calculatePaths(asset, amount, {
      morphoMarkets,
      aaveMarkets,
      vaults,
      vaultAPYs,
    });
  }, [asset, amount, morphoMarkets, aaveMarkets, vaults, vaultAPYs, isLoading]);

  function refetch() {
    morphoRefetch();
    aaveRefetch();
    vaultsRefetch();
  }

  return { paths, isLoading, error: null };
}
