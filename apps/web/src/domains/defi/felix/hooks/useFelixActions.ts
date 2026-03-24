"use client";

import { useConfig } from "wagmi";
import { useChainWriteContract } from "@/shared/hooks/useChainWriteContract";
import { readContract, waitForTransactionReceipt } from "wagmi/actions";
import { FELIX } from "@/core/config/hyperevm";
import { BorrowerOperationsABI, HintHelpersABI, SortedTrovesABI } from "@/core/abis";
import { zeroAddress } from "viem";
import type { Address } from "viem";

// Zero address sentinel — branch not yet deployed
const ZERO = zeroAddress;

// HyperEVM chain id
const HYPEREVM_CHAIN_ID = 999;

export function useFelixActions(branch: "HYPE" = "HYPE") {
  const config = useConfig();
  const b = FELIX.branches[branch];

  // Guard: branch not yet deployed
  const isDeployed = b.borrowerOperations !== ZERO;

  const { writeContractAsync, isPending } = useChainWriteContract(HYPEREVM_CHAIN_ID);

  const readContractFn = (args: {
    address: `0x${string}`;
    abi: readonly unknown[];
    functionName: string;
    args: readonly unknown[];
  }) =>
    readContract(config, {
      address: args.address,
      abi: args.abi as never,
      functionName: args.functionName as never,
      args: args.args as never,
      chainId: HYPEREVM_CHAIN_ID,
    });

  const waitForReceipt = (hash: `0x${string}`) =>
    waitForTransactionReceipt(config, { hash });

  const openTrove = async (params: {
    owner: Address;
    ownerIndex?: bigint;
    coll: bigint;
    debt: bigint;
    rate: bigint;
    maxFee: bigint;
  }) => {
    if (!isDeployed) throw new Error("Felix HYPE branch not yet deployed");

    const ownerIndex = params.ownerIndex ?? 0n;

    // Get insert hints from HintHelpers (branchIdx 0 for HYPE)
    const approxHint = await readContractFn({
      address: FELIX.hintHelpers,
      abi: HintHelpersABI,
      functionName: "getApproxHint",
      args: [0n, params.rate, 10n, BigInt(Date.now())],
    }) as { hintAddress: bigint };

    const hints = await readContractFn({
      address: b.sortedTroves,
      abi: SortedTrovesABI,
      functionName: "findInsertPosition",
      args: [params.rate, approxHint.hintAddress, approxHint.hintAddress],
    }) as [bigint, bigint];

    const [upperHint, lowerHint] = hints;

    const hash = await writeContractAsync({
      address: b.borrowerOperations,
      abi: BorrowerOperationsABI,
      functionName: "openTrove",
      args: [
        params.owner,
        ownerIndex,
        params.coll,
        params.debt,
        upperHint,
        lowerHint,
        params.rate,
        params.maxFee,
        "0x0000000000000000000000000000000000000000" as Address,
        "0x0000000000000000000000000000000000000000" as Address,
        "0x0000000000000000000000000000000000000000" as Address,
      ],
    });
    await waitForReceipt(hash);
    return hash;
  };

  const adjustTrove = async (params: {
    troveId: bigint;
    collChange: bigint;
    isCollIncrease: boolean;
    debtChange: bigint;
    isDebtIncrease: boolean;
    maxUpfrontFee?: bigint;
  }) => {
    if (!isDeployed) throw new Error("Felix HYPE branch not yet deployed");

    const hash = await writeContractAsync({
      address: b.borrowerOperations,
      abi: BorrowerOperationsABI,
      functionName: "adjustTrove",
      args: [
        params.troveId,
        params.collChange,
        params.isCollIncrease,
        params.debtChange,
        params.isDebtIncrease,
        params.maxUpfrontFee ?? 0n,
      ],
    });
    await waitForReceipt(hash);
    return hash;
  };

  const closeTrove = async (troveId: bigint) => {
    if (!isDeployed) throw new Error("Felix HYPE branch not yet deployed");

    const hash = await writeContractAsync({
      address: b.borrowerOperations,
      abi: BorrowerOperationsABI,
      functionName: "closeTrove",
      args: [troveId],
    });
    await waitForReceipt(hash);
    return hash;
  };

  return {
    openTrove,
    adjustTrove,
    closeTrove,
    isPending,
    isDeployed,
  };
}
