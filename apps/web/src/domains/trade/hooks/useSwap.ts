"use client";

import { useConnection, useReadContract } from "wagmi";
import { useChainWriteContract } from "@/shared/hooks/useChainWriteContract";
import { QuoterV2ABI, SwapRouterABI } from "@/core/abis";
import { DEX } from "@/core/config/addresses";
import { useTokenApproval } from "@/shared/hooks/useTokenApproval";
import type { Address } from "viem";

export function useSwap(
  tokenIn?: Address,
  tokenOut?: Address,
  amountIn?: bigint,
  fee: number = 3000
) {
  const { address } = useConnection();

  // Quote
  const { data: quoteData, isLoading: isQuoteLoading } = useReadContract({
    address: DEX.quoterV2,
    abi: QuoterV2ABI,
    functionName: "quoteExactInputSingle",
    args: [
      {
        tokenIn: tokenIn!,
        tokenOut: tokenOut!,
        amountIn: amountIn!,
        fee,
        sqrtPriceLimitX96: 0n,
      },
    ],
    query: {
      enabled: !!tokenIn && !!tokenOut && !!amountIn && amountIn > 0n,
      refetchInterval: 10_000,
    },
  });

  const expectedAmountOut = quoteData?.[0];

  // Approval
  const {
    needsApproval: isApprovalNeeded,
    approve,
    isApproving: isApprovePending,
  } = useTokenApproval({ token: tokenIn, spender: DEX.swapRouter, amount: amountIn, owner: address });

  // Swap
  const {
    writeContractAsync: swapAsync,
    isPending: isSwapPending,
  } = useChainWriteContract();

  const swap = async (slippageBps = 50) => {
    if (!tokenIn || !tokenOut || !amountIn || !expectedAmountOut || !address) return;
    const minOut = (expectedAmountOut * BigInt(10000 - slippageBps)) / 10000n;
    const deadline = BigInt(Math.floor(Date.now() / 1000) + 1200);

    return swapAsync({
      address: DEX.swapRouter,
      abi: SwapRouterABI,
      functionName: "exactInputSingle",
      args: [
        {
          tokenIn,
          tokenOut,
          fee,
          recipient: address,
          deadline,
          amountIn,
          amountOutMinimum: minOut,
          sqrtPriceLimitX96: 0n,
        },
      ],
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
  };
}
