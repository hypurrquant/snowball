"use client";

import { useState, useEffect } from "react";
import { useAccount, useReadContract, useWriteContract } from "wagmi";
import { parseEther, maxUint256 } from "viem";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { VaultData } from "@/hooks/defi/useYieldVaults";
import { ERC20ApproveABI, SnowballYieldVaultABI } from "@/abis";
import { formatTokenAmount } from "@/lib/utils";
import { useTokenBalance } from "@/hooks/useTokenBalance";

interface VaultActionDialogProps {
    vault: VaultData;
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    defaultTab: "deposit" | "withdraw";
}

export function VaultActionDialog({ vault, isOpen, onOpenChange, defaultTab }: VaultActionDialogProps) {
    const { address, isConnected } = useAccount();
    const [activeTab, setActiveTab] = useState<"deposit" | "withdraw">(defaultTab);
    const [amount, setAmount] = useState("");

    const parsedAmountStr = amount.replace(/,/g, "");

    useEffect(() => {
        if (isOpen) {
            setActiveTab(defaultTab);
            setAmount("");
        }
    }, [isOpen, defaultTab]);

    const { data: wantBalance } = useTokenBalance({
        address,
        token: vault.want,
    });

    const { data: allowance, refetch: refetchAllowance } = useReadContract({
        address: vault.want,
        abi: ERC20ApproveABI,
        functionName: "allowance",
        args: [address!, vault.address],
        query: { enabled: !!address },
    });

    const depositAmountBigInt = parsedAmountStr && !isNaN(Number(parsedAmountStr)) ? parseEther(parsedAmountStr) : 0n;
    const needsApproval = depositAmountBigInt > 0n && allowance !== undefined && allowance < depositAmountBigInt;

    const { writeContractAsync: approveAsync, isPending: isApprovePending } = useWriteContract();
    const { writeContractAsync: depositAsync, isPending: isDepositPending } = useWriteContract();
    const { writeContractAsync: withdrawAsync, isPending: isWithdrawPending } = useWriteContract();

    const handleApprove = async () => {
        try {
            if (!depositAmountBigInt) return;
            await approveAsync({
                address: vault.want,
                abi: ERC20ApproveABI,
                functionName: "approve",
                args: [vault.address, maxUint256],
            });
            await refetchAllowance();
        } catch (error) {
            console.error("Approve failed", error);
        }
    };

    const handleDeposit = async () => {
        try {
            if (!depositAmountBigInt) return;
            await depositAsync({
                address: vault.address,
                abi: SnowballYieldVaultABI,
                functionName: "deposit",
                args: [depositAmountBigInt],
            });
            setAmount("");
            onOpenChange(false);
        } catch (error) {
            console.error("Deposit failed", error);
        }
    };

    const handleWithdraw = async () => {
        try {
            if (!depositAmountBigInt) return;
            await withdrawAsync({
                address: vault.address,
                abi: SnowballYieldVaultABI,
                functionName: "withdraw",
                args: [depositAmountBigInt],
            });
            setAmount("");
            onOpenChange(false);
        } catch (error) {
            console.error("Withdraw failed", error);
        }
    };

    const receiveShareEstimate = vault.pricePerShare && vault.pricePerShare > 0n && depositAmountBigInt > 0n
        ? (depositAmountBigInt * 1000000000000000000n) / vault.pricePerShare
        : 0n;

    const receiveWantEstimate = vault.pricePerShare && depositAmountBigInt > 0n
        ? (depositAmountBigInt * vault.pricePerShare) / 1000000000000000000n
        : 0n;

    const userShareText = vault.userShares ? formatTokenAmount(vault.userShares, 18, 4) : "0.00";

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md bg-bg-card border-border">
                <DialogHeader>
                    <DialogTitle>{vault.name}</DialogTitle>
                </DialogHeader>

                <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "deposit" | "withdraw")}>
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="deposit">Deposit</TabsTrigger>
                        <TabsTrigger value="withdraw">Withdraw</TabsTrigger>
                    </TabsList>

                    <TabsContent value="deposit" className="space-y-4 pt-4">
                        <div className="rounded-xl bg-bg-input p-3">
                            <div className="flex justify-between mb-1">
                                <span className="text-xs text-text-tertiary">Amount ({vault.wantSymbol})</span>
                                {wantBalance && (
                                    <button
                                        onClick={() => setAmount(formatTokenAmount(wantBalance.value, 18, 18).replace(/,/g, ""))}
                                        className="text-xs text-text-secondary hover:text-ice-400"
                                    >
                                        Max: {formatTokenAmount(wantBalance.value, 18, 4)}
                                    </button>
                                )}
                            </div>
                            <Input
                                type="text"
                                inputMode="decimal"
                                placeholder="0.0"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                className="border-0 bg-transparent text-lg font-mono p-0 h-auto focus-visible:ring-0"
                            />
                        </div>

                        <div className="p-3 rounded-lg bg-bg-secondary flex justify-between items-center text-sm">
                            <span className="text-text-secondary">Expected Shares</span>
                            <span className="font-mono">~{formatTokenAmount(receiveShareEstimate, 18, 4)} moo{vault.wantSymbol}</span>
                        </div>

                        {needsApproval ? (
                            <Button className="w-full" onClick={handleApprove} disabled={isApprovePending || !isConnected}>
                                {isApprovePending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Approve {vault.wantSymbol}
                            </Button>
                        ) : (
                            <Button className="w-full" onClick={handleDeposit} disabled={isDepositPending || !depositAmountBigInt || !isConnected || vault.paused}>
                                {isDepositPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                {vault.paused ? "Paused" : "Deposit"}
                            </Button>
                        )}
                    </TabsContent>

                    <TabsContent value="withdraw" className="space-y-4 pt-4">
                        <div className="rounded-xl bg-bg-input p-3">
                            <div className="flex justify-between mb-1">
                                <span className="text-xs text-text-tertiary">Amount Shares</span>
                                <button
                                    onClick={() => {
                                        if (vault.userShares) setAmount(formatTokenAmount(vault.userShares, 18, 18).replace(/,/g, ""));
                                    }}
                                    className="text-xs text-text-secondary hover:text-ice-400"
                                >
                                    Max: {userShareText}
                                </button>
                            </div>
                            <Input
                                type="text"
                                inputMode="decimal"
                                placeholder="0.0"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                className="border-0 bg-transparent text-lg font-mono p-0 h-auto focus-visible:ring-0"
                            />
                        </div>

                        <div className="p-3 rounded-lg bg-bg-secondary flex justify-between items-center text-sm mb-2">
                            <span className="text-text-secondary">Expected Returns</span>
                            <span className="font-mono">~{formatTokenAmount(receiveWantEstimate, 18, 4)} {vault.wantSymbol}</span>
                        </div>

                        <div className="flex justify-between text-xs text-text-tertiary px-1 pb-2">
                            <span>Withdrawal Fee</span>
                            <span>{vault.withdrawFee !== undefined ? `${(Number(vault.withdrawFee) / 100).toFixed(1)}%` : "0.1%"}</span>
                        </div>

                        <Button
                            className="w-full"
                            variant="secondary"
                            onClick={handleWithdraw}
                            disabled={isWithdrawPending || !depositAmountBigInt || !isConnected}
                        >
                            {isWithdrawPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Withdraw
                        </Button>
                    </TabsContent>
                </Tabs>
            </DialogContent>
        </Dialog>
    );
}
