"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { useConnection } from "wagmi";
import { parseEther } from "viem";
import { toast } from "sonner";
import {
  Card, CardHeader, CardTitle, CardContent, CardDescription,
} from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { StatCard } from "@/shared/components/common/StatCard";
import { useStabilityPool } from "@/domains/defi/liquity/hooks/useStabilityPool";
import { useTokenBalance } from "@/shared/hooks/useTokenBalance";
import { TOKENS } from "@/core/config/addresses";
import { formatTokenAmount } from "@/shared/lib/utils";
import { DollarSign, Percent, Gift, Loader2 } from "lucide-react";

export default function LiquityEarnPage() {
  const searchParams = useSearchParams();
  const branch = (searchParams.get("branch") as "wCTC" | "lstCTC") ?? "wCTC";
  const { address, isConnected } = useConnection();

  const { position, isLoading, deposit, withdraw, claimAll, isPending } =
    useStabilityPool(branch);
  const { data: sbUSDBalance, refetch: refetchBalance } = useTokenBalance({ address, token: TOKENS.sbUSD });

  const [depositAmount, setDepositAmount] = useState("");
  const [withdrawAmount, setWithdrawAmount] = useState("");

  const handleDeposit = async () => {
    if (!depositAmount) return;
    try {
      await deposit(parseEther(depositAmount));
      setDepositAmount("");
      refetchBalance();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Deposit failed");
    }
  };

  const handleWithdraw = async () => {
    if (!withdrawAmount) return;
    try {
      await withdraw(parseEther(withdrawAmount));
      setWithdrawAmount("");
      refetchBalance();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Withdraw failed");
    }
  };

  const handleClaim = async () => {
    try {
      await claimAll();
      refetchBalance();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Claim failed");
    }
  };

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard
          label="Pool Size"
          value={position.totalDeposits > 0n ? formatTokenAmount(position.totalDeposits, 18, 2) : "\u2014"}
          sub="sbUSD"
          icon={<DollarSign className="w-4 h-4" />}
          loading={isLoading}
        />
        <StatCard
          label="Your Deposit"
          value={position.userDeposit > 0n ? formatTokenAmount(position.userDeposit, 18, 4) : "\u2014"}
          sub="sbUSD"
          icon={<Percent className="w-4 h-4" />}
          loading={isLoading}
        />
        <StatCard
          label="Coll. Gain"
          value={position.collGain > 0n ? formatTokenAmount(position.collGain, 18, 6) : "\u2014"}
          sub={branch}
          icon={<Gift className="w-4 h-4" />}
          loading={isLoading}
        />
      </div>

      {/* Deposit / Withdraw */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Deposit sbUSD</CardTitle>
            <CardDescription>Earn {branch} from liquidations</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="rounded-xl bg-bg-input p-3">
              <div className="flex justify-between mb-1">
                <span className="text-xs text-text-tertiary">Amount</span>
                {sbUSDBalance && (
                  <button
                    onClick={() =>
                      setDepositAmount(
                        formatTokenAmount(sbUSDBalance.value, 18, 18).replace(/,/g, "")
                      )
                    }
                    className="text-xs text-text-secondary hover:text-ice-400"
                  >
                    Max: {formatTokenAmount(sbUSDBalance.value, 18, 4)}
                  </button>
                )}
              </div>
              <Input
                type="text"
                inputMode="decimal"
                placeholder="0.0"
                value={depositAmount}
                onChange={(e) => setDepositAmount(e.target.value)}
                className="border-0 bg-transparent text-lg font-mono p-0 h-auto"
              />
            </div>
            <Button
              className="w-full"
              onClick={handleDeposit}
              disabled={!isConnected || !depositAmount || isPending}
            >
              {isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              {!isConnected ? "Connect Wallet" : "Deposit"}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Withdraw sbUSD</CardTitle>
            <CardDescription>Withdraw your deposit + claim gains</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="rounded-xl bg-bg-input p-3">
              <div className="flex justify-between mb-1">
                <span className="text-xs text-text-tertiary">Amount</span>
                {position.userDeposit > 0n && (
                  <button
                    onClick={() =>
                      setWithdrawAmount(
                        formatTokenAmount(position.userDeposit, 18, 18).replace(/,/g, "")
                      )
                    }
                    className="text-xs text-text-secondary hover:text-ice-400"
                  >
                    Max: {formatTokenAmount(position.userDeposit, 18, 4)}
                  </button>
                )}
              </div>
              <Input
                type="text"
                inputMode="decimal"
                placeholder="0.0"
                value={withdrawAmount}
                onChange={(e) => setWithdrawAmount(e.target.value)}
                className="border-0 bg-transparent text-lg font-mono p-0 h-auto"
              />
            </div>
            <div className="flex gap-2">
              <Button
                className="flex-1"
                variant="secondary"
                onClick={handleWithdraw}
                disabled={!isConnected || !withdrawAmount || isPending}
              >
                {isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                Withdraw
              </Button>
              <Button
                variant="default"
                onClick={handleClaim}
                disabled={
                  !isConnected || !position.collGain || position.collGain === 0n || isPending
                }
              >
                {isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                Claim
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
