"use client";

import { useState } from "react";
import { useConnection, useReadContract, useWriteContract } from "wagmi";
import { useTokenBalance } from "@/hooks/useTokenBalance";
import { parseEther } from "viem";
import {
  Card, CardHeader, CardTitle, CardContent, CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StatCard } from "@/components/common/StatCard";
import { LIQUITY, TOKENS } from "@/config/addresses";
import { StabilityPoolABI } from "@/abis";
import { formatTokenAmount } from "@/lib/utils";
import { Percent, DollarSign, Gift, Loader2 } from "lucide-react";

const BRANCHES = [
  { key: "wCTC" as const, label: "wCTC" },
  { key: "lstCTC" as const, label: "lstCTC" },
];

export default function EarnPage() {
  const { address, isConnected } = useConnection();
  const [selectedBranch, setSelectedBranch] = useState<"wCTC" | "lstCTC">("wCTC");
  const [depositAmount, setDepositAmount] = useState("");
  const [withdrawAmount, setWithdrawAmount] = useState("");

  const branch = LIQUITY.branches[selectedBranch];

  // Pool total
  const { data: totalDeposits } = useReadContract({
    address: branch.stabilityPool,
    abi: StabilityPoolABI,
    functionName: "getTotalBoldDeposits",
    query: { refetchInterval: 10_000 },
  });

  // User deposit
  const { data: userDeposit } = useReadContract({
    address: branch.stabilityPool,
    abi: StabilityPoolABI,
    functionName: "getCompoundedBoldDeposit",
    args: [address!],
    query: { enabled: !!address, refetchInterval: 10_000 },
  });

  // User collateral gain
  const { data: collGain } = useReadContract({
    address: branch.stabilityPool,
    abi: StabilityPoolABI,
    functionName: "getDepositorCollGain",
    args: [address!],
    query: { enabled: !!address, refetchInterval: 10_000 },
  });

  const { data: sbUSDBalance } = useTokenBalance({
    address,
    token: TOKENS.sbUSD,
  });

  // Write contracts
  const { writeContractAsync: provideAsync, isPending: isProvidePending } =
    useWriteContract();
  const { writeContractAsync: withdrawAsync, isPending: isWithdrawPending } =
    useWriteContract();
  const { writeContractAsync: claimAsync, isPending: isClaimPending } =
    useWriteContract();

  const handleDeposit = async () => {
    if (!depositAmount) return;
    try {
      await provideAsync({
        address: branch.stabilityPool,
        abi: StabilityPoolABI,
        functionName: "provideToSP",
        args: [parseEther(depositAmount), false],
      });
      setDepositAmount("");
    } catch (err) {
      console.error("Deposit failed:", err);
    }
  };

  const handleWithdraw = async () => {
    if (!withdrawAmount) return;
    try {
      await withdrawAsync({
        address: branch.stabilityPool,
        abi: StabilityPoolABI,
        functionName: "withdrawFromSP",
        args: [parseEther(withdrawAmount), true],
      });
      setWithdrawAmount("");
    } catch (err) {
      console.error("Withdraw failed:", err);
    }
  };

  const handleClaim = async () => {
    try {
      await claimAsync({
        address: branch.stabilityPool,
        abi: StabilityPoolABI,
        functionName: "claimAllCollGains",
      });
    } catch (err) {
      console.error("Claim failed:", err);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      {/* Branch selector */}
      <Tabs
        value={selectedBranch}
        onValueChange={(v) => setSelectedBranch(v as "wCTC" | "lstCTC")}
      >
        <TabsList>
          {BRANCHES.map((b) => (
            <TabsTrigger key={b.key} value={b.key}>
              {b.label} Pool
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard
          label="Pool Size"
          value={
            totalDeposits
              ? formatTokenAmount(totalDeposits, 18, 2)
              : "—"
          }
          sub="sbUSD"
          icon={<DollarSign className="w-4 h-4" />}
        />
        <StatCard
          label="Your Deposit"
          value={
            userDeposit
              ? formatTokenAmount(userDeposit, 18, 4)
              : "—"
          }
          sub="sbUSD"
          icon={<Percent className="w-4 h-4" />}
        />
        <StatCard
          label="Coll. Gain"
          value={
            collGain ? formatTokenAmount(collGain, 18, 6) : "—"
          }
          sub={selectedBranch}
          icon={<Gift className="w-4 h-4" />}
        />
      </div>

      {/* Deposit / Withdraw */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Deposit */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Deposit sbUSD</CardTitle>
            <CardDescription>
              Earn {selectedBranch} from liquidations
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="rounded-xl bg-bg-input p-3">
              <div className="flex justify-between mb-1">
                <span className="text-xs text-text-tertiary">Amount</span>
                {sbUSDBalance && (
                  <button
                    onClick={() =>
                      setDepositAmount(
                        formatTokenAmount(sbUSDBalance.value, 18, 18).replace(
                          /,/g,
                          ""
                        )
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
              disabled={!isConnected || !depositAmount || isProvidePending}
            >
              {isProvidePending && (
                <Loader2 className="w-4 h-4 animate-spin" />
              )}
              Deposit
            </Button>
          </CardContent>
        </Card>

        {/* Withdraw */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Withdraw sbUSD</CardTitle>
            <CardDescription>
              Withdraw your deposit + claim gains
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="rounded-xl bg-bg-input p-3">
              <div className="flex justify-between mb-1">
                <span className="text-xs text-text-tertiary">Amount</span>
                {userDeposit && (
                  <button
                    onClick={() =>
                      setWithdrawAmount(
                        formatTokenAmount(userDeposit, 18, 18).replace(
                          /,/g,
                          ""
                        )
                      )
                    }
                    className="text-xs text-text-secondary hover:text-ice-400"
                  >
                    Max: {formatTokenAmount(userDeposit, 18, 4)}
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
                disabled={!isConnected || !withdrawAmount || isWithdrawPending}
              >
                {isWithdrawPending && (
                  <Loader2 className="w-4 h-4 animate-spin" />
                )}
                Withdraw
              </Button>
              <Button
                variant="success"
                onClick={handleClaim}
                disabled={
                  !isConnected || !collGain || collGain === 0n || isClaimPending
                }
              >
                {isClaimPending && (
                  <Loader2 className="w-4 h-4 animate-spin" />
                )}
                Claim
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
