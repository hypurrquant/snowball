"use client";

import { useReadContract, useConfig } from "wagmi";
import { waitForTransactionReceipt } from "wagmi/actions";
import { erc20Abi, type Address } from "viem";
import { needsApproval as checkNeedsApproval } from "@snowball/core";
import { useChainWriteContract } from "./useChainWriteContract";

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
  const config = useConfig();
  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    address: token,
    abi: erc20Abi,
    functionName: "allowance",
    args: [owner!, spender!],
    query: { enabled: !!owner && !!token && !!spender },
  });

  const needsApproval = checkNeedsApproval(amount, allowance);

  const { writeContractAsync: approveAsync, isPending: isApproving } =
    useChainWriteContract();

  const approve = async (approveAmount?: bigint) => {
    const finalAmount = approveAmount ?? amount ?? 0n;
    console.log("[approve] start", {
      token,
      spender,
      amount: finalAmount.toString(),
      currentAllowance: allowance?.toString(),
    });
    if (!token || !spender) {
      console.warn("[approve] missing token or spender, aborting");
      return;
    }
    try {
      const result = await approveAsync({
        address: token,
        abi: erc20Abi,
        functionName: "approve",
        args: [spender, finalAmount],
      });
      console.log("[approve] tx hash:", result);
      const receipt = await waitForTransactionReceipt(config, { hash: result });
      console.log("[approve] receipt:", receipt.status, receipt);
      await refetchAllowance();
      console.log("[approve] allowance refetched");
      return result;
    } catch (err) {
      console.error("[approve] failed:", err);
      throw err;
    }
  };

  return { allowance, needsApproval, approve, isApproving };
}
