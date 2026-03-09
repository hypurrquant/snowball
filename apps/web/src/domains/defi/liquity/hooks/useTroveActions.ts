"use client";

import { useConfig } from "wagmi";
import { useChainWriteContract } from "@/shared/hooks/useChainWriteContract";
import { readContract, waitForTransactionReceipt } from "wagmi/actions";
import { LIQUITY, TOKENS } from "@/core/config/addresses";
import {
  BorrowerOperationsABI,
  HintHelpersABI,
  SortedTrovesABI,
} from "@/core/abis";
import { useTokenApproval } from "@/shared/hooks/useTokenApproval";
import { getInsertPosition } from "../lib/liquityMath";
import { BRANCH_INDEX, ETH_GAS_COMPENSATION } from "../lib/constants";
import type { Address } from "viem";
import { encodePacked, keccak256 } from "viem";

// Re-export for backward compatibility (useEditTrove imports from here)
export { ETH_GAS_COMPENSATION } from "../lib/constants";

export function useTroveActions(
  branch: "wCTC" | "lstCTC",
  owner?: Address,
  collAmount?: bigint,
) {
  const config = useConfig();
  const b = LIQUITY.branches[branch];
  const collToken = branch === "wCTC" ? TOKENS.wCTC : TOKENS.lstCTC;

  // wCTC branch: approve collAmount + gasComp (same token)
  // lstCTC branch: approve collAmount only (gas comp is separate wCTC approval)
  const collApprovalAmount =
    collAmount && collAmount > 0n
      ? branch === "wCTC"
        ? collAmount + ETH_GAS_COMPENSATION
        : collAmount
      : undefined;

  const { needsApproval: needsCollApproval, approve: approveColl, isApproving: isApprovingColl } =
    useTokenApproval({
      token: collToken,
      spender: b.borrowerOperations,
      amount: collApprovalAmount,
      owner,
    });

  // lstCTC branch needs separate wCTC approval for gas compensation
  const { needsApproval: needsGasApproval, approve: approveGas, isApproving: isApprovingGas } =
    useTokenApproval({
      token: TOKENS.wCTC,
      spender: b.borrowerOperations,
      amount: branch === "lstCTC" ? ETH_GAS_COMPENSATION : undefined,
      owner,
    });

  const { writeContractAsync, isPending } = useChainWriteContract();

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
    maxUpfrontFee?: bigint;
  }) => {
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
    approveCollateral: approveColl,
    approveGasComp: approveGas,
    openTrove,
    adjustTrove,
    adjustInterestRate,
    closeTrove,
    isPending: isPending || isApprovingColl || isApprovingGas,
    needsCollApproval,
    needsGasApproval,
    needsApproval: needsCollApproval || needsGasApproval,
  };
}
