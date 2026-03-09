import { useReadContracts } from "wagmi";
import { ERC8004 } from "@/core/config/addresses";
import {
  IdentityRegistryABI,
  ReputationRegistryABI,
  ValidationRegistryABI,
} from "@/core/abis";
import type { AgentInfo, ReputationData, Review, Validation } from "../types";
import type { Address } from "viem";
import { GENERAL_TAG } from "../lib/constants";

export function useAgentProfile(agentId: bigint | undefined) {
  const enabled = agentId !== undefined && agentId > 0n;

  const contracts = enabled
    ? [
        {
          address: ERC8004.identityRegistry,
          abi: IdentityRegistryABI,
          functionName: "getAgentInfo" as const,
          args: [agentId] as const,
        },
        {
          address: ERC8004.identityRegistry,
          abi: IdentityRegistryABI,
          functionName: "ownerOf" as const,
          args: [agentId] as const,
        },
        {
          address: ERC8004.reputationRegistry,
          abi: ReputationRegistryABI,
          functionName: "getReputation" as const,
          args: [agentId, GENERAL_TAG] as const,
        },
        {
          address: ERC8004.reputationRegistry,
          abi: ReputationRegistryABI,
          functionName: "getSuccessRate" as const,
          args: [agentId, GENERAL_TAG] as const,
        },
        {
          address: ERC8004.reputationRegistry,
          abi: ReputationRegistryABI,
          functionName: "getReviews" as const,
          args: [agentId] as const,
        },
        {
          address: ERC8004.validationRegistry,
          abi: ValidationRegistryABI,
          functionName: "isValidated" as const,
          args: [agentId] as const,
        },
        {
          address: ERC8004.validationRegistry,
          abi: ValidationRegistryABI,
          functionName: "getValidation" as const,
          args: [agentId] as const,
        },
      ]
    : [];

  const { data, isLoading, refetch } = useReadContracts({
    contracts,
    query: { enabled, refetchInterval: 15_000 },
  });

  const rawAgent =
    data?.[0]?.status === "success"
      ? (data[0].result as unknown as AgentInfo)
      : undefined;

  // Detect non-existent agent: zero-value struct has empty name
  const agent =
    rawAgent && rawAgent.name !== "" ? rawAgent : undefined;

  const owner =
    data?.[1]?.status === "success"
      ? (data[1].result as Address)
      : undefined;

  const reputation =
    data?.[2]?.status === "success"
      ? (data[2].result as unknown as ReputationData)
      : undefined;

  const successRate =
    data?.[3]?.status === "success"
      ? (data[3].result as bigint)
      : undefined;

  const reviews =
    data?.[4]?.status === "success"
      ? (data[4].result as unknown as Review[])
      : undefined;

  const isValidated =
    data?.[5]?.status === "success"
      ? (data[5].result as boolean)
      : false;

  const validation =
    data?.[6]?.status === "success"
      ? (data[6].result as unknown as Validation)
      : undefined;

  return {
    agent,
    owner,
    reputation,
    successRate,
    reviews: reviews ?? [],
    isValidated,
    validation,
    isLoading,
    refetch,
  };
}
