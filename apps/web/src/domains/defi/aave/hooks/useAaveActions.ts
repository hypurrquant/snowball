"use client";

import { useConnection, useConfig } from "wagmi";
import { useChainWriteContract } from "@/shared/hooks/useChainWriteContract";
import { waitForTransactionReceipt } from "wagmi/actions";
import { AAVE } from "@snowball/core/src/config/addresses";
import { AavePoolABI } from "@/core/abis";
import { useTokenApproval } from "@/shared/hooks/useTokenApproval";
import { RATE_MODE } from "../lib/constants";
import type { Address } from "viem";

export function useAaveActions(asset: Address, onSuccess?: () => void) {
  const config = useConfig();
  const { address } = useConnection();

  const { approve, isApproving } = useTokenApproval({
    token: asset,
    spender: AAVE.pool,
    amount: undefined,
    owner: address,
  });

  const { writeContractAsync, isPending } = useChainWriteContract();

  const waitAndCallback = async (hash: `0x${string}`) => {
    await waitForTransactionReceipt(config, { hash });
    onSuccess?.();
    return hash;
  };

  const supply = async (amount: bigint) => {
    const hash = await writeContractAsync({
      address: AAVE.pool,
      abi: AavePoolABI,
      functionName: "supply",
      args: [asset, amount, address!, 0],
    });
    return waitAndCallback(hash);
  };

  const withdraw = async (amount: bigint) => {
    const hash = await writeContractAsync({
      address: AAVE.pool,
      abi: AavePoolABI,
      functionName: "withdraw",
      args: [asset, amount, address!],
    });
    return waitAndCallback(hash);
  };

  const borrow = async (amount: bigint) => {
    const hash = await writeContractAsync({
      address: AAVE.pool,
      abi: AavePoolABI,
      functionName: "borrow",
      args: [asset, amount, RATE_MODE.VARIABLE, 0, address!],
    });
    return waitAndCallback(hash);
  };

  const repay = async (amount: bigint) => {
    const hash = await writeContractAsync({
      address: AAVE.pool,
      abi: AavePoolABI,
      functionName: "repay",
      args: [asset, amount, RATE_MODE.VARIABLE, address!],
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
