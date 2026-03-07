"use client";

import { useConfig } from "wagmi";
import { useChainWriteContract } from "@/shared/hooks/useChainWriteContract";
import { readContract, waitForTransactionReceipt } from "wagmi/actions";
import { LIQUITY } from "@/core/config/addresses";
import { AddRemoveManagersABI, InterestDelegateABI } from "@/core/abis";
import type { Address } from "viem";

export function useTroveDelegate(branch: "wCTC" | "lstCTC") {
  const config = useConfig();
  const b = LIQUITY.branches[branch];
  const { writeContractAsync, isPending } = useChainWriteContract();

  const waitForReceipt = (hash: `0x${string}`) =>
    waitForTransactionReceipt(config, { hash });

  const setAddManager = async (troveId: bigint, manager: Address) => {
    const hash = await writeContractAsync({
      address: b.borrowerOperations,
      abi: AddRemoveManagersABI,
      functionName: "setAddManager",
      args: [troveId, manager],
    });
    await waitForReceipt(hash);
    return hash;
  };

  const setRemoveManagerWithReceiver = async (
    troveId: bigint,
    manager: Address,
    receiver: Address,
  ) => {
    const hash = await writeContractAsync({
      address: b.borrowerOperations,
      abi: AddRemoveManagersABI,
      functionName: "setRemoveManagerWithReceiver",
      args: [troveId, manager, receiver],
    });
    await waitForReceipt(hash);
    return hash;
  };

  const setInterestIndividualDelegate = async (params: {
    troveId: bigint;
    delegate: Address;
    minInterestRate: bigint;
    maxInterestRate: bigint;
    newAnnualInterestRate: bigint;
    upperHint: bigint;
    lowerHint: bigint;
    maxUpfrontFee: bigint;
    minInterestRateChangePeriod: bigint;
  }) => {
    const hash = await writeContractAsync({
      address: b.borrowerOperations,
      abi: InterestDelegateABI,
      functionName: "setInterestIndividualDelegate",
      args: [
        params.troveId,
        params.delegate,
        params.minInterestRate,
        params.maxInterestRate,
        params.newAnnualInterestRate,
        params.upperHint,
        params.lowerHint,
        params.maxUpfrontFee,
        params.minInterestRateChangePeriod,
      ],
    });
    await waitForReceipt(hash);
    return hash;
  };

  const getInterestIndividualDelegateOf = async (troveId: bigint) => {
    const result = await readContract(config, {
      address: b.borrowerOperations,
      abi: InterestDelegateABI,
      functionName: "getInterestIndividualDelegateOf",
      args: [troveId],
    });
    return result as {
      account: Address;
      minInterestRate: bigint;
      maxInterestRate: bigint;
      minInterestRateChangePeriod: bigint;
    };
  };

  const removeInterestIndividualDelegate = async (troveId: bigint) => {
    const hash = await writeContractAsync({
      address: b.borrowerOperations,
      abi: InterestDelegateABI,
      functionName: "removeInterestIndividualDelegate",
      args: [troveId],
    });
    await waitForReceipt(hash);
    return hash;
  };

  const fullUndelegate = async (troveId: bigint, receiver: Address, manager: Address) => {
    await setRemoveManagerWithReceiver(troveId, manager, receiver);
    await removeInterestIndividualDelegate(troveId);
  };

  const getAddManagerOf = async (troveId: bigint) => {
    const result = await readContract(config, {
      address: b.borrowerOperations,
      abi: AddRemoveManagersABI,
      functionName: "addManagerOf",
      args: [troveId],
    });
    return result as Address;
  };

  return {
    setAddManager,
    setRemoveManagerWithReceiver,
    setInterestIndividualDelegate,
    removeInterestIndividualDelegate,
    fullUndelegate,
    getInterestIndividualDelegateOf,
    getAddManagerOf,
    isPending,
  };
}
