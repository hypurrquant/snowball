"use client";

import { useWriteContract, useConfig } from "wagmi";
import { readContract, waitForTransactionReceipt } from "wagmi/actions";
import { LIQUITY, TOKENS } from "@/core/config/addresses";
import {
  BorrowerOperationsABI,
  HintHelpersABI,
  SortedTrovesABI,
} from "@/core/abis";
import { useTokenApproval } from "@/shared/hooks/useTokenApproval";
import { getInsertPosition } from "../lib/liquityMath";
import type { Address } from "viem";
import { encodePacked, keccak256 } from "viem";

const BRANCH_INDEX: Record<string, bigint> = { wCTC: 0n, lstCTC: 1n };

// Liquity V2: gas compensation deposited to GasPool on openTrove, returned on closeTrove
const ETH_GAS_COMPENSATION = 200n * 10n ** 18n;

export function useTroveActions(
  branch: "wCTC" | "lstCTC",
  owner?: Address,
) {
  const config = useConfig();
  const b = LIQUITY.branches[branch];
  const collToken = branch === "wCTC" ? TOKENS.wCTC : TOKENS.lstCTC;

  const { needsApproval, approve, isApproving } = useTokenApproval({
    token: collToken,
    spender: b.borrowerOperations,
    amount: undefined,
    owner,
  });

  const { writeContractAsync, isPending } = useWriteContract();

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
    });

  const waitForReceipt = (hash: `0x${string}`) =>
    waitForTransactionReceipt(config, { hash });

  const openTrove = async (params: {
    coll: bigint;
    debt: bigint;
    rate: bigint;
    maxFee: bigint;
    ownerIndex?: bigint;
  }) => {
    const ownerIndex = params.ownerIndex ?? 0n;
    // Approve coll + gas compensation (200 CTC WETH deposited to GasPool)
    await approve(params.coll + ETH_GAS_COMPENSATION);

    const [upperHint, lowerHint] = await getInsertPosition(
      readContractFn,
      LIQUITY.shared.hintHelpers,
      b.sortedTroves,
      HintHelpersABI,
      SortedTrovesABI,
      BRANCH_INDEX[branch],
      params.rate,
    );

    const hash = await writeContractAsync({
      address: b.borrowerOperations,
      abi: BorrowerOperationsABI,
      functionName: "openTrove",
      args: [
        owner!,
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
  }) => {
    if (params.isCollIncrease && params.collChange > 0n) {
      await approve(params.collChange);
    }

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
        0n,
      ],
    });
    await waitForReceipt(hash);
    return hash;
  };

  const adjustInterestRate = async (params: {
    troveId: bigint;
    newRate: bigint;
    maxFee: bigint;
  }) => {
    const [upperHint, lowerHint] = await getInsertPosition(
      readContractFn,
      LIQUITY.shared.hintHelpers,
      b.sortedTroves,
      HintHelpersABI,
      SortedTrovesABI,
      BRANCH_INDEX[branch],
      params.newRate,
    );

    const hash = await writeContractAsync({
      address: b.borrowerOperations,
      abi: BorrowerOperationsABI,
      functionName: "adjustTroveInterestRate",
      args: [
        params.troveId,
        params.newRate,
        upperHint,
        lowerHint,
        params.maxFee,
      ],
    });
    await waitForReceipt(hash);
    return hash;
  };

  const closeTrove = async (troveId: bigint) => {
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
    adjustInterestRate,
    closeTrove,
    isPending: isPending || isApproving,
    needsApproval,
  };
}
