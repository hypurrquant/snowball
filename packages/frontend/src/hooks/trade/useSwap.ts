"use client";

import { useConnection, useReadContract, useWriteContract } from "wagmi";
import { QuoterV2ABI, SnowballRouterABI, MockERC20ABI } from "@/abis";
import { DEX } from "@/config/addresses";
import type { Address } from "viem";

export function useSwap(
  tokenIn?: Address,
  tokenOut?: Address,
  amountIn?: bigint
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
        deployer: DEX.snowballPoolDeployer,
        amountIn: amountIn!,
        limitSqrtPrice: 0n,
      },
    ],
    query: {
      enabled: !!tokenIn && !!tokenOut && !!amountIn && amountIn > 0n,
      refetchInterval: 10_000,
    },
  });

  const expectedAmountOut = quoteData?.[0];
  const fee = quoteData?.[5];

  // Allowance check
  const { data: allowance } = useReadContract({
    address: tokenIn,
    abi: MockERC20ABI,
    functionName: "allowance",
    args: [address!, DEX.snowballRouter],
    query: { enabled: !!address && !!tokenIn },
  });

  const isApprovalNeeded =
    !!amountIn && !!allowance && allowance < amountIn;

  // Approve
  const {
    writeContractAsync: approveAsync,
    isPending: isApprovePending,
  } = useWriteContract();

  const approve = async () => {
    if (!tokenIn || !amountIn) return;
    return approveAsync({
      address: tokenIn,
      abi: MockERC20ABI,
      functionName: "approve",
      args: [DEX.snowballRouter, amountIn],
    });
  };

  // Swap
  const {
    writeContractAsync: swapAsync,
    isPending: isSwapPending,
  } = useWriteContract();

  const swap = async (slippageBps = 50) => {
    if (!tokenIn || !tokenOut || !amountIn || !expectedAmountOut || !address) return;
    const minOut = (expectedAmountOut * BigInt(10000 - slippageBps)) / 10000n;
    const deadline = BigInt(Math.floor(Date.now() / 1000) + 1200);

    return swapAsync({
      address: DEX.snowballRouter,
      abi: SnowballRouterABI,
      functionName: "exactInputSingle",
      args: [
        {
          tokenIn,
          tokenOut,
          deployer: DEX.snowballPoolDeployer,
          recipient: address,
          deadline,
          amountIn,
          amountOutMinimum: minOut,
          limitSqrtPrice: 0n,
        },
      ],
    });
  };

  return {
    expectedAmountOut,
    fee,
    isQuoteLoading,
    isApprovalNeeded,
    approve,
    isApprovePending,
    swap,
    isSwapPending,
  };
}
