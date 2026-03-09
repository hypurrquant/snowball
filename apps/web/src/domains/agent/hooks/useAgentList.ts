import { useReadContract, useReadContracts } from "wagmi";
import { ERC8004 } from "@/core/config/addresses";
import { IdentityRegistryABI } from "@/core/abis";
import { mapAgentResults } from "../lib/agentMapper";

export function useAgentList() {
  const { data: totalRaw, isLoading: isLoadingTotal } = useReadContract({
    address: ERC8004.identityRegistry,
    abi: IdentityRegistryABI,
    functionName: "totalAgents",
  });

  const total = totalRaw ? Number(totalRaw) : 0;

  const ids = Array.from({ length: total }, (_, i) => BigInt(i + 1));

  const contracts = ids.map((id) => ({
    address: ERC8004.identityRegistry,
    abi: IdentityRegistryABI,
    functionName: "getAgentInfo" as const,
    args: [id] as const,
  }));

  const { data, isLoading: isLoadingAgents } = useReadContracts({
    contracts: total > 0 ? contracts : [],
    query: { enabled: total > 0, refetchInterval: 15_000 },
  });

  const agents = mapAgentResults(data, ids);

  return {
    agents,
    total,
    isLoading: isLoadingTotal || isLoadingAgents,
  };
}
