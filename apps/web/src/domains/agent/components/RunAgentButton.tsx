"use client";

import { useState } from "react";
import { useAccount } from "wagmi";
import { Button } from "@/shared/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/shared/components/ui/card";
import { Play, Loader2, CheckCircle, XCircle } from "lucide-react";
import { useRunAgent } from "../hooks/useRunAgent";

interface RunAgentButtonProps {
  agentEndpoint: `0x${string}`;
  manifestId?: string;
}

export function RunAgentButton({ agentEndpoint, manifestId = "snowball-demo-defi-manager" }: RunAgentButtonProps) {
  const { address } = useAccount();
  const { runAgent, data, isLoading, error } = useRunAgent();
  const [expanded, setExpanded] = useState(false);
  const [troveId, setTroveId] = useState("");

  const handleRun = async () => {
    if (!address) return;
    await runAgent({ user: address, manifestId, troveId: troveId || undefined });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Play className="w-4 h-4 text-ice-400" />
          Run Agent
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xs text-text-tertiary">
          Execute the agent once. It will observe on-chain state, plan actions, and execute transactions.
        </p>
        <input
          value={troveId}
          onChange={(e) => setTroveId(e.target.value)}
          inputMode="numeric"
          placeholder="Trove ID (required for Liquity runs)"
          className="w-full rounded-lg bg-bg-input border border-border px-3 py-2 text-sm text-white font-mono placeholder:text-text-tertiary"
        />
        <Button
          onClick={handleRun}
          disabled={isLoading || !address}
          className="w-full"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
              Running...
            </>
          ) : (
            <>
              <Play className="w-4 h-4 mr-2" />
              Run Agent
            </>
          )}
        </Button>

        {error && (
          <div className="flex items-start gap-2 text-red-400 text-xs">
            <XCircle className="w-4 h-4 mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {data && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm">
              {data.status === "success" || data.status === "no_action" ? (
                <CheckCircle className="w-4 h-4 text-green-400" />
              ) : (
                <XCircle className="w-4 h-4 text-red-400" />
              )}
              <span className="text-white font-medium">{data.status}</span>
              <span className="text-text-tertiary text-xs">{data.runId}</span>
            </div>
            {data.txHashes.length > 0 && (
              <div className="text-xs text-text-tertiary">
                Transactions: {data.txHashes.length}
              </div>
            )}
            {data.reasoning && (
              <button
                onClick={() => setExpanded(!expanded)}
                className="text-xs text-ice-400 hover:underline"
              >
                {expanded ? "Hide reasoning" : "Show reasoning"}
              </button>
            )}
            {expanded && data.reasoning && (
              <pre className="text-xs text-text-tertiary bg-bg-input rounded-lg p-3 overflow-x-auto whitespace-pre-wrap">
                {data.reasoning}
              </pre>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
