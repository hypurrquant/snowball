"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { type Address } from "viem";
import { Search } from "lucide-react";
import { useConnection } from "wagmi";
import { useTokenBalance } from "@/shared/hooks/useTokenBalance";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/shared/components/ui/dialog";
import { Input } from "@/shared/components/ui/input";
import { TOKEN_INFO, TOKENS } from "@/core/config/addresses";
import { formatTokenAmount } from "@/shared/lib/utils";

interface TokenSelectorProps {
    selectedToken?: Address;
    onSelectToken: (token: Address) => void;
    trigger?: React.ReactNode;
    disabled?: boolean;
}

const SUPPORTED_TOKENS = [TOKENS.wCTC, TOKENS.lstCTC, TOKENS.sbUSD, TOKENS.USDC];

function TokenRow({
    token,
    onSelect,
}: {
    token: Address;
    onSelect: (token: Address) => void;
}) {
    const { address } = useConnection();
    const info = TOKEN_INFO[token];

    const { data: balanceData } = useTokenBalance({
        address,
        token: token as `0x${string}`,
    });

    return (
        <div
            onClick={() => onSelect(token)}
            className="flex cursor-pointer items-center justify-between rounded-xl p-3 transition-colors hover:bg-white/5 active:scale-[0.98]"
        >
            <div className="flex items-center gap-3">
                <Image
                    src={`/tokens/${info.symbol}.svg`}
                    alt={info.symbol}
                    width={36}
                    height={36}
                    className="rounded-full"
                />
                <div className="flex flex-col">
                    <span className="text-base font-medium text-white">
                        {info.symbol}
                    </span>
                    <span className="text-xs text-text-secondary">{info.name}</span>
                </div>
            </div>

            <div className="text-right">
                {balanceData ? (
                    <div className="text-sm font-medium text-white">
                        {formatTokenAmount(balanceData.value, balanceData.decimals, 4)}
                    </div>
                ) : (
                    <div className="text-sm text-text-secondary">0.0000</div>
                )}
            </div>
        </div>
    );
}

export function TokenSelector({
    selectedToken,
    onSelectToken,
    trigger,
    disabled,
}: TokenSelectorProps) {
    const [open, setOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");

    const filteredTokens = useMemo(() => {
        if (!searchQuery) return SUPPORTED_TOKENS;
        const query = searchQuery.toLowerCase();
        return SUPPORTED_TOKENS.filter((token) => {
            const info = TOKEN_INFO[token];
            return (
                info.symbol.toLowerCase().includes(query) ||
                info.name.toLowerCase().includes(query) ||
                token.toLowerCase().includes(query)
            );
        });
    }, [searchQuery]);

    const selectedInfo = selectedToken ? TOKEN_INFO[selectedToken] : null;

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild disabled={disabled}>
                {trigger ? (
                    trigger
                ) : (
                    <button
                        className="flex shrink-0 items-center gap-2 rounded-xl border border-border bg-bg-hover px-3 py-2 text-sm font-medium text-white transition-colors hover:border-white/20 hover:bg-bg-active"
                    >
                        {selectedInfo ? (
                            <>
                                <Image
                                    src={`/tokens/${selectedInfo.symbol}.svg`}
                                    alt={selectedInfo.symbol}
                                    width={20}
                                    height={20}
                                    className="rounded-full"
                                />
                                <span>{selectedInfo.symbol} </span>
                            </>
                        ) : (
                            <span>Select Token</span>
                        )}
                        <svg
                            className="ml-1 h-4 w-4 opacity-70"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                    </button>
                )}
            </DialogTrigger>

            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Select a token</DialogTitle>
                </DialogHeader>

                <div className="relative mt-2">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary" />
                    <Input
                        placeholder="Search name or paste address"
                        className="pl-9 bg-bg-input border-transparent focus-visible:ring-1 focus-visible:ring-ice-400 placeholder:text-text-secondary"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>

                <div className="mt-4 flex flex-col gap-1 overflow-y-auto max-h-[360px] pr-2 -mr-2">
                    {filteredTokens.length > 0 ? (
                        filteredTokens.map((token) => (
                            <TokenRow
                                key={token}
                                token={token}
                                onSelect={(t) => {
                                    onSelectToken(t);
                                    setOpen(false);
                                }}
                            />
                        ))
                    ) : (
                        <div className="py-8 text-center text-sm text-text-secondary">
                            No tokens found.
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
