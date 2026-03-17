"use client";

import { useConnection, useConfig } from "wagmi";
import { useChainWriteContract } from "@/shared/hooks/useChainWriteContract";
import { waitForTransactionReceipt } from "wagmi/actions";
import { FORWARD } from "@snowball/core/src/config/addresses";
import { ForwardExchangeABI, ForwardVaultABI } from "@/core/abis";
import { useTokenApproval } from "@/shared/hooks/useTokenApproval";

export function useForwardActions(onSuccess?: () => void) {
  const config = useConfig();
  const { address } = useConnection();

  const { approve: approveUSDC, isApproving: isApprovingUSDC } = useTokenApproval({
    token: FORWARD.collateralToken,
    spender: FORWARD.vault,
    amount: undefined,
    owner: address,
  });

  const { writeContractAsync, isPending } = useChainWriteContract();

  const waitAndCallback = async (hash: `0x${string}`) => {
    await waitForTransactionReceipt(config, { hash });
    onSuccess?.();
    return hash;
  };

  // ─── Vault Actions ───

  const deposit = async (amount: bigint) => {
    const hash = await writeContractAsync({
      address: FORWARD.vault,
      abi: ForwardVaultABI,
      functionName: "deposit",
      args: [amount],
    });
    return waitAndCallback(hash);
  };

  const withdraw = async (amount: bigint) => {
    const hash = await writeContractAsync({
      address: FORWARD.vault,
      abi: ForwardVaultABI,
      functionName: "withdraw",
      args: [amount],
    });
    return waitAndCallback(hash);
  };

  // ─── Exchange Actions ───

  const createOffer = async (
    marketId: `0x${string}`,
    notional: bigint,
    forwardRate: bigint,
    maturityTime: bigint,
    isLong: boolean,
  ) => {
    const hash = await writeContractAsync({
      address: FORWARD.exchange,
      abi: ForwardExchangeABI,
      functionName: "createOffer",
      args: [marketId, notional, forwardRate, maturityTime, isLong],
    });
    return waitAndCallback(hash);
  };

  const acceptOffer = async (tokenId: bigint) => {
    const hash = await writeContractAsync({
      address: FORWARD.exchange,
      abi: ForwardExchangeABI,
      functionName: "acceptOffer",
      args: [tokenId],
    });
    return waitAndCallback(hash);
  };

  const cancelOffer = async (tokenId: bigint) => {
    const hash = await writeContractAsync({
      address: FORWARD.exchange,
      abi: ForwardExchangeABI,
      functionName: "cancelOffer",
      args: [tokenId],
    });
    return waitAndCallback(hash);
  };

  return {
    approveUSDC,
    deposit,
    withdraw,
    createOffer,
    acceptOffer,
    cancelOffer,
    isPending: isPending || isApprovingUSDC,
  };
}
