"use client";

import { useWriteContract, useAccount } from "wagmi";
import { usePublicClient } from "wagmi";
import { useState, useEffect, useCallback } from "react";
import { parseAbiItem, type Address } from "viem";
import { ERC8004 } from "@/core/config/addresses";
import { AgentVaultABI } from "@/core/abis";
import type { Permission } from "../types";

interface PermissionEntry {
  agent: Address;
  expiry: bigint;
  permission?: Permission;
}

export function useVaultPermission() {
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const [permissions, setPermissions] = useState<PermissionEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [fetchVersion, setFetchVersion] = useState(0);

  const fetchPermissions = useCallback(async () => {
    if (!address || !publicClient) return;

    setIsLoading(true);
    try {
      const logs = await publicClient.getLogs({
        address: ERC8004.agentVault,
        event: parseAbiItem(
          "event PermissionGranted(address indexed user, address indexed agent, uint256 expiry)"
        ),
        args: { user: address },
        fromBlock: 0n,
        toBlock: "latest",
      });

      // Deduplicate by agent (latest log wins)
      const agentMap = new Map<string, { agent: Address; expiry: bigint }>();
      for (const log of logs) {
        const agent = log.args.agent as Address;
        const expiry = log.args.expiry as bigint;
        agentMap.set(agent.toLowerCase(), { agent, expiry });
      }

      // Fetch current permission for each agent
      const entries: PermissionEntry[] = [];
      for (const { agent, expiry } of agentMap.values()) {
        try {
          const perm = await publicClient.readContract({
            address: ERC8004.agentVault,
            abi: AgentVaultABI,
            functionName: "getPermission",
            args: [address, agent],
          });
          entries.push({
            agent,
            expiry,
            permission: perm as unknown as Permission,
          });
        } catch {
          entries.push({ agent, expiry });
        }
      }

      setPermissions(entries);
    } catch {
      setPermissions([]);
    } finally {
      setIsLoading(false);
    }
  }, [address, publicClient]);

  useEffect(() => {
    fetchPermissions();
  }, [fetchPermissions, fetchVersion]);

  // WRITE: grantPermission
  const { writeContractAsync: grantAsync, isPending: isGrantPending } =
    useWriteContract();

  const grantPermission = async (params: {
    agent: Address;
    targets: Address[];
    functions: `0x${string}`[];
    cap: bigint;
    expiry: bigint;
  }) => {
    const result = await grantAsync({
      address: ERC8004.agentVault,
      abi: AgentVaultABI,
      functionName: "grantPermission",
      args: [
        params.agent,
        params.targets,
        params.functions,
        params.cap,
        params.expiry,
      ],
    });
    setFetchVersion((v) => v + 1);
    return result;
  };

  // WRITE: revokePermission
  const { writeContractAsync: revokeAsync, isPending: isRevokePending } =
    useWriteContract();

  const revokePermission = async (agent: Address) => {
    const result = await revokeAsync({
      address: ERC8004.agentVault,
      abi: AgentVaultABI,
      functionName: "revokePermission",
      args: [agent],
    });
    setFetchVersion((v) => v + 1);
    return result;
  };

  const refetch = () => setFetchVersion((v) => v + 1);

  return {
    permissions,
    isLoading,
    grantPermission,
    revokePermission,
    isGrantPending,
    isRevokePending,
    refetch,
  };
}
