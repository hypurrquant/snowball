"use client";

import { useState, useEffect, useMemo } from "react";
import { useAccount } from "wagmi";
import { useChainWriteContract } from "@/shared/hooks/useChainWriteContract";
import { parseEther, maxUint256 } from "viem";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/shared/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/shared/components/ui/tabs";
import { Input } from "@/shared/components/ui/input";
import { Button } from "@/shared/components/ui/button";
import { TxPipelineModal } from "@/shared/components/ui/tx-pipeline-modal";
import { useTxPipeline } from "@/shared/hooks/useTxPipeline";
import { VaultData } from "@/domains/defi/yield/hooks/useYieldVaults";
import { SnowballYieldVaultABI } from "@/core/abis";
import { formatTokenAmount } from "@/shared/lib/utils";
import { useTokenBalance } from "@/shared/hooks/useTokenBalance";
import { useTokenApproval } from "@/shared/hooks/useTokenApproval";
import { waitForTransactionReceipt } from "wagmi/actions";
import { useConfig } from "wagmi";

interface VaultActionDialogProps {
    vault: VaultData;
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    defaultTab: "deposit" | "withdraw";
}

export function VaultActionDialog({ vault, isOpen, onOpenChange, defaultTab }: VaultActionDialogProps) {
    const { address, isConnected } = useAccount();
    const config = useConfig();
    const [activeTab, setActiveTab] = useState<"deposit" | "withdraw">(defaultTab);
    const [amount, setAmount] = useState("");
    const pipeline = useTxPipeline();

    const [isWithdrawAll, setIsWithdrawAll] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setActiveTab(defaultTab);
            setAmount("");
            setIsWithdrawAll(false);
        }
    }, [isOpen, defaultTab]);

    const { data: wantBalance } = useTokenBalance({
        address,
        token: vault.want,
    });

    const parsedAmount = useMemo(() => {
        const cleaned = amount.replace(/,/g, "").trim();
        if (!cleaned) return 0n;
        try {
            return parseEther(cleaned);
        } catch {
            return null; // invalid input
        }
    }, [amount]);

    const errors = useMemo(() => {
        const errs: string[] = [];
        if (parsedAmount === null) {
            errs.push("Invalid amount");
            return errs;
        }
        if (parsedAmount === 0n) return errs;
        if (activeTab === "deposit") {
            if (wantBalance && parsedAmount > wantBalance.value) errs.push("Insufficient balance");
        } else {
            if (vault.userShares !== undefined && parsedAmount > vault.userShares) errs.push("Exceeds shares");
        }
        return errs;
    }, [parsedAmount, activeTab, wantBalance, vault.userShares]);

    const canSubmit = parsedAmount !== null && parsedAmount > 0n && errors.length === 0;
    const depositAmountBigInt = parsedAmount ?? 0n;

    const { needsApproval, approve } = useTokenApproval({
        token: vault.want,
        spender: vault.address,
        amount: depositAmountBigInt,
        owner: address,
    });

    const { writeContractAsync: depositAsync } = useChainWriteContract();
    const { writeContractAsync: withdrawAsync } = useChainWriteContract();

    const handleDeposit = async () => {
        if (!canSubmit) return;
        const steps = [];
        if (needsApproval) {
            steps.push({ id: "approve", type: "approve" as const, label: `Approve ${vault.wantSymbol}` });
        }
        steps.push({ id: "deposit", type: "deposit" as const, label: "Deposit" });

        const executors: Record<string, () => Promise<`0x${string}` | undefined>> = {};
        if (needsApproval) {
            executors.approve = async () => {
                const h = await approve(maxUint256);
                return h as `0x${string}` | undefined;
            };
        }
        executors.deposit = async () => {
            const hash = await depositAsync({
                address: vault.address,
                abi: SnowballYieldVaultABI,
                functionName: "deposit",
                args: [depositAmountBigInt],
            });
            await waitForTransactionReceipt(config, { hash });
            return hash;
        };

        await pipeline.run(steps, executors);
        setAmount("");
    };

    const handleWithdraw = async () => {
        if (!canSubmit && !isWithdrawAll) return;
        await pipeline.run(
            [{ id: "withdraw", type: "withdraw" as const, label: isWithdrawAll ? "Withdraw All" : "Withdraw" }],
            {
                withdraw: async () => {
                    const hash = isWithdrawAll
                        ? await withdrawAsync({
                            address: vault.address,
                            abi: SnowballYieldVaultABI,
                            functionName: "withdrawAll",
                          })
                        : await withdrawAsync({
                            address: vault.address,
                            abi: SnowballYieldVaultABI,
                            functionName: "withdraw",
                            args: [depositAmountBigInt],
                          });
                    await waitForTransactionReceipt(config, { hash });
                    return hash;
                },
            },
        );
        setAmount("");
        setIsWithdrawAll(false);
    };

    const receiveShareEstimate = vault.pricePerShare && vault.pricePerShare > 0n && depositAmountBigInt > 0n
        ? (depositAmountBigInt * 1000000000000000000n) / vault.pricePerShare
        : 0n;

    const receiveWantEstimate = vault.pricePerShare && depositAmountBigInt > 0n
        ? (depositAmountBigInt * vault.pricePerShare) / 1000000000000000000n
        : 0n;

    const userShareText = vault.userShares ? formatTokenAmount(vault.userShares, 18, 4) : "0.00";

    return (
        <>
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

                            {activeTab === "deposit" && errors.length > 0 && (
                                <p className="text-xs text-red-400 px-1">{errors[0]}</p>
                            )}

                            <Button className="w-full" onClick={handleDeposit} disabled={!canSubmit || !isConnected || vault.paused}>
                                {vault.paused ? "Paused" : "Deposit"}
                            </Button>
                        </TabsContent>

                        <TabsContent value="withdraw" className="space-y-4 pt-4">
                            <div className="rounded-xl bg-bg-input p-3">
                                <div className="flex justify-between mb-1">
                                    <span className="text-xs text-text-tertiary">Amount Shares</span>
                                    <button
                                        onClick={() => {
                                            if (vault.userShares) {
                                                setAmount(formatTokenAmount(vault.userShares, 18, 18).replace(/,/g, ""));
                                                setIsWithdrawAll(true);
                                            }
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
                                    onChange={(e) => { setAmount(e.target.value); setIsWithdrawAll(false); }}
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

                            {activeTab === "withdraw" && errors.length > 0 && (
                                <p className="text-xs text-red-400 px-1">{errors[0]}</p>
                            )}

                            <Button
                                className="w-full"
                                variant="secondary"
                                onClick={handleWithdraw}
                                disabled={!canSubmit || !isConnected}
                            >
                                {isWithdrawAll ? "Withdraw All" : "Withdraw"}
                            </Button>
                        </TabsContent>
                    </Tabs>
                </DialogContent>
            </Dialog>

            <TxPipelineModal
                open={pipeline.showTxModal}
                onClose={() => {
                    if (pipeline.txPhase === "complete") onOpenChange(false);
                    pipeline.reset();
                }}
                steps={pipeline.txSteps}
                phase={pipeline.txPhase}
                title={vault.name}
            />
        </>
    );
}
