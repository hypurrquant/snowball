"use client";

import { useConnection, useConfig } from "wagmi";
import { useChainWriteContract } from "@/shared/hooks/useChainWriteContract";
import { waitForTransactionReceipt } from "wagmi/actions";
import { AavePoolABI } from "@/core/abis";
import { useTokenApproval } from "@/shared/hooks/useTokenApproval";
import type { Address } from "viem";
import { NEVERLAND, MONAD_TESTNET_CHAIN_ID } from "@/core/config/monad";

const RATE_MODE_VARIABLE = 2n;

export function useNeverlandActions(asset: Address, onSuccess?: () => void) {
  const config = useConfig();
  const { address } = useConnection();

  const { approve, isApproving } = useTokenApproval({
    token: asset,
    spender: NEVERLAND.pool,
    amount: undefined,
    owner: address,
  });

  const { writeContractAsync, isPending } = useChainWriteContract(MONAD_TESTNET_CHAIN_ID);

  const waitAndCallback = async (hash: `0x${string}`) => {
    await waitForTransactionReceipt(config, { hash });
    onSuccess?.();
    return hash;
  };

  const supply = async (amount: bigint) => {
    const hash = await writeContractAsync({
      address: NEVERLAND.pool,
      abi: AavePoolABI,
      functionName: "supply",
      args: [asset, amount, address!, 0],
    });
    return waitAndCallback(hash);
  };

  const withdraw = async (amount: bigint) => {
    const hash = await writeContractAsync({
      address: NEVERLAND.pool,
      abi: AavePoolABI,
      functionName: "withdraw",
      args: [asset, amount, address!],
    });
    return waitAndCallback(hash);
  };

  const borrow = async (amount: bigint) => {
    const hash = await writeContractAsync({
      address: NEVERLAND.pool,
      abi: AavePoolABI,
      functionName: "borrow",
      args: [asset, amount, RATE_MODE_VARIABLE, 0, address!],
    });
    return waitAndCallback(hash);
  };

  const repay = async (amount: bigint) => {
    const hash = await writeContractAsync({
      address: NEVERLAND.pool,
      abi: AavePoolABI,
      functionName: "repay",
      args: [asset, amount, RATE_MODE_VARIABLE, address!],
    });
    return waitAndCallback(hash);
  };

  return {
    approve,
    supply,
    withdraw,
    borrow,
    repay,
    isPending: isPending || isApproving,
  };
}
