import { useReadContract, useReadContracts, useAccount } from "wagmi";
import { ERC8004 } from "@/core/config/addresses";
import { IdentityRegistryABI } from "@/core/abis";
import { mapAgentResults } from "../lib/agentMapper";

export function useMyAgents() {
  const { address } = useAccount();

  const { data: agentIds, isLoading: isLoadingIds } = useReadContract({
    address: ERC8004.identityRegistry,
    abi: IdentityRegistryABI,
    functionName: "getOwnerAgents",
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });

  const ids = (agentIds as bigint[] | undefined) ?? [];

  const contracts = ids.map((id) => ({
    address: ERC8004.identityRegistry,
    abi: IdentityRegistryABI,
    functionName: "getAgentInfo" as const,
    args: [id] as const,
  }));

  const { data, isLoading: isLoadingInfos } = useReadContracts({
    contracts: contracts.length > 0 ? contracts : [],
    query: { enabled: contracts.length > 0, refetchInterval: 15_000 },
  });

  const myAgents = mapAgentResults(data, ids);

  return {
    myAgents,
    isLoading: isLoadingIds || isLoadingInfos,
  };
}
