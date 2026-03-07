"use client";

import { formatEther } from "viem";
import { Card, CardContent } from "@/shared/components/ui/card";
import { Loader2 } from "lucide-react";
import { useMultiChainBalances } from "../hooks/useMultiChainBalances";

const CHAINS = [
  { label: "CTC Testnet", token: "USDC", key: "ccUsdc" as const, color: "bg-blue-500" },
  { label: "Eth Sepolia", token: "DN", key: "sepoliaDN" as const, color: "bg-purple-500" },
  { label: "CTC USC Testnet", token: "DN", key: "uscDN" as const, color: "bg-green-500" },
];

export function ChainDashboard() {
  const { data, isLoading } = useMultiChainBalances();

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      {CHAINS.map((chain) => (
        <Card key={chain.key}>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className={`w-2 h-2 rounded-full ${chain.color}`} />
              <span className="text-xs text-text-tertiary">{chain.label}</span>
            </div>
            <div className="font-mono text-lg text-white">
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin text-text-tertiary" />
              ) : (
                <>{parseFloat(formatEther(data?.[chain.key] ?? 0n)).toFixed(2)}</>
              )}
            </div>
            <div className="text-xs text-text-tertiary">{chain.token}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
