"use client";

import { useQuery } from "@tanstack/react-query";
import { useAccount, useSendTransaction } from "wagmi";
import type { Address } from "viem";
import { DEFAULT_SLIPPAGE_BPS } from "../lib/constants";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AggregatorQuote {
  aggregator: string;
  amountOut: bigint;
  estimatedGas: bigint;
  txData?: `0x${string}`;
  txTo?: Address;
  txValue?: bigint;
}

interface UseDexAggregatorParams {
  chainId: number;
  tokenIn?: Address;
  tokenOut?: Address;
  amountIn?: bigint;
  userAddress?: Address;
  slippageBps?: number;
}

// ─── Chain name mappings ──────────────────────────────────────────────────────

const OPENOCEAN_CHAIN_NAMES: Record<number, string> = {
  999: "hyperevm",
  143: "monad",
  1: "eth",
  42161: "arbitrum",
  10: "optimism",
  8453: "base",
};

const KYBERSWAP_CHAIN_NAMES: Record<number, string> = {
  1: "ethereum",
  42161: "arbitrum",
  10: "optimism",
  8453: "base",
  // 999 (HyperEVM) and 143 (Monad) not supported — omitted intentionally
};

// ─── Aggregator fetchers ──────────────────────────────────────────────────────

async function fetchOpenOceanQuote(
  chainId: number,
  tokenIn: Address,
  tokenOut: Address,
  amountIn: bigint,
  slippageBps: number,
  userAddress: Address
): Promise<AggregatorQuote | null> {
  const chainName = OPENOCEAN_CHAIN_NAMES[chainId];
  if (!chainName) return null;

  // OpenOcean amount is in token units (not wei) for the query param,
  // but we pass the raw bigint as a string and let the API handle it.
  const slippagePct = (slippageBps / 100).toFixed(2);

  const url = new URL(
    `https://open-api.openocean.finance/v4/${chainName}/swap`
  );
  url.searchParams.set("inTokenAddress", tokenIn);
  url.searchParams.set("outTokenAddress", tokenOut);
  url.searchParams.set("amount", amountIn.toString());
  url.searchParams.set("gasPrice", "5");
  url.searchParams.set("slippage", slippagePct);
  url.searchParams.set("account", userAddress);

  const res = await fetch(url.toString(), {
    headers: { "Content-Type": "application/json" },
  });
  if (!res.ok) return null;

  const json = await res.json();
  if (!json?.data) return null;

  const data = json.data;
  const outAmount: bigint = BigInt(data.outAmount ?? data.out_amount ?? "0");
  const gas: bigint = BigInt(data.estimatedGas ?? data.gas ?? "200000");

  return {
    aggregator: "OpenOcean",
    amountOut: outAmount,
    estimatedGas: gas,
    txData: data.data as `0x${string}` | undefined,
    txTo: data.to as Address | undefined,
    txValue: data.value ? BigInt(data.value) : 0n,
  };
}

async function fetchKyberSwapQuote(
  chainId: number,
  tokenIn: Address,
  tokenOut: Address,
  amountIn: bigint,
  slippageBps: number,
  userAddress: Address
): Promise<AggregatorQuote | null> {
  const chainName = KYBERSWAP_CHAIN_NAMES[chainId];
  if (!chainName) return null;

  // Step 1: get route
  const routeUrl = new URL(
    `https://aggregator-api.kyberswap.com/${chainName}/api/v1/routes`
  );
  routeUrl.searchParams.set("tokenIn", tokenIn);
  routeUrl.searchParams.set("tokenOut", tokenOut);
  routeUrl.searchParams.set("amountIn", amountIn.toString());

  const routeRes = await fetch(routeUrl.toString());
  if (!routeRes.ok) return null;

  const routeJson = await routeRes.json();
  const routeData = routeJson?.data?.routeSummary;
  if (!routeData) return null;

  const outAmount: bigint = BigInt(routeData.amountOut ?? "0");

  // Step 2: build tx
  const buildRes = await fetch(
    `https://aggregator-api.kyberswap.com/${chainName}/api/v1/route/build`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        routeSummary: routeData,
        slippageTolerance: slippageBps,
        sender: userAddress,
        recipient: userAddress,
      }),
    }
  );
  if (!buildRes.ok) {
    return {
      aggregator: "KyberSwap",
      amountOut: outAmount,
      estimatedGas: 200000n,
    };
  }

  const buildJson = await buildRes.json();
  const txData = buildJson?.data;

  return {
    aggregator: "KyberSwap",
    amountOut: outAmount,
    estimatedGas: BigInt(txData?.gas ?? "200000"),
    txData: txData?.data as `0x${string}` | undefined,
    txTo: txData?.routerAddress as Address | undefined,
    txValue: txData?.value ? BigInt(txData.value) : 0n,
  };
}

async function fetchAllQuotes(
  chainId: number,
  tokenIn: Address,
  tokenOut: Address,
  amountIn: bigint,
  slippageBps: number,
  userAddress: Address
): Promise<AggregatorQuote[]> {
  const results = await Promise.allSettled([
    fetchOpenOceanQuote(chainId, tokenIn, tokenOut, amountIn, slippageBps, userAddress),
    fetchKyberSwapQuote(chainId, tokenIn, tokenOut, amountIn, slippageBps, userAddress),
  ]);

  const quotes: AggregatorQuote[] = [];
  for (const result of results) {
    if (result.status === "fulfilled" && result.value !== null) {
      quotes.push(result.value);
    }
  }

  // Sort by best amountOut descending
  quotes.sort((a, b) => (b.amountOut > a.amountOut ? 1 : b.amountOut < a.amountOut ? -1 : 0));

  return quotes;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useDexAggregator({
  chainId,
  tokenIn,
  tokenOut,
  amountIn,
  userAddress,
  slippageBps = DEFAULT_SLIPPAGE_BPS,
}: UseDexAggregatorParams) {
  const { address: connectedAddress } = useAccount();
  const effectiveUser = (userAddress ?? connectedAddress) as Address | undefined;

  const enabled =
    !!tokenIn &&
    !!tokenOut &&
    !!amountIn &&
    amountIn > 0n &&
    !!effectiveUser;

  const { data: quotes = [], isLoading, error } = useQuery({
    queryKey: [
      "dexAggregator",
      chainId,
      tokenIn,
      tokenOut,
      amountIn?.toString(),
      slippageBps,
      effectiveUser,
    ],
    queryFn: () =>
      fetchAllQuotes(
        chainId,
        tokenIn!,
        tokenOut!,
        amountIn!,
        slippageBps,
        effectiveUser!
      ),
    enabled,
    refetchInterval: 15_000,
    staleTime: 10_000,
    retry: 1,
  });

  const bestQuote = quotes[0] as AggregatorQuote | undefined;

  const { sendTransactionAsync } = useSendTransaction();

  const executeSwap = async (quote: AggregatorQuote): Promise<`0x${string}`> => {
    if (!quote.txTo || !quote.txData) {
      throw new Error("Quote missing transaction data");
    }
    const hash = await sendTransactionAsync({
      to: quote.txTo,
      data: quote.txData,
      value: quote.txValue ?? 0n,
    });
    return hash;
  };

  return {
    quotes,
    bestQuote,
    isLoading,
    error: error ? (error as Error).message : null,
    executeSwap,
  };
}
