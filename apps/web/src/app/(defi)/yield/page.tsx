"use client";

import { useYieldVaults } from "@/domains/defi/yield/hooks/useYieldVaults";
import { useYieldVaultAPY } from "@/domains/defi/yield/hooks/useYieldVaultAPY";
import { VaultCard } from "@/domains/defi/yield/components/VaultCard";
import { StatCard } from "@/shared/components/common/StatCard";
import { formatUSD } from "@/shared/lib/utils";
import { TOKEN_INFO } from "@/core/config/addresses";
import { formatUnits } from "viem";
import { Vault, Activity, TrendingUp } from "lucide-react";

function tvlToUsd(tvl: bigint | undefined, want: string): number {
    if (!tvl) return 0;
    const info = TOKEN_INFO[want.toLowerCase()];
    const price = info?.mockPriceUsd ?? 0;
    return Number(formatUnits(tvl, 18)) * price;
}

export default function YieldPage() {
    const { vaults, isLoading } = useYieldVaults();
    const apyMap = useYieldVaultAPY();

    const activeVaultsCount = vaults.filter(v => !v.paused).length;

    const totalTvlUsd = vaults.reduce((acc, vault) => acc + tvlToUsd(vault.tvl, vault.want), 0);

    const hasAnyReadyApy = vaults.some((v) => apyMap[v.address]?.kind === "ready");
    const bestApy = vaults.reduce((best, vault) => {
        const state = apyMap[vault.address];
        if (state?.kind === "ready" && state.value > best) return state.value;
        return best;
    }, 0);

    return (
        <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
            <div className="space-y-1">
                <h1 className="text-2xl font-bold">Yield Vaults</h1>
                <p className="text-text-secondary">Auto-compound your DeFi yields</p>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                <StatCard
                    label="Total Deposits"
                    value={formatUSD(totalTvlUsd)}
                    icon={<Vault className="w-4 h-4" />}
                    loading={isLoading}
                />
                <StatCard
                    label="Active Vaults"
                    value={activeVaultsCount.toString()}
                    icon={<Activity className="w-4 h-4" />}
                    loading={isLoading}
                />
                <StatCard
                    label="Best APY"
                    value={hasAnyReadyApy ? `${bestApy.toFixed(2)}%` : "—"}
                    icon={<TrendingUp className="w-4 h-4" />}
                    loading={isLoading}
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {vaults.map((vault) => (
                    <VaultCard
                        key={`${vault.address}-${vault.want}`}
                        vault={vault}
                        apyState={apyMap[vault.address]}
                        tvlUsd={tvlToUsd(vault.tvl, vault.want)}
                        loading={isLoading}
                    />
                ))}
            </div>

            {vaults.length === 0 && !isLoading && (
                <div className="text-center py-12 text-text-tertiary">
                    No vaults available at the moment.
                </div>
            )}
        </div>
    );
}
