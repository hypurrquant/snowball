"use client";

import { useState, useEffect } from "react";
import { useAccount } from "wagmi";
import { parseUnits, maxUint256, type Address } from "viem";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/shared/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/shared/components/ui/tabs";
import { Input } from "@/shared/components/ui/input";
import { Button } from "@/shared/components/ui/button";
import { Loader2 } from "lucide-react";
import { useTokenBalance } from "@/shared/hooks/useTokenBalance";
import { useTokenApproval } from "@/shared/hooks/useTokenApproval";
import { useVaultActions } from "../hooks/useVaultActions";
import { ERC8004, TOKEN_INFO } from "@/core/config/addresses";
import { formatTokenAmount } from "@/shared/lib/utils";

interface VaultDepositDialogProps {
  token: Address;
  symbol: string;
  vaultBalance: bigint;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  defaultTab?: "deposit" | "withdraw";
  onSuccess?: () => void;
}

export function VaultDepositDialog({
  token,
  symbol,
  vaultBalance,
  isOpen,
  onOpenChange,
  defaultTab = "deposit",
  onSuccess,
}: VaultDepositDialogProps) {
  const { address } = useAccount();
  const [activeTab, setActiveTab] = useState<"deposit" | "withdraw">(defaultTab);
  const [amount, setAmount] = useState("");

  useEffect(() => {
    if (isOpen) {
      setActiveTab(defaultTab);
      setAmount("");
    }
  }, [isOpen, defaultTab]);

  const decimals = TOKEN_INFO[token]?.decimals ?? 18;
  const parsedAmount =
    amount && !isNaN(Number(amount)) ? parseUnits(amount, decimals) : 0n;

  const { data: walletBalance } = useTokenBalance({ address, token });
  const { needsApproval, approve, isApproving } = useTokenApproval({
    token,
    spender: ERC8004.agentVault,
    amount: parsedAmount,
    owner: address,
  });

  const { deposit, withdraw, isDepositPending, isWithdrawPending } =
    useVaultActions();

  const handleApprove = async () => {
    try {
      await approve(maxUint256);
    } catch {
      // handled by wallet
    }
  };

  const handleDeposit = async () => {
    if (!parsedAmount) return;
    try {
      await deposit(token, parsedAmount);
      setAmount("");
      onSuccess?.();
      onOpenChange(false);
    } catch {
      // handled by wallet
    }
  };

  const handleWithdraw = async () => {
    if (!parsedAmount) return;
    try {
      await withdraw(token, parsedAmount);
      setAmount("");
      onSuccess?.();
      onOpenChange(false);
    } catch {
      // handled by wallet
    }
  };

  const canWithdraw = parsedAmount > 0n && parsedAmount <= vaultBalance;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-bg-card border-border">
        <DialogHeader>
          <DialogTitle>Vault — {symbol}</DialogTitle>
        </DialogHeader>

        <Tabs
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as "deposit" | "withdraw")}
        >
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="deposit">Deposit</TabsTrigger>
            <TabsTrigger value="withdraw">Withdraw</TabsTrigger>
          </TabsList>

          <TabsContent value="deposit" className="space-y-4 pt-4">
            <div className="rounded-xl bg-bg-input p-3">
              <div className="flex justify-between mb-1">
                <span className="text-xs text-text-tertiary">
                  Amount ({symbol})
                </span>
                {walletBalance && (
                  <button
                    onClick={() =>
                      setAmount(
                        formatTokenAmount(walletBalance.value, decimals, decimals).replace(
                          /,/g,
                          ""
                        )
                      )
                    }
                    className="text-xs text-text-secondary hover:text-ice-400"
                  >
                    Max: {formatTokenAmount(walletBalance.value, decimals, 4)}
                  </button>
                )}
              </div>
              <Input
                type="text"
                inputMode="decimal"
                placeholder="0.0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="border-0 bg-transparent text-lg font-mono p-0 h-auto focus-visible:ring-0"
              />
            </div>

            {needsApproval ? (
              <Button
                className="w-full"
                onClick={handleApprove}
                disabled={isApproving || !parsedAmount}
              >
                {isApproving && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Approve {symbol}
              </Button>
            ) : (
              <Button
                className="w-full"
                onClick={handleDeposit}
                disabled={isDepositPending || !parsedAmount}
              >
                {isDepositPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Deposit
              </Button>
            )}
          </TabsContent>

          <TabsContent value="withdraw" className="space-y-4 pt-4">
            <div className="rounded-xl bg-bg-input p-3">
              <div className="flex justify-between mb-1">
                <span className="text-xs text-text-tertiary">
                  Amount ({symbol})
                </span>
                <button
                  onClick={() => {
                    if (vaultBalance > 0n) {
                      setAmount(
                        formatTokenAmount(vaultBalance, decimals, decimals).replace(
                          /,/g,
                          ""
                        )
                      );
                    }
                  }}
                  className="text-xs text-text-secondary hover:text-ice-400"
                >
                  Max: {formatTokenAmount(vaultBalance, decimals, 4)}
                </button>
              </div>
              <Input
                type="text"
                inputMode="decimal"
                placeholder="0.0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="border-0 bg-transparent text-lg font-mono p-0 h-auto focus-visible:ring-0"
              />
            </div>

            {vaultBalance === 0n && (
              <p className="text-xs text-danger text-center">
                No balance to withdraw
              </p>
            )}

            <Button
              className="w-full"
              variant="secondary"
              onClick={handleWithdraw}
              disabled={isWithdrawPending || !canWithdraw}
            >
              {isWithdrawPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Withdraw
            </Button>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
