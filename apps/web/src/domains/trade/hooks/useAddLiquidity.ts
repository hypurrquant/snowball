"use client";

import { useConnection, useConfig } from "wagmi";
import { waitForTransactionReceipt } from "wagmi/actions";
import { NonfungiblePositionManagerABI, MockERC20ABI } from "@/core/abis";
import { DEX } from "@/core/config/addresses";
import { useChainWriteContract } from "@/shared/hooks/useChainWriteContract";
import type { Address } from "viem";
import { DEFAULT_FEE_TIER, DEFAULT_DEADLINE_SECONDS, DEFAULT_ADD_LIQUIDITY_SLIPPAGE_BPS } from "../lib/constants";

export function useAddLiquidity() {
  const { address } = useConnection();
  const config = useConfig();

  const { writeContractAsync: mintAsync, isPending: isMintPending } =
    useChainWriteContract();

  const { writeContractAsync: approveAsync, isPending: isApprovePending } =
    useChainWriteContract();

  const approveToken = async (token: Address, amount: bigint) => {
    return approveAsync({
      address: token,
      abi: MockERC20ABI,
      functionName: "approve",
      args: [DEX.nonfungiblePositionManager, amount],
    });
  };

  const mint = async ({
    token0,
    token1,
    fee = DEFAULT_FEE_TIER,
    tickLower,
    tickUpper,
    amount0Desired,
    amount1Desired,
    slippageBps = DEFAULT_ADD_LIQUIDITY_SLIPPAGE_BPS,
  }: {
    token0: Address;
    token1: Address;
    fee?: number;
    tickLower: number;
    tickUpper: number;
    amount0Desired: bigint;
    amount1Desired: bigint;
    slippageBps?: number;
  }) => {
    if (!address) {
      console.warn("[mint] No address connected, aborting");
      return;
    }

    // Uniswap V3 requires token0 < token1. Callers pass tokens in URL/user order,
    // but ticks from usePoolTicks are already in sorted-token order — only swap tokens & amounts.
    const needsSwap = token0.toLowerCase() > token1.toLowerCase();
    const t0 = needsSwap ? token1 : token0;
    const t1 = needsSwap ? token0 : token1;
    const a0 = needsSwap ? amount1Desired : amount0Desired;
    const a1 = needsSwap ? amount0Desired : amount1Desired;

    // Mint adds liquidity at current price — no swap, no MEV risk.
    // The pool takes only what it needs; min=0 avoids false slippage reverts.
    const amount0Min = 0n;
    const amount1Min = 0n;
    const deadline = BigInt(Math.floor(Date.now() / 1000) + DEFAULT_DEADLINE_SECONDS);

    const mintParams = {
      token0: t0,
      token1: t1,
      fee,
      tickLower,
      tickUpper,
      amount0Desired: a0,
      amount1Desired: a1,
      amount0Min,
      amount1Min,
      recipient: address,
      deadline,
    };

    console.log("[mint] NonfungiblePositionManager:", DEX.nonfungiblePositionManager);
    console.log("[mint] params:", {
      ...mintParams,
      needsSwap,
      amount0Desired: a0.toString(),
      amount1Desired: a1.toString(),
      amount0Min: amount0Min.toString(),
      amount1Min: amount1Min.toString(),
      deadline: deadline.toString(),
    });

    try {
      const txHash = await mintAsync({
        address: DEX.nonfungiblePositionManager,
        abi: NonfungiblePositionManagerABI,
        functionName: "mint",
        args: [mintParams],
      });
      console.log("[mint] tx hash:", txHash);
      const receipt = await waitForTransactionReceipt(config, { hash: txHash });
      console.log("[mint] receipt:", receipt.status, receipt);
      return receipt;
    } catch (err) {
      console.error("[mint] writeContractAsync failed:", err);
      throw err;
    }
  };

  return {
    approveToken,
    isApprovePending,
    mint,
    isMintPending,
  };
}
