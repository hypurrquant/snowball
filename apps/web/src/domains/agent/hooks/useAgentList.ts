import { useReadContract, useReadContracts } from "wagmi";
import { ERC8004 } from "@/core/config/addresses";
import { IdentityRegistryABI } from "@/core/abis";
import type { AgentInfo } from "../types";

export function useAgentList() {
  const { data: totalRaw, isLoading: isLoadingTotal } = useReadContract({
    address: ERC8004.identityRegistry,
    abi: IdentityRegistryABI,
    functionName: "totalAgents",
  });

  const total = totalRaw ? Number(totalRaw) : 0;

  const contracts = Array.from({ length: total }, (_, i) => ({
    address: ERC8004.identityRegistry,
    abi: IdentityRegistryABI,
    functionName: "getAgentInfo" as const,
    args: [BigInt(i + 1)] as const,
  }));

  const { data, isLoading: isLoadingAgents } = useReadContracts({
    contracts: total > 0 ? contracts : [],
    query: { enabled: total > 0, refetchInterval: 15_000 },
  });

  const agents = data
    ?.map((d, i) => {
      if (d.status !== "success" || !d.result) return null;
      const info = d.result as unknown as AgentInfo;
      return { id: BigInt(i + 1), ...info };
    })
    .filter(Boolean) as Array<AgentInfo & { id: bigint }> | undefined;

  return {
    agents: agents ?? [],
    total,
    isLoading: isLoadingTotal || isLoadingAgents,
  };
}
