"use client";

import { useConnection, useConfig } from "wagmi";
import { waitForTransactionReceipt } from "wagmi/actions";
import { NonfungiblePositionManagerABI, MockERC20ABI } from "@/core/abis";
import { DEX } from "@/core/config/addresses";
import { useChainWriteContract } from "@/shared/hooks/useChainWriteContract";
import type { Address } from "viem";

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
    fee = 3000,
    tickLower,
    tickUpper,
    amount0Desired,
    amount1Desired,
    slippageBps = 50,
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

    const amount0Min =
      (amount0Desired * BigInt(10000 - slippageBps)) / 10000n;
    const amount1Min =
      (amount1Desired * BigInt(10000 - slippageBps)) / 10000n;
    const deadline = BigInt(Math.floor(Date.now() / 1000) + 1200);

    const mintParams = {
      token0,
      token1,
      fee,
      tickLower,
      tickUpper,
      amount0Desired,
      amount1Desired,
      amount0Min,
      amount1Min,
      recipient: address,
      deadline,
    };

    console.log("[mint] NonfungiblePositionManager:", DEX.nonfungiblePositionManager);
    console.log("[mint] params:", {
      ...mintParams,
      amount0Desired: amount0Desired.toString(),
      amount1Desired: amount1Desired.toString(),
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
