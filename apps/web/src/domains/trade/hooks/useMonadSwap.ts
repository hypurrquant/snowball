"use client";

import { useReadContract, useChainId } from "wagmi";
import { useChainWriteContract } from "@/shared/hooks/useChainWriteContract";
import { useTokenApproval } from "@/shared/hooks/useTokenApproval";
import { useConnection } from "wagmi";
import type { Address } from "viem";
import { DEFAULT_SLIPPAGE_BPS, DEFAULT_DEADLINE_SECONDS } from "../lib/constants";
import { MONAD_UNISWAP, MONAD_TESTNET_CHAIN_ID } from "@/core/config/monad";

const SwapRouter02ABI = [
  {
    type: "function",
    name: "exactInputSingle",
    inputs: [
      {
        name: "params",
        type: "tuple",
        components: [
          { name: "tokenIn", type: "address" },
          { name: "tokenOut", type: "address" },
          { name: "fee", type: "uint24" },
          { name: "recipient", type: "address" },
          { name: "amountIn", type: "uint256" },
          { name: "amountOutMinimum", type: "uint256" },
          { name: "sqrtPriceLimitX96", type: "uint160" },
        ],
      },
    ],
    outputs: [{ name: "amountOut", type: "uint256" }],
    stateMutability: "payable",
  },
] as const;

const QuoterV2ABI = [
  {
    type: "function",
    name: "quoteExactInputSingle",
    inputs: [
      {
        name: "params",
        type: "tuple",
        components: [
          { name: "tokenIn", type: "address" },
          { name: "tokenOut", type: "address" },
          { name: "amountIn", type: "uint256" },
          { name: "fee", type: "uint24" },
          { name: "sqrtPriceLimitX96", type: "uint160" },
        ],
      },
    ],
    outputs: [
      { name: "amountOut", type: "uint256" },
      { name: "sqrtPriceX96After", type: "uint160" },
      { name: "initializedTicksCrossed", type: "uint32" },
      { name: "gasEstimate", type: "uint256" },
    ],
    stateMutability: "nonpayable",
  },
] as const;

const DEFAULT_FEE_TIER = 3000;

export function useMonadSwap(
  tokenIn?: Address,
  tokenOut?: Address,
  amountIn?: bigint,
  feeTier: number = DEFAULT_FEE_TIER
) {
  const chainId = useChainId();
  const { address } = useConnection();
  const isMonad = chainId === MONAD_TESTNET_CHAIN_ID;

  // Quote via QuoterV2.quoteExactInputSingle
  const { data: quoteData, isLoading: isQuoteLoading } = useReadContract({
    address: MONAD_UNISWAP.quoterV2,
    abi: QuoterV2ABI,
    functionName: "quoteExactInputSingle",
    args: [
      {
        tokenIn: tokenIn!,
        tokenOut: tokenOut!,
        amountIn: amountIn!,
        fee: feeTier,
        sqrtPriceLimitX96: 0n,
      },
    ],
    query: {
      enabled:
        isMonad &&
        !!tokenIn &&
        !!tokenOut &&
        !!amountIn &&
        amountIn > 0n,
      refetchInterval: 10_000,
    },
  });

  // quoteExactInputSingle returns [amountOut, sqrtPriceX96After, initializedTicksCrossed, gasEstimate]
  const expectedAmountOut = quoteData?.[0];

  // Approval
  const {
    needsApproval: isApprovalNeeded,
    approve,
    isApproving: isApprovePending,
  } = useTokenApproval({
    token: tokenIn,
    spender: MONAD_UNISWAP.swapRouter02,
    amount: amountIn,
    owner: address,
  });

  // Swap
  const { writeContractAsync: swapAsync, isPending: isSwapPending } =
    useChainWriteContract(MONAD_TESTNET_CHAIN_ID);

  const swap = async (slippageBps = DEFAULT_SLIPPAGE_BPS) => {
    if (!tokenIn || !tokenOut || !amountIn || !expectedAmountOut || !address)
      return;

    const minOut =
      (expectedAmountOut * BigInt(10000 - slippageBps)) / 10000n;
    const deadline = BigInt(
      Math.floor(Date.now() / 1000) + DEFAULT_DEADLINE_SECONDS
    );

    return swapAsync({
      address: MONAD_UNISWAP.swapRouter02,
      abi: SwapRouter02ABI,
      functionName: "exactInputSingle",
      args: [
        {
          tokenIn,
          tokenOut,
          fee: feeTier,
          recipient: address,
          amountIn,
          amountOutMinimum: minOut,
          sqrtPriceLimitX96: 0n,
        },
      ],
      value: 0n,
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
    isMonad,
  };
}
