"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TOKENS } from "@/config/contracts";
import { useAddLiquidity } from "@/hooks/useAddLiquidity";
import { ChevronDown, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Address, parseUnits } from "viem";

export function AddLiquidityInterface() {
    const [token0, setToken0] = useState<Address>(TOKENS.wCTC);
    const [token1, setToken1] = useState<Address>(TOKENS.USDC);
    const [minPrice, setMinPrice] = useState("0.32");
    const [maxPrice, setMaxPrice] = useState("0.65");
    const [amount0, setAmount0] = useState("");
    const [amount1, setAmount1] = useState("");

    const { mint, isMintPending, approveToken, isApprovePending } = useAddLiquidity();

    const handleAddLiquidity = async () => {
        if (!amount0 || !amount1) return;
        const p0 = parseUnits(amount0, 18);
        const p1 = parseUnits(amount1, 6);
        await approveToken(token0, p0);
        await approveToken(token1, p1);
        await mint({
            token0,
            token1,
            tickLower: -887220,
            tickUpper: 887220,
            amount0Desired: p0,
            amount1Desired: p1,
            slippageTolerance: 0.5,
        });
    };

    return (
        <div className="flex flex-col md:flex-row gap-6 w-full max-w-5xl mx-auto">
            <div className="flex-1 flex flex-col gap-6">
                <div className="flex items-center gap-4">
                    <Link href="/pool">
                        <Button variant="ghost" size="icon">
                            <ArrowLeft className="h-5 w-5" />
                        </Button>
                    </Link>
                    <h2 className="text-2xl font-bold">Add Liquidity</h2>
                </div>

                <Card className="p-6 bg-bg-card border-border">
                    <h3 className="text-lg font-semibold mb-4">Step 1: Select Pair</h3>
                    <div className="flex gap-4">
                        <Button variant="secondary" className="flex-1 justify-between h-12">
                            wCTC <ChevronDown className="h-4 w-4" />
                        </Button>
                        <Button variant="secondary" className="flex-1 justify-between h-12">
                            USDC <ChevronDown className="h-4 w-4" />
                        </Button>
                    </div>
                </Card>

                <Card className="p-6 bg-bg-card border-border">
                    <h3 className="text-lg font-semibold mb-4">Step 2: Price Range</h3>
                    <div className="grid grid-cols-4 gap-2 mb-6">
                        <Button variant="outline" className="bg-accent-primary/10 text-accent-primary border-accent-primary">Full</Button>
                        <Button variant="outline" className="border-border">Safe</Button>
                        <Button variant="outline" className="border-border">Common</Button>
                        <Button variant="outline" className="border-border">Expert</Button>
                    </div>
                    <div className="flex gap-4">
                        <div className="flex-1 bg-bg-input rounded-xl p-3 text-center">
                            <div className="text-xs text-text-secondary mb-1">Min Price</div>
                            <Input className="text-center font-mono text-lg bg-transparent border-none" value={minPrice} onChange={e => setMinPrice(e.target.value)} />
                        </div>
                        <div className="flex-1 bg-bg-input rounded-xl p-3 text-center">
                            <div className="text-xs text-text-secondary mb-1">Max Price</div>
                            <Input className="text-center font-mono text-lg bg-transparent border-none" value={maxPrice} onChange={e => setMaxPrice(e.target.value)} />
                        </div>
                    </div>
                </Card>

                <Card className="p-6 bg-bg-card border-border">
                    <h3 className="text-lg font-semibold mb-4">Step 3: Deposit Amounts</h3>
                    <div className="space-y-4">
                        <div className="bg-bg-input rounded-xl p-4 flex gap-2 w-full">
                            <Input placeholder="0.0" className="bg-transparent border-none text-2xl p-0 w-full" value={amount0} onChange={e => setAmount0(e.target.value)} />
                            <Button variant="secondary" size="sm" className="ml-2 w-16">wCTC</Button>
                        </div>
                        <div className="bg-bg-input rounded-xl p-4 flex gap-2 w-full">
                            <Input placeholder="0.0" className="bg-transparent border-none text-2xl p-0 w-full" value={amount1} onChange={e => setAmount1(e.target.value)} />
                            <Button variant="secondary" size="sm" className="ml-2 w-16">USDC</Button>
                        </div>
                    </div>
                    <Button
                        className="w-full mt-6 h-14 bg-accent-primary text-bg-primary text-lg font-semibold"
                        onClick={handleAddLiquidity}
                        disabled={isMintPending || isApprovePending}
                    >
                        {isApprovePending ? "Approving..." : isMintPending ? "Adding Liquidity..." : "Add Liquidity"}
                    </Button>
                </Card>
            </div>

            <div className="w-full md:w-[360px]">
                <Card className="p-6 bg-bg-card border-border sticky top-24">
                    <h3 className="font-semibold mb-4 text-text-primary">Preview</h3>
                    <div className="space-y-2 text-sm text-text-secondary">
                        <p>Deposit: {amount0 || "0"} wCTC + {amount1 || "0"} USDC</p>
                        <p>Range: {minPrice} - {maxPrice} USDC/wCTC</p>
                        <p className="text-success mt-2">Estimated APR: ~68%</p>
                    </div>
                </Card>
            </div>
        </div>
    );
}
