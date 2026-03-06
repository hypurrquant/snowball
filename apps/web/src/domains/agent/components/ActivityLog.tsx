"use client";

import { useAccount } from "wagmi";
import { Card, CardHeader, CardTitle, CardContent } from "@/shared/components/ui/card";
import { Activity, RefreshCw } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { useAgentRuns } from "../hooks/useAgentRuns";
import { useActivityLog } from "../hooks/useActivityLog";

export function ActivityLog() {
  const { address } = useAccount();
  const { runs, isLoading: runsLoading, refetch: refetchRuns } = useAgentRuns(address);
  const { activities, isLoading: activitiesLoading, refetch: refetchActivities } = useActivityLog(address);

  const isLoading = runsLoading || activitiesLoading;

  const refetch = () => {
    refetchRuns();
    refetchActivities();
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Activity className="w-4 h-4 text-ice-400" />
            Activity Log
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={refetch} disabled={isLoading}>
            <RefreshCw className={`w-3 h-3 ${isLoading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Server Runs */}
        {runs.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
              Server Runs
            </h4>
            {runs.slice(0, 10).map((run) => (
              <div
                key={run.runId}
                className="flex items-center justify-between rounded-lg bg-bg-input px-3 py-2 text-xs"
              >
                <div className="flex items-center gap-2">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      run.status === "success"
                        ? "bg-green-400"
                        : run.status === "no_action"
                          ? "bg-yellow-400"
                          : "bg-red-400"
                    }`}
                  />
                  <span className="text-white font-mono">{run.runId.slice(0, 16)}...</span>
                </div>
                <div className="flex items-center gap-3 text-text-tertiary">
                  <span>{run.status}</span>
                  <span>{run.txHashes.length} tx</span>
                  <span>{new Date(run.timestamp).toLocaleTimeString()}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* On-chain Events */}
        {activities.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
              On-chain Events
            </h4>
            {activities.slice(0, 10).map((a, i) => (
              <div
                key={`${a.transactionHash}-${i}`}
                className="flex items-center justify-between rounded-lg bg-bg-input px-3 py-2 text-xs"
              >
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-ice-400" />
                  <span className="text-white font-mono">
                    {a.target.slice(0, 8)}...{a.selector}
                  </span>
                </div>
                <div className="text-text-tertiary font-mono">
                  {a.transactionHash.slice(0, 10)}...
                </div>
              </div>
            ))}
          </div>
        )}

        {runs.length === 0 && activities.length === 0 && !isLoading && (
          <p className="text-sm text-text-tertiary text-center py-4">
            No activity yet. Run the agent to see results here.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
