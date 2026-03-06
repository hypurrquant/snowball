"use client";

import { useState, useEffect, useCallback } from "react";
import { usePublicClient } from "wagmi";
import { parseAbiItem, type Address } from "viem";
import { ERC8004 } from "@/core/config/addresses";

interface ActivityEntry {
  user: Address;
  agent: Address;
  target: Address;
  selector: `0x${string}`;
  value: bigint;
  blockNumber: bigint;
  transactionHash: `0x${string}`;
}

export function useActivityLog(user?: Address) {
  const publicClient = usePublicClient();
  const [activities, setActivities] = useState<ActivityEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchLogs = useCallback(async () => {
    if (!publicClient) return;

    setIsLoading(true);
    try {
      const logs = await publicClient.getLogs({
        address: ERC8004.agentVault,
        event: parseAbiItem(
          "event ExecutedOnBehalf(address indexed user, address indexed agent, address target, bytes4 selector, uint256 value)"
        ),
        args: user ? { user } : undefined,
        fromBlock: 0n,
        toBlock: "latest",
      });

      const entries: ActivityEntry[] = logs.map((log) => ({
        user: log.args.user as Address,
        agent: log.args.agent as Address,
        target: log.args.target as Address,
        selector: log.args.selector as `0x${string}`,
        value: log.args.value as bigint,
        blockNumber: log.blockNumber,
        transactionHash: log.transactionHash,
      }));

      // Newest first
      entries.reverse();
      setActivities(entries);
    } catch {
      setActivities([]);
    } finally {
      setIsLoading(false);
    }
  }, [publicClient, user]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  return { activities, isLoading, refetch: fetchLogs };
}
