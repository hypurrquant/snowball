"use client";

import { useConnection, useConfig } from "wagmi";
import { useChainWriteContract } from "@/shared/hooks/useChainWriteContract";
import { waitForTransactionReceipt } from "wagmi/actions";
import { LEND } from "@/core/config/addresses";
import { SnowballLendABI } from "@/core/abis";
import { useTokenApproval } from "@/shared/hooks/useTokenApproval";
import { getMarketParams } from "../lib/marketParams";
import type { MorphoMarket } from "../types";

export function useMorphoActions(market: MorphoMarket, onSuccess?: () => void) {
  const config = useConfig();
  const { address } = useConnection();
  const params = getMarketParams(market);

  const marketParamsTuple = {
    loanToken: params.loanToken,
    collateralToken: params.collateralToken,
    oracle: params.oracle,
    irm: params.irm,
    lltv: params.lltv,
  } as const;

  const { approve: approveLoan, isApproving: isApprovingLoan } = useTokenApproval({
    token: market.loanToken,
    spender: LEND.snowballLend,
    amount: undefined,
    owner: address,
  });

  const { approve: approveColl, isApproving: isApprovingColl } = useTokenApproval({
    token: market.collateralToken,
    spender: LEND.snowballLend,
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
      address: LEND.snowballLend,
      abi: SnowballLendABI,
      functionName: "supply",
      args: [marketParamsTuple, amount, 0n, address!, "0x"],
    });
    return waitAndCallback(hash);
  };

  const withdraw = async (amount: bigint) => {
    const hash = await writeContractAsync({
      address: LEND.snowballLend,
      abi: SnowballLendABI,
      functionName: "withdraw",
      args: [marketParamsTuple, amount, 0n, address!, address!],
    });
    return waitAndCallback(hash);
  };

  const supplyCollateral = async (amount: bigint) => {
    const hash = await writeContractAsync({
      address: LEND.snowballLend,
      abi: SnowballLendABI,
      functionName: "supplyCollateral",
      args: [marketParamsTuple, amount, address!, "0x"],
    });
    return waitAndCallback(hash);
  };

  const borrow = async (amount: bigint) => {
    const hash = await writeContractAsync({
      address: LEND.snowballLend,
      abi: SnowballLendABI,
      functionName: "borrow",
      args: [marketParamsTuple, amount, 0n, address!, address!],
    });
    return waitAndCallback(hash);
  };

  const repay = async (amount: bigint) => {
    const hash = await writeContractAsync({
      address: LEND.snowballLend,
      abi: SnowballLendABI,
      functionName: "repay",
      args: [marketParamsTuple, amount, 0n, address!, "0x"],
    });
    return waitAndCallback(hash);
  };

  const withdrawCollateral = async (amount: bigint) => {
    const hash = await writeContractAsync({
      address: LEND.snowballLend,
      abi: SnowballLendABI,
      functionName: "withdrawCollateral",
      args: [marketParamsTuple, amount, address!, address!],
    });
    return waitAndCallback(hash);
  };

  return {
    approveLoan,
    approveColl,
    supply,
    withdraw,
    supplyCollateral,
    borrow,
    repay,
    withdrawCollateral,
    isPending: isPending || isApprovingLoan || isApprovingColl,
  };
}
