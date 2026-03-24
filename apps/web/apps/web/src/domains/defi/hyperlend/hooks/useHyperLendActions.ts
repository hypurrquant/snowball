"use client";

import { useConnection, useConfig } from "wagmi";
import { useChainWriteContract } from "@/shared/hooks/useChainWriteContract";
import { waitForTransactionReceipt } from "wagmi/actions";
import { AavePoolABI } from "@/core/abis";
import { useTokenApproval } from "@/shared/hooks/useTokenApproval";
import type { Address } from "viem";

const HYPERLEND_POOL = "0x00A89d7a5A02160f20150EbEA7a2b5E4879A1A8b" as const;
const HYPEREVM_CHAIN_ID = 999;
const RATE_MODE_VARIABLE = 2n;

export function useHyperLendActions(asset: Address, onSuccess?: () => void) {
  const config = useConfig();
  const { address } = useConnection();

  const { approve, isApproving } = useTokenApproval({
    token: asset,
    spender: HYPERLEND_POOL,
    amount: undefined,
    owner: address,
  });

  const { writeContractAsync, isPending } = useChainWriteContract(HYPEREVM_CHAIN_ID);

  const waitAndCallback = async (hash: `0x${string}`) => {
    await waitForTransactionReceipt(config, { hash });
    onSuccess?.();
    return hash;
  };

  const supply = async (amount: bigint) => {
    const hash = await writeContractAsync({
      address: HYPERLEND_POOL,
      abi: AavePoolABI,
      functionName: "supply",
      args: [asset, amount, address!, 0],
    });
    return waitAndCallback(hash);
  };

  const withdraw = async (amount: bigint) => {
    const hash = await writeContractAsync({
      address: HYPERLEND_POOL,
      abi: AavePoolABI,
      functionName: "withdraw",
      args: [asset, amount, address!],
    });
    return waitAndCallback(hash);
  };

  const borrow = async (amount: bigint) => {
    const hash = await writeContractAsync({
      address: HYPERLEND_POOL,
      abi: AavePoolABI,
      functionName: "borrow",
      args: [asset, amount, RATE_MODE_VARIABLE, 0, address!],
    });
    return waitAndCallback(hash);
  };

  const repay = async (amount: bigint) => {
    const hash = await writeContractAsync({
      address: HYPERLEND_POOL,
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
