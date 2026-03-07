"use client";

import { useQuery } from "@tanstack/react-query";
import { erc20Abi, type Address } from "viem";
import { useAccount } from "wagmi";
import { ccClient, sepoliaClient, uscClient, bridgeContracts } from "../lib/bridgeConfig";
import { BRIDGE } from "@/core/config/addresses";

interface MultiChainBalances {
  ccUsdc: bigint;
  sepoliaDN: bigint;
  uscDN: bigint;
}

export function useMultiChainBalances() {
  const { address } = useAccount();

  return useQuery<MultiChainBalances>({
    queryKey: ["bridge-balances", address],
    queryFn: async () => {
      if (!address) return { ccUsdc: 0n, sepoliaDN: 0n, uscDN: 0n };

      const [ccUsdc, sepoliaDN, uscDN] = await Promise.all([
        ccClient.readContract({
          address: bridgeContracts.usdc.address,
          abi: erc20Abi,
          functionName: "balanceOf",
          args: [address],
        }),
        sepoliaClient.readContract({
          address: bridgeContracts.dnToken.address,
          abi: [{
            type: "function",
            name: "balanceOf",
            inputs: [{ name: "account", type: "address" }],
            outputs: [{ name: "", type: "uint256" }],
            stateMutability: "view",
          }] as const,
          functionName: "balanceOf",
          args: [address],
        }),
        uscClient.readContract({
          address: BRIDGE.dnBridgeUSC as Address,
          abi: [{
            type: "function",
            name: "balanceOf",
            inputs: [{ name: "account", type: "address" }],
            outputs: [{ name: "", type: "uint256" }],
            stateMutability: "view",
          }] as const,
          functionName: "balanceOf",
          args: [address],
        }).catch(() => 0n), // USC DN balance may not exist yet
      ]);

      return { ccUsdc, sepoliaDN, uscDN };
    },
    enabled: !!address,
    refetchInterval: 15_000,
  });
}
