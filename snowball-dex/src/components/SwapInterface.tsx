"use client";

import { useState } from "react";
import { parseUnits, formatUnits, Address } from "viem";
import { useAccount, useBalance } from "wagmi";
import { ArrowDownUp, Settings, ChevronDown } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TOKENS } from "@/config/contracts";
import { useSwap } from "@/hooks/useSwap";
import { usePool } from "@/hooks/usePool";

export function SwapInterface() {
    const { isConnected, address } = useAccount();
    const [tokenIn, setTokenIn] = useState<Address>(TOKENS.wCTC);
    const [tokenOut, setTokenOut] = useState<Address>(TOKENS.USDC);
    const [amountIn, setAmountIn] = useState<string>("");

    const decimalsIn = tokenIn === TOKENS.USDC ? 6 : 18;
    const decimalsOut = tokenOut === TOKENS.USDC ? 6 : 18;
    const amountInParsed = amountIn ? parseUnits(amountIn as `${number}`, decimalsIn) : undefined;

    const { data: balanceIn } = useBalance({ address, token: tokenIn });
    const { data: balanceOut } = useBalance({ address, token: tokenOut });

    const {
        expectedAmountOut,
        isQuoteLoading,
        isApprovalNeeded,
        approve,
        isApprovePending,
        swap,
        isSwapPending
    } = useSwap(tokenIn, tokenOut, amountInParsed);

    const { dynamicFee } = usePool(tokenIn, tokenOut);

    const handleSwapDirection = () => {
        setTokenIn(tokenOut);
        setTokenOut(tokenIn);
        setAmountIn("");
    };

    return (
        <Card className="w-full max-w-[480px] p-4 bg-bg-card border-border shadow-2xl relative">
            <div className="flex items-center justify-between mb-4 px-2">
                <h2 className="text-lg font-semibold">Swap</h2>
                <Button variant="ghost" size="icon" className="text-text-secondary hover:text-text-primary">
                    <Settings className="h-5 w-5" />
                </Button>
            </div>

            <div className="bg-bg-input rounded-2xl p-4 mb-2">
                <div className="flex justify-between mb-2">
                    <span className="text-sm text-text-secondary">From</span>
                    <span className="text-sm text-text-secondary">
                        Balance: {balanceIn ? formatUnits(balanceIn.value, balanceIn.decimals).slice(0, 6) : "0.00"}
                    </span>
                </div>
                <div className="flex items-center justify-between">
                    <Input
                        type="number"
                        placeholder="0.0"
                        value={amountIn}
                        onChange={(e) => setAmountIn(e.target.value)}
                        className="text-3xl font-mono bg-transparent border-none p-0 focus-visible:ring-0 shadow-none text-text-primary placeholder:text-text-tertiary w-2/3"
                    />
                    <Button variant="secondary" className="flex items-center gap-2 rounded-full px-4 h-10 ml-4 font-semibold shrink-0">
                        {tokenIn === TOKENS.wCTC ? "wCTC" : tokenIn === TOKENS.USDC ? "USDC" : "Token"} <ChevronDown className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            <div className="absolute left-1/2 top-[168px] -translate-x-1/2 -translate-y-1/2 z-10">
                <Button
                    variant="outline"
                    size="icon"
                    onClick={handleSwapDirection}
                    className="h-10 w-10 rounded-xl bg-bg-card border-border hover:bg-bg-input transition-transform hover:rotate-180"
                >
                    <ArrowDownUp className="h-4 w-4 text-text-primary" />
                </Button>
            </div>

            <div className="bg-bg-input rounded-2xl p-4 mb-4 mt-2 overflow-hidden">
                <div className="flex justify-between mb-2">
                    <span className="text-sm text-text-secondary">To</span>
                    <span className="text-sm text-text-secondary">
                        Balance: {balanceOut ? formatUnits(balanceOut.value, balanceOut.decimals).slice(0, 6) : "0.00"}
                    </span>
                </div>
                <div className="flex items-center justify-between">
                    <Input
                        readOnly
                        type="number"
                        placeholder="0.0"
                        value={expectedAmountOut ? formatUnits(expectedAmountOut, decimalsOut) : ""}
                        className="text-3xl font-mono bg-transparent border-none p-0 focus-visible:ring-0 shadow-none text-text-primary"
                    />
                    <Button variant="secondary" className="flex items-center gap-2 rounded-full px-4 h-10 ml-4 font-semibold shrink-0">
                        {tokenOut === TOKENS.USDC ? "USDC" : tokenOut === TOKENS.wCTC ? "wCTC" : "Token"} <ChevronDown className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            {!isConnected ? (
                <Button className="w-full h-14 rounded-xl text-lg font-semibold bg-accent-primary hover:bg-accent-primary/90 text-bg-primary">
                    Connect Wallet
                </Button>
            ) : !amountIn ? (
                <Button disabled className="w-full h-14 rounded-xl text-lg font-semibold bg-bg-input text-text-tertiary">
                    Enter an amount
                </Button>
            ) : isApprovalNeeded ? (
                <Button
                    onClick={approve}
                    disabled={isApprovePending}
                    className="w-full h-14 rounded-xl text-lg font-semibold bg-warning hover:bg-warning/90 text-bg-primary"
                >
                    {isApprovePending ? "Approving..." : "Approve"}
                </Button>
            ) : (
                <Button
                    onClick={() => swap()}
                    disabled={isSwapPending || isQuoteLoading}
                    className="w-full h-14 rounded-xl text-lg font-semibold bg-[linear-gradient(var(--accent-gradient))] hover:opacity-90"
                >
                    {isSwapPending ? "Swapping..." : "Swap"}
                </Button>
            )}
        </Card>
    );
}
