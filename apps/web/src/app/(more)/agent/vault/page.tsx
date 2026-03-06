"use client";

import { useState } from "react";
import Link from "next/link";
import { useAccount } from "wagmi";
import { Card, CardHeader, CardTitle, CardContent } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { ArrowLeft, Vault, ArrowUpDown } from "lucide-react";
import { useVaultBalance } from "@/domains/agent/hooks/useVaultBalance";
import { VaultDepositDialog } from "@/domains/agent/components/VaultDepositDialog";
import { PermissionList } from "@/domains/agent/components/PermissionList";
import { TOKEN_INFO } from "@/core/config/addresses";
import { formatTokenAmount } from "@/shared/lib/utils";
import type { Address } from "viem";

export default function VaultPage() {
  const { isConnected } = useAccount();
  const { balances, isLoading, refetch } = useVaultBalance();

  const [dialogState, setDialogState] = useState<{
    open: boolean;
    token: Address;
    symbol: string;
    balance: bigint;
    tab: "deposit" | "withdraw";
  }>({ open: false, token: "0x0", symbol: "", balance: 0n, tab: "deposit" });

  const openDialog = (
    token: Address,
    symbol: string,
    balance: bigint,
    tab: "deposit" | "withdraw"
  ) => {
    setDialogState({ open: true, token, symbol, balance, tab });
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      <Button variant="ghost" size="sm" asChild>
        <Link href="/agent">
          <ArrowLeft className="w-4 h-4 mr-1" />
          Back to Marketplace
        </Link>
      </Button>

      <h1 className="text-2xl font-bold flex items-center gap-2 text-white">
        <Vault className="w-6 h-6 text-ice-400" />
        Agent Vault
      </h1>

      {!isConnected ? (
        <Card>
          <CardContent className="py-12 text-center text-text-secondary">
            Connect wallet to manage your vault
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Token Balances */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Vault Balances</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3, 4].map((i) => (
                    <Skeleton key={i} className="h-14 w-full" />
                  ))}
                </div>
              ) : (
                <div className="space-y-2">
                  {balances.map((b) => {
                    const decimals =
                      TOKEN_INFO[b.token]?.decimals ?? 18;
                    return (
                      <div
                        key={b.token}
                        className="flex items-center justify-between rounded-xl bg-bg-input p-4"
                      >
                        <div>
                          <span className="font-semibold text-white">
                            {b.symbol}
                          </span>
                          <div className="text-sm font-mono text-text-secondary">
                            {formatTokenAmount(b.balance, decimals, 4)}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() =>
                              openDialog(
                                b.token as Address,
                                b.symbol,
                                b.balance,
                                "deposit"
                              )
                            }
                          >
                            Deposit
                          </Button>
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() =>
                              openDialog(
                                b.token as Address,
                                b.symbol,
                                b.balance,
                                "withdraw"
                              )
                            }
                          >
                            Withdraw
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Permissions */}
          <PermissionList />
        </>
      )}

      <VaultDepositDialog
        token={dialogState.token as Address}
        symbol={dialogState.symbol}
        vaultBalance={dialogState.balance}
        isOpen={dialogState.open}
        onOpenChange={(open) =>
          setDialogState((s) => ({ ...s, open }))
        }
        defaultTab={dialogState.tab}
        onSuccess={refetch}
      />
    </div>
  );
}
