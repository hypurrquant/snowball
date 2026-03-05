"use client";

import { useYieldVaults } from "@/hooks/defi/useYieldVaults";
import { VaultCard } from "@/components/yield/VaultCard";
import { StatCard } from "@/components/common/StatCard";
import { formatTokenAmount } from "@/lib/utils";
import { Vault, Activity, TrendingUp } from "lucide-react";

export default function YieldPage() {
    const { vaults, isLoading } = useYieldVaults();

    const activeVaultsCount = vaults.filter(v => !v.paused).length;

    // Naive sum of TVL for demonstration purposes
    const totalTvl = vaults.reduce((acc, vault) => {
        if (vault.tvl) {
            return acc + vault.tvl;
        }
        return acc;
    }, 0n);

    const avgPricePerShare = vaults.length > 0
        ? vaults.reduce((acc, vault) => acc + (vault.pricePerShare || 1000000000000000000n), 0n) / BigInt(vaults.length)
        : 1000000000000000000n;

    return (
        <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
            <div className="space-y-1">
                <h1 className="text-2xl font-bold">Yield Vaults</h1>
                <p className="text-text-secondary">Auto-compound your DeFi yields</p>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                <StatCard
                    label="Total Deposits (Raw)"
                    value={isLoading ? "..." : formatTokenAmount(totalTvl, 18, 2)}
                    icon={<Vault className="w-4 h-4" />}
                />
                <StatCard
                    label="Active Vaults"
                    value={isLoading ? "..." : activeVaultsCount.toString()}
                    icon={<Activity className="w-4 h-4" />}
                />
                <StatCard
                    label="Avg Price/Share"
                    value={isLoading ? "..." : formatTokenAmount(avgPricePerShare, 18, 4)}
                    icon={<TrendingUp className="w-4 h-4" />}
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {vaults.map((vault) => (
                    <VaultCard key={`${vault.address}-${vault.want}`} vault={vault} />
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
