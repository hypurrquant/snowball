"use client";

import { Card, CardHeader, CardTitle, CardContent } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { Shield, Loader2, X } from "lucide-react";
import { formatEther, type Address } from "viem";
import { useVaultPermission } from "../hooks/useVaultPermission";

export function PermissionList() {
  const { permissions, isLoading, revokePermission, isRevokePending } =
    useVaultPermission();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-40" />
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    );
  }

  const handleRevoke = async (agent: Address) => {
    try {
      await revokePermission(agent);
    } catch {
      // handled by wallet
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Shield className="w-4 h-4 text-ice-400" />
          Granted Permissions ({permissions.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        {permissions.length === 0 ? (
          <div className="text-center py-6 text-text-tertiary text-sm">
            No permissions granted yet
          </div>
        ) : (
          <div className="space-y-3">
            {permissions.map((entry) => {
              const isActive = entry.permission?.active ?? false;
              const isExpired =
                entry.expiry > 0n &&
                entry.expiry < BigInt(Math.floor(Date.now() / 1000));
              const shortAgent = `${entry.agent.slice(0, 6)}...${entry.agent.slice(-4)}`;

              return (
                <div
                  key={entry.agent}
                  className="rounded-xl bg-bg-input p-4 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-mono text-white">
                      {shortAgent}
                    </span>
                    <div className="flex items-center gap-2">
                      {isExpired ? (
                        <Badge variant="secondary" className="text-danger">
                          Expired
                        </Badge>
                      ) : isActive ? (
                        <Badge>Active</Badge>
                      ) : (
                        <Badge variant="secondary">Revoked</Badge>
                      )}
                    </div>
                  </div>

                  {entry.permission && (
                    <div className="text-xs text-text-tertiary space-y-1">
                      <div className="flex justify-between">
                        <span>Targets</span>
                        <span className="font-mono">
                          {entry.permission.allowedTargets.map((t) => `${t.slice(0, 6)}...${t.slice(-4)}`).join(", ")}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Functions</span>
                        <span className="font-mono">
                          {entry.permission.allowedFunctions.map((f) => f.slice(0, 10)).join(", ")}
                        </span>
                      </div>
                      {entry.permission.tokenAllowances.length > 0 && (
                        <div className="space-y-1 pt-1 border-t border-border/50">
                          <span className="text-text-secondary">Token Caps</span>
                          {entry.permission.tokenAllowances
                            .filter((ta) => ta.cap > 0n)
                            .map((ta) => (
                              <div key={ta.token} className="flex justify-between pl-2">
                                <span className="font-mono">{ta.token.slice(0, 6)}...{ta.token.slice(-4)}</span>
                                <span className="font-mono">
                                  {formatEther(ta.spent)}/{formatEther(ta.cap)}
                                </span>
                              </div>
                            ))}
                          {entry.permission.tokenAllowances.every((ta) => ta.cap === 0n) && (
                            <span className="pl-2 text-text-tertiary">No token caps (execution only)</span>
                          )}
                        </div>
                      )}
                      {entry.expiry > 0n && (
                        <div className="flex justify-between">
                          <span>Expires</span>
                          <span>
                            {new Date(
                              Number(entry.expiry) * 1000
                            ).toLocaleDateString()}
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  {isActive && !isExpired && (
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleRevoke(entry.agent)}
                      disabled={isRevokePending}
                      className="w-full"
                    >
                      {isRevokePending ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <X className="w-3 h-3" />
                      )}
                      Revoke
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
