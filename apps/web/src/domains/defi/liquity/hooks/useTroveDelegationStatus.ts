"use client";

import { useMemo } from "react";
import { useReadContracts } from "wagmi";
import { LIQUITY } from "@/core/config/addresses";
import { AddRemoveManagersABI, InterestDelegateABI } from "@/core/abis";
import { ERC8004 } from "@snowball/core";
import type { Address } from "viem";

export interface TroveDelegationInfo {
  isAddManager: boolean;
  isInterestDelegate: boolean;
  isDelegated: boolean;
}

export function useTroveDelegationStatus(
  branch: "wCTC" | "lstCTC",
  troveIds: bigint[],
) {
  const b = LIQUITY.branches[branch];
  const agentVault = LIQUITY.shared.agentVault;

  const contracts = useMemo(
    () =>
      troveIds.flatMap((troveId) => [
        {
          address: b.borrowerOperations as Address,
          abi: AddRemoveManagersABI,
          functionName: "addManagerOf" as const,
          args: [troveId] as const,
        },
        {
          address: b.borrowerOperations as Address,
          abi: InterestDelegateABI,
          functionName: "getInterestIndividualDelegateOf" as const,
          args: [troveId] as const,
        },
      ]),
    [b.borrowerOperations, troveIds],
  );

  const { data, isLoading } = useReadContracts({
    contracts,
    query: {
      enabled: troveIds.length > 0,
      refetchInterval: 30_000,
    },
  });

  const delegationMap = useMemo(() => {
    const map = new Map<string, TroveDelegationInfo>();
    if (!data) return map;

    for (let i = 0; i < troveIds.length; i++) {
      const addManagerResult = data[i * 2];
      const delegateResult = data[i * 2 + 1];

      const addManager =
        addManagerResult?.status === "success"
          ? (addManagerResult.result as Address)
          : undefined;
      const delegateInfo =
        delegateResult?.status === "success"
          ? (delegateResult.result as {
              account: Address;
              minInterestRate: bigint;
              maxInterestRate: bigint;
              minInterestRateChangePeriod: bigint;
            })
          : undefined;

      const isAddManager =
        !!addManager &&
        addManager.toLowerCase() === agentVault.toLowerCase();
      const isInterestDelegate =
        !!delegateInfo &&
        delegateInfo.account.toLowerCase() === agentVault.toLowerCase();
      const isDelegated = isAddManager && isInterestDelegate;

      map.set(troveIds[i].toString(), {
        isAddManager,
        isInterestDelegate,
        isDelegated,
      });
    }
    return map;
  }, [data, troveIds, agentVault]);

  return { delegationMap, isLoading };
}
