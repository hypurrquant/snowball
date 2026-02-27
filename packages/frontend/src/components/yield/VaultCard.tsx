"use client";

import { useState } from "react";
import { VaultData } from "@/hooks/defi/useYieldVaults";
import { formatTokenAmount } from "@/lib/utils";
import { Vault, TrendingUp, Clock } from "lucide-react";
import {
    Card,
    CardHeader,
    CardTitle,
    CardDescription,
    CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { VaultActionDialog } from "./VaultActionDialog";

interface VaultCardProps {
    vault: VaultData;
}

export function VaultCard({ vault }: VaultCardProps) {
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [dialogDefaultTab, setDialogDefaultTab] = useState<"deposit" | "withdraw">("deposit");

    const pricePerShareFormatted = vault.pricePerShare
        ? formatTokenAmount(vault.pricePerShare, 18, 4)
        : "1.0000";

    const tvlFormatted = vault.tvl !== undefined
        ? formatTokenAmount(vault.tvl, 18, 2)
        : "—";

    const userDepositFormatted = vault.userShares !== undefined && vault.pricePerShare !== undefined
        ? formatTokenAmount((vault.userShares * vault.pricePerShare) / 1000000000000000000n, 18, 2)
        : "0.00";

    const timeSinceHarvest = () => {
        if (!vault.lastHarvest || vault.lastHarvest === 0n) return "Never";
        const diff = Math.floor(Date.now() / 1000) - Number(vault.lastHarvest);
        if (diff < 60) return `${diff}s ago`;
        if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
        if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
        return `${Math.floor(diff / 86400)}d ago`;
    };

    const withdrawFeeFormatted = vault.withdrawFee !== undefined
        ? `${(Number(vault.withdrawFee) / 100).toFixed(1)}%`
        : "—";

    return (
        <>
            <Card className="bg-bg-card border border-border-hover/40 rounded-2xl flex flex-col h-full">
                <CardHeader className="pb-4">
                    <div className="flex justify-between items-start">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-ice-500/10 flex items-center justify-center">
                                <Vault className="w-5 h-5 text-ice-400" />
                            </div>
                            <div>
                                <CardTitle className="text-lg flex items-center gap-2">
                                    {vault.name}
                                    {vault.paused && <Badge variant="destructive">Paused</Badge>}
                                </CardTitle>
                                <CardDescription className="text-sm">
                                    {vault.description}
                                </CardDescription>
                            </div>
                        </div>
                    </div>
                </CardHeader>

                <CardContent className="flex-1 flex flex-col justify-end space-y-5">
                    <div className="grid grid-cols-3 gap-2 py-3 border-y border-border/50">
                        <div>
                            <div className="text-xs text-text-tertiary mb-1">TVL</div>
                            <div className="text-sm font-medium">
                                {tvlFormatted} <span className="text-xs text-text-secondary">{vault.wantSymbol}</span>
                            </div>
                        </div>
                        <div>
                            <div className="text-xs text-text-tertiary mb-1 flex items-center gap-1">
                                <TrendingUp className="w-3 h-3" /> Price/Share
                            </div>
                            <div className="text-sm font-medium">{pricePerShareFormatted}</div>
                        </div>
                        <div>
                            <div className="text-xs text-text-tertiary mb-1">Your Deposit</div>
                            <div className="text-sm font-medium">
                                {userDepositFormatted} <span className="text-xs text-text-secondary">{vault.wantSymbol}</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-between text-xs text-text-secondary">
                        <div className="flex items-center gap-1">
                            <Clock className="w-3 h-3" /> Last Harvest: {timeSinceHarvest()}
                        </div>
                        <div>Fee: {withdrawFeeFormatted}</div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 pt-2">
                        <Button
                            onClick={() => {
                                setDialogDefaultTab("deposit");
                                setIsDialogOpen(true);
                            }}
                            disabled={vault.paused}
                        >
                            Deposit
                        </Button>
                        <Button
                            variant="secondary"
                            onClick={() => {
                                setDialogDefaultTab("withdraw");
                                setIsDialogOpen(true);
                            }}
                            disabled={vault.userShares === undefined || vault.userShares === 0n}
                        >
                            Withdraw
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {isDialogOpen && (
                <VaultActionDialog
                    vault={vault}
                    isOpen={isDialogOpen}
                    onOpenChange={setIsDialogOpen}
                    defaultTab={dialogDefaultTab}
                />
            )}
        </>
    );
}
