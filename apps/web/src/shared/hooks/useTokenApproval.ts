"use client";

import { useReadContract, useWriteContract } from "wagmi";
import { erc20Abi, type Address } from "viem";

export function useTokenApproval({
  token,
  spender,
  amount,
  owner,
}: {
  token?: Address;
  spender?: Address;
  amount?: bigint;
  owner?: Address;
}) {
  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    address: token,
    abi: erc20Abi,
    functionName: "allowance",
    args: [owner!, spender!],
    query: { enabled: !!owner && !!token && !!spender },
  });

  const needsApproval =
    !!amount && amount > 0n && allowance !== undefined && allowance < amount;

  const { writeContractAsync: approveAsync, isPending: isApproving } =
    useWriteContract();

  const approve = async (approveAmount?: bigint) => {
    if (!token || !spender) return;
    const result = await approveAsync({
      address: token,
      abi: erc20Abi,
      functionName: "approve",
      args: [spender, approveAmount ?? amount ?? 0n],
    });
    await refetchAllowance();
    return result;
  };

  return { allowance, needsApproval, approve, isApproving };
}
