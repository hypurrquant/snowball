import { useReadContracts, useAccount } from "wagmi";
import { YIELD } from "@/core/config/addresses";
import { buildVaultReadPlan, mapVaultResults } from "../lib/vaultMapper";
import type { VaultData } from "../types";

export type { VaultData };

export function useYieldVaults() {
    const { address } = useAccount();

    const { contracts, indices } = buildVaultReadPlan(YIELD.vaults, address);

    const { data, isLoading, refetch } = useReadContracts({
        contracts,
        query: { refetchInterval: 15_000 },
    });

    const vaults: VaultData[] = mapVaultResults(YIELD.vaults, data, indices);

    return { vaults, isLoading, refetch };
}
