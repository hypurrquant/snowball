"use client";

import { useEffect, useState } from "react";
import { createPublicClient, http, erc20Abi, type Address } from "viem";
import { Globe } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/shared/components/ui/card";
import { formatUSD, formatTokenAmount } from "@/shared/lib/utils";
import { CHAIN_CONFIGS, SUPPORTED_CHAINS } from "@/core/config/addresses";
import { creditcoinTestnet, giwaSepoliaChain } from "@/core/config/chain";

// Viem chain objects keyed by chainId
const VIEM_CHAINS: Record<number, typeof creditcoinTestnet | typeof giwaSepoliaChain> = {
  91342: giwaSepoliaChain,
  102031: creditcoinTestnet,
};

interface ChainBalance {
  chainId: number;
  chainName: string;
  tokens: Array<{
    symbol: string;
    balance: bigint;
    usd: number;
  }>;
  totalUsd: number;
  loading: boolean;
}

export function CrossChainPortfolio({ address }: { address: Address }) {
  const [chainBalances, setChainBalances] = useState<ChainBalance[]>(
    SUPPORTED_CHAINS.map((chainId) => ({
      chainId,
      chainName: CHAIN_CONFIGS[chainId]?.name ?? String(chainId),
      tokens: [],
      totalUsd: 0,
      loading: true,
    }))
  );

  useEffect(() => {
    let cancelled = false;

    async function fetchChain(chainId: (typeof SUPPORTED_CHAINS)[number]) {
      const config = CHAIN_CONFIGS[chainId];
      const viemChain = VIEM_CHAINS[chainId];
      if (!config || !viemChain) return;

      const client = createPublicClient({
        chain: viemChain,
        transport: http(config.rpcUrl),
      });

      const tokenEntries = [
        { symbol: "wCTC", addr: config.tokens.wCTC },
        { symbol: "lstCTC", addr: config.tokens.lstCTC },
        { symbol: "sbUSD", addr: config.tokens.sbUSD },
        { symbol: "USDC", addr: config.tokens.USDC },
      ] as const;

      const results = await Promise.allSettled(
        tokenEntries.map(({ addr }) =>
          client.readContract({
            address: addr,
            abi: erc20Abi,
            functionName: "balanceOf",
            args: [address],
          })
        )
      );

      const tokens = tokenEntries.map(({ symbol, addr }, i) => {
        const balance =
          results[i].status === "fulfilled" ? (results[i] as PromiseFulfilledResult<bigint>).value : 0n;
        const price = config.tokenInfo[addr]?.mockPriceUsd ?? 0;
        const usd = (Number(balance) / 1e18) * price;
        return { symbol, balance, usd };
      });

      const totalUsd = tokens.reduce((s, t) => s + t.usd, 0);

      if (!cancelled) {
        setChainBalances((prev) =>
          prev.map((c) =>
            c.chainId === chainId ? { ...c, tokens, totalUsd, loading: false } : c
          )
        );
      }
    }

    for (const chainId of SUPPORTED_CHAINS) {
      fetchChain(chainId);
    }

    return () => {
      cancelled = true;
    };
  }, [address]);

  const grandTotal = chainBalances.reduce((s, c) => s + c.totalUsd, 0);

  return (
    <Card className="bg-bg-card/60 backdrop-blur-xl border-white/5">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium text-text-secondary flex items-center gap-2">
          <Globe className="w-4 h-4 text-ice-400" />
          Total Assets (All Chains)
        </CardTitle>
        <div className="text-2xl font-bold text-white">{formatUSD(grandTotal)}</div>
      </CardHeader>
      <CardContent className="space-y-5">
        {chainBalances.map((chain) => (
          <div key={chain.chainId}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold text-text-secondary">{chain.chainName}</span>
              <span className="text-sm font-bold text-white">{formatUSD(chain.totalUsd)}</span>
            </div>
            {chain.loading ? (
              <div className="space-y-1">
                {[0, 1, 2, 3].map((i) => (
                  <div key={i} className="h-4 rounded bg-bg-hover animate-pulse" />
                ))}
              </div>
            ) : (
              <div className="space-y-1 pl-2 border-l border-white/5">
                {chain.tokens
                  .filter((t) => t.balance > 0n)
                  .map((t) => (
                    <div key={t.symbol} className="flex items-center justify-between text-xs">
                      <span className="text-text-tertiary">{t.symbol}</span>
                      <span className="text-white font-medium">
                        {formatTokenAmount(t.balance, 18, 4)}
                        <span className="text-text-tertiary ml-1">{formatUSD(t.usd)}</span>
                      </span>
                    </div>
                  ))}
                {chain.tokens.every((t) => t.balance === 0n) && (
                  <p className="text-xs text-text-tertiary">No balances on this chain</p>
                )}
              </div>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
