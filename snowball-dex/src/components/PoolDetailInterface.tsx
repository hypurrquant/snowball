"use client";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Address, formatUnits } from "viem";
import { usePool } from "@/hooks/usePool";

export function PoolDetailInterface({ token0, token1 }: { token0: Address, token1: Address }) {
    const { dynamicFee, liquidity } = usePool(token0, token1);

    return (
        <div className="flex flex-col gap-6 w-full">
            <div className="flex items-center gap-4">
                <Link href="/pool">
                    <Button variant="ghost" size="icon">
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                </Link>
                <h2 className="text-2xl font-bold flex items-center gap-2">
                    <div className="flex -space-x-2">
                        <div className="w-8 h-8 rounded-full bg-accent-primary/20 border border-border" />
                        <div className="w-8 h-8 rounded-full bg-success/20 border border-border" />
                    </div>
                    Pool Details
                </h2>
                <div className="ml-auto bg-success/20 text-success px-3 py-1 rounded-full text-sm font-semibold">
                    🟢 In Range
                </div>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
                <div className="col-span-1 flex flex-col gap-6">
                    <Card className="p-6 bg-bg-card border-border">
                        <h3 className="text-lg font-semibold text-text-primary mb-2">Liquidity</h3>
                        <div className="text-3xl font-mono">
                            {liquidity != null ? formatUnits(liquidity as bigint, 18).slice(0, 10) : "0.00"} LP
                        </div>
                        <div className="text-sm text-text-secondary mt-1">
                            Dynamic Fee: {dynamicFee != null ? `${(Number(dynamicFee) / 10000).toFixed(2)}%` : "-"}
                        </div>
                    </Card>

                    <Card className="p-6 bg-bg-card border-border">
                        <h3 className="text-lg font-semibold text-text-primary mb-4">My Position</h3>
                        <div className="space-y-4">
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-text-secondary">Min Price</span>
                                <span className="font-mono">0.32</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-text-secondary">Max Price</span>
                                <span className="font-mono">0.65</span>
                            </div>
                            <div className="mt-4">
                                <h4 className="text-sm font-semibold mb-2">Unclaimed Fees</h4>
                                <div className="flex justify-between text-sm">
                                    <span>Token 0:</span>
                                    <span>0.00</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span>Token 1:</span>
                                    <span>0.00</span>
                                </div>
                            </div>
                        </div>
                        <div className="flex flex-col gap-2 mt-6">
                            <Button className="w-full bg-accent-primary hover:bg-accent-primary/90 text-bg-primary">
                                Collect Fees
                            </Button>
                            <div className="flex gap-2">
                                <Button variant="outline" className="flex-1 border-border">
                                    Increase
                                </Button>
                                <Button variant="outline" className="flex-1 border-error text-error hover:bg-error/10">
                                    Remove
                                </Button>
                            </div>
                        </div>
                    </Card>
                </div>

                <div className="col-span-2">
                    <Card className="h-full min-h-[400px] p-6 bg-bg-card border-border flex flex-col items-center justify-center text-text-secondary">
                        <p>[ Price Chart Visualization Here ]</p>
                        <p className="text-sm mt-2 opacity-50">(Requires TradingView Lightweight Charts integration)</p>
                    </Card>
                </div>
            </div>
        </div>
    );
}
