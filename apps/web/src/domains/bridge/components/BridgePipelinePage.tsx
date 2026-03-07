"use client";

import { useState } from "react";
import { parseEther } from "viem";
import { useAccount } from "wagmi";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Loader2, Link2 } from "lucide-react";
import { ChainDashboard } from "./ChainDashboard";
import { PipelineProgress } from "./PipelineProgress";
import { useBridgePipeline } from "../hooks/useBridgePipeline";

export function BridgePipelinePage() {
  const { isConnected } = useAccount();
  const { steps, phase, amount: recoveredAmount, execute, retry, reset, isExecuting } = useBridgePipeline();
  const [amountStr, setAmountStr] = useState("");

  const parsedAmount = amountStr ? parseEther(amountStr) : 0n;
  const canStart = isConnected && parsedAmount > 0n && phase === "idle" && !isExecuting;
  // Resumable mid-phases detected on mount (e.g. user refreshed during a step)
  const isResumable = ["deposit", "mint", "burn"].includes(phase) && !isExecuting;
  const hasProgress = steps.some((s) => s.status !== "pending");

  const handleStart = () => {
    if (!canStart) return;
    execute(parsedAmount);
  };

  const handleResume = () => {
    if (!isResumable) return;
    // Use recovered amount from session/events; execute() will use it via internal state
    execute(recoveredAmount);
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Link2 className="w-6 h-6 text-ice-400" />
          DN Crosschain Bridge
        </h1>
        <p className="text-sm text-text-tertiary mt-1">
          USDC (CTC Testnet) → DN (Eth Sepolia) → DN (CTC USC Testnet)
        </p>
      </div>

      {/* Chain Dashboard */}
      <ChainDashboard />

      {/* Bridge Card */}
      <Card>
        <CardHeader>
          <CardTitle>Bridge Pipeline</CardTitle>
          <CardDescription>
            Transfer USDC via Wormhole across chains with automatic attestation
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!isConnected ? (
            <div className="text-center py-8 text-text-secondary">
              Connect wallet to start bridging
            </div>
          ) : (
            <>
              {/* Amount input */}
              {phase === "idle" && (
                <div className="space-y-2">
                  <label className="text-sm text-text-secondary">Amount (USDC)</label>
                  <Input
                    type="number"
                    placeholder="0.00"
                    className="font-mono"
                    value={amountStr}
                    onChange={(e) => setAmountStr(e.target.value)}
                    disabled={isExecuting}
                  />
                </div>
              )}

              {/* Pipeline progress — show whenever there are completed/executing steps */}
              {hasProgress && (
                <PipelineProgress steps={steps} />
              )}

              {/* Status messages */}
              {phase === "done" && (
                <div className="text-center py-4 text-green-400 text-sm font-medium">
                  Bridge complete! DN tokens are now on USC Testnet.
                </div>
              )}

              {phase === "timeout" && (
                <div className="text-center py-4 text-yellow-400 text-sm">
                  Attestation is taking longer than expected. The network may be congested.
                  Your tokens are safe — the USC mint will complete when attestation finishes.
                </div>
              )}

              {phase === "error" && (
                <div className="text-center py-4 space-y-2">
                  <p className="text-red-400 text-sm">Transaction failed. You can retry from the failed step.</p>
                  <Button variant="secondary" size="sm" onClick={retry}>
                    Retry
                  </Button>
                </div>
              )}

              {/* Action buttons */}
              <div className="flex gap-2">
                {phase === "idle" && !hasProgress && (
                  <Button className="w-full" onClick={handleStart} disabled={!canStart}>
                    {isExecuting && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                    Start Bridge
                  </Button>
                )}
                {isResumable && (
                  <Button className="w-full" onClick={handleResume}>
                    Continue from {phase === "deposit" ? "Wormhole Transfer" : phase === "mint" ? "Mint" : "Burn"}
                  </Button>
                )}
                {(phase === "done" || phase === "error" || phase === "timeout") && (
                  <Button variant="outline" className="w-full" onClick={reset}>
                    New Bridge
                  </Button>
                )}
                {/* Safety valve: always show reset when there's progress but no primary action */}
                {hasProgress && !isResumable && phase !== "done" && phase !== "error" && phase !== "timeout" && phase !== "attestWait" && !isExecuting && (
                  <Button variant="outline" className="w-full" onClick={reset}>
                    Reset
                  </Button>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
