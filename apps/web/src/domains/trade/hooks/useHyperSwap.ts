"use client";

import { useReadContract, useChainId } from "wagmi";
import { useChainWriteContract } from "@/shared/hooks/useChainWriteContract";
import { useTokenApproval } from "@/shared/hooks/useTokenApproval";
import { useConnection } from "wagmi";
import type { Address } from "viem";
import { DEFAULT_SLIPPAGE_BPS, DEFAULT_DEADLINE_SECONDS } from "../lib/constants";

const HYPERSWAP_ROUTER = "0xda0f518d521e0dE83fAdC8500C2D21b6a6C39bF9" as const;
const HYPEREVM_CHAIN_ID = 999;

const RouterV2ABI = [
  {
    type: "function",
    name: "getAmountsOut",
    inputs: [
      { name: "amountIn", type: "uint256" },
      { name: "path", type: "address[]" },
    ],
    outputs: [{ name: "amounts", type: "uint256[]" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "swapExactTokensForTokens",
    inputs: [
      { name: "amountIn", type: "uint256" },
      { name: "amountOutMin", type: "uint256" },
      { name: "path", type: "address[]" },
      { name: "to", type: "address" },
      { name: "deadline", type: "uint256" },
    ],
    outputs: [{ name: "amounts", type: "uint256[]" }],
    stateMutability: "nonpayable",
  },
] as const;

export function useHyperSwap(
  tokenIn?: Address,
  tokenOut?: Address,
  amountIn?: bigint
) {
  const chainId = useChainId();
  const { address } = useConnection();
  const isHyperEVM = chainId === HYPEREVM_CHAIN_ID;

  const path: [Address, Address] | undefined =
    tokenIn && tokenOut ? [tokenIn, tokenOut] : undefined;

  // Quote via getAmountsOut
  const { data: quoteData, isLoading: isQuoteLoading } = useReadContract({
    address: HYPERSWAP_ROUTER,
    abi: RouterV2ABI,
    functionName: "getAmountsOut",
    args: [amountIn!, path!],
    query: {
      enabled:
        isHyperEVM &&
        !!tokenIn &&
        !!tokenOut &&
        !!amountIn &&
        amountIn > 0n,
      refetchInterval: 10_000,
    },
  });

  // getAmountsOut returns [amountIn, amountOut]
  const expectedAmountOut =
    quoteData && quoteData.length >= 2 ? quoteData[quoteData.length - 1] : undefined;

  // Approval
  const {
    needsApproval: isApprovalNeeded,
    approve,
    isApproving: isApprovePending,
  } = useTokenApproval({
    token: tokenIn,
    spender: HYPERSWAP_ROUTER,
    amount: amountIn,
    owner: address,
  });

  // Swap
  const { writeContractAsync: swapAsync, isPending: isSwapPending } =
    useChainWriteContract();

  const swap = async (slippageBps = DEFAULT_SLIPPAGE_BPS) => {
    if (!tokenIn || !tokenOut || !amountIn || !expectedAmountOut || !address)
      return;

    const minOut =
      (expectedAmountOut * BigInt(10000 - slippageBps)) / 10000n;
    const deadline = BigInt(
      Math.floor(Date.now() / 1000) + DEFAULT_DEADLINE_SECONDS
    );

    return swapAsync({
      address: HYPERSWAP_ROUTER,
      abi: RouterV2ABI,
      functionName: "swapExactTokensForTokens",
      args: [amountIn, minOut, [tokenIn, tokenOut], address, deadline],
    });
  };

  return {
    expectedAmountOut,
    isQuoteLoading,
    isApprovalNeeded,
    approve,
    isApprovePending,
    swap,
    isSwapPending,
    isHyperEVM,
  };
}
