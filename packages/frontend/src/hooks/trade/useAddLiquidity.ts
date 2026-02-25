"use client";

import { useConnection, useWriteContract } from "wagmi";
import { NonfungiblePositionManagerABI, MockERC20ABI } from "@/abis";
import { DEX } from "@/config/addresses";
import type { Address } from "viem";

export function useAddLiquidity() {
  const { address } = useConnection();

  const { writeContractAsync: mintAsync, isPending: isMintPending } =
    useWriteContract();

  const { writeContractAsync: approveAsync, isPending: isApprovePending } =
    useWriteContract();

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
    tickLower,
    tickUpper,
    amount0Desired,
    amount1Desired,
    slippageBps = 50,
  }: {
    token0: Address;
    token1: Address;
    tickLower: number;
    tickUpper: number;
    amount0Desired: bigint;
    amount1Desired: bigint;
    slippageBps?: number;
  }) => {
    if (!address) return;

    const amount0Min =
      (amount0Desired * BigInt(10000 - slippageBps)) / 10000n;
    const amount1Min =
      (amount1Desired * BigInt(10000 - slippageBps)) / 10000n;
    const deadline = BigInt(Math.floor(Date.now() / 1000) + 1200);

    return mintAsync({
      address: DEX.nonfungiblePositionManager,
      abi: NonfungiblePositionManagerABI,
      functionName: "mint",
      args: [
        {
          token0,
          token1,
          deployer: DEX.snowballPoolDeployer,
          tickLower,
          tickUpper,
          amount0Desired,
          amount1Desired,
          amount0Min,
          amount1Min,
          recipient: address,
          deadline,
        },
      ],
    });
  };

  return {
    approveToken,
    isApprovePending,
    mint,
    isMintPending,
  };
}
