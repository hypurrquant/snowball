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
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger,
} from "@/shared/components/ui/dialog";
import { StatCard } from "@/shared/components/common/StatCard";
import { useLiquityBranch } from "@/domains/defi/liquity/hooks/useLiquityBranch";
import { useTroves } from "@/domains/defi/liquity/hooks/useTroves";
import { useTroveActions } from "@/domains/defi/liquity/hooks/useTroveActions";
import { useTokenBalance } from "@/shared/hooks/useTokenBalance";
import { TOKENS } from "@/core/config/addresses";
import { DEMO_TROVES } from "@/domains/defi/liquity/data/fixtures";
import type { TroveData } from "@/domains/defi/liquity/types";
import { formatTokenAmount, formatNumber } from "@/shared/lib/utils";
import { Shield, TrendingDown, DollarSign, HandCoins, Loader2 } from "lucide-react";

const IS_TEST_MODE = process.env.NEXT_PUBLIC_TEST_MODE === "true";

export default function LiquityBorrowPage() {
  const searchParams = useSearchParams();
  const branch = (searchParams.get("branch") as "wCTC" | "lstCTC") ?? "wCTC";
  const { address, isConnected } = useConnection();

  const { stats, isLoading: statsLoading } = useLiquityBranch(branch);
  const { troves, troveCount, isLoading: trovesLoading, refetch: refetchTroves, nextOwnerIndex } = useTroves(branch, address);
  const { openTrove, adjustTrove, adjustInterestRate, closeTrove, isPending } =
    useTroveActions(branch, address);
  const collToken = branch === "wCTC" ? TOKENS.wCTC : TOKENS.lstCTC;
  const { data: collBalance, refetch: refetchBalance } = useTokenBalance({ address, token: collToken });

  // Open Trove form
  const [collAmount, setCollAmount] = useState("");
  const [debtAmount, setDebtAmount] = useState("");
  const [rateAmount, setRateAmount] = useState("5");
  const [openDialogOpen, setOpenDialogOpen] = useState(false);

  // Adjust Trove form
  const [adjustTroveId, setAdjustTroveId] = useState<bigint | null>(null);
  const [adjustCollChange, setAdjustCollChange] = useState("");
  const [adjustDebtChange, setAdjustDebtChange] = useState("");
  const [adjustIsCollIncrease, setAdjustIsCollIncrease] = useState(true);
  const [adjustIsDebtIncrease, setAdjustIsDebtIncrease] = useState(true);

  // Rate Adjust form
  const [rateTroveId, setRateTroveId] = useState<bigint | null>(null);
  const [newRate, setNewRate] = useState("");

  const collBalanceValue = collBalance?.value ?? 0n;
  const parsedColl = collAmount ? parseEther(collAmount) : 0n;
  const insufficientBalance = parsedColl > 0n && parsedColl > collBalanceValue;

  const displayTroves: (TroveData & { isDemo?: boolean })[] = [
    ...troves.map((t) => ({ ...t, isDemo: false })),
    ...(IS_TEST_MODE ? DEMO_TROVES.map((t) => ({ ...t, isDemo: true })) : []),
  ];

  const handleOpenTrove = async () => {
    if (!collAmount || !debtAmount) return;
    try {
      await openTrove({
        coll: parseEther(collAmount),
        debt: parseEther(debtAmount),
        rate: parseEther(String(Number(rateAmount) / 100)),
        maxFee: parseEther("1"),
        ownerIndex: nextOwnerIndex,
      });
      setCollAmount("");
      setDebtAmount("");
      setOpenDialogOpen(false);
      refetchTroves(); refetchBalance();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Open trove failed");
    }
  };

  const handleAdjustTrove = async () => {
    if (!adjustTroveId) return;
    try {
      await adjustTrove({
        troveId: adjustTroveId,
        collChange: adjustCollChange ? parseEther(adjustCollChange) : 0n,
        isCollIncrease: adjustIsCollIncrease,
        debtChange: adjustDebtChange ? parseEther(adjustDebtChange) : 0n,
        isDebtIncrease: adjustIsDebtIncrease,
      });
      setAdjustTroveId(null);
      refetchTroves(); refetchBalance();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Adjust trove failed");
    }
  };

  const handleAdjustRate = async () => {
    if (!rateTroveId || !newRate) return;
    try {
      await adjustInterestRate({
        troveId: rateTroveId,
        newRate: parseEther(String(Number(newRate) / 100)),
        maxFee: parseEther("1"),
      });
      setRateTroveId(null);
      refetchTroves(); refetchBalance();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Adjust rate failed");
    }
  };

  const handleCloseTrove = async (troveId: bigint) => {
    try {
      await closeTrove(troveId);
      refetchTroves(); refetchBalance();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Close trove failed");
    }
  };

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label={`${branch} Price`}
          value={stats.price > 0n ? `$${formatTokenAmount(stats.price, 18, 2)}` : "\u2014"}
          icon={<DollarSign className="w-4 h-4" />}
          loading={statsLoading}
        />
        <StatCard
          label="TVL"
          value={formatTokenAmount(stats.totalColl, 18, 2)}
          sub={branch}
          icon={<Shield className="w-4 h-4" />}
          loading={statsLoading}
        />
        <StatCard
          label="Total Debt"
          value={formatTokenAmount(stats.totalDebt, 18, 2)}
          sub="sbUSD"
          icon={<TrendingDown className="w-4 h-4" />}
          loading={statsLoading}
        />
        <StatCard
          label="TCR"
          value={`${formatNumber(stats.tcr)}%`}
          icon={<HandCoins className="w-4 h-4" />}
          loading={statsLoading}
        />
      </div>

      {/* Troves */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Your Troves ({String(troveCount)})</CardTitle>
            <CardDescription>
              Deposit {branch} as collateral to borrow sbUSD
            </CardDescription>
          </div>
          {isConnected && (
            <Dialog open={openDialogOpen} onOpenChange={setOpenDialogOpen}>
              <DialogTrigger asChild>
                <Button>Open Trove</Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Open {branch} Trove</DialogTitle>
                  <DialogDescription>
                    Deposit {branch} to mint sbUSD. Maintain CR above 110%.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <label className="text-sm text-text-secondary">Collateral ({branch})</label>
                    <Input
                      placeholder="0.00"
                      className="font-mono"
                      value={collAmount}
                      onChange={(e) => setCollAmount(e.target.value)}
                    />
                    {collBalance && (
                      <p className="text-xs text-text-tertiary">
                        Balance: {formatTokenAmount(collBalanceValue, 18, 4)} {branch}
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm text-text-secondary">Borrow Amount (sbUSD)</label>
                    <Input
                      placeholder="0.00"
                      className="font-mono"
                      value={debtAmount}
                      onChange={(e) => setDebtAmount(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm text-text-secondary">Annual Interest Rate (%)</label>
                    <Input
                      placeholder="5"
                      className="font-mono"
                      value={rateAmount}
                      onChange={(e) => setRateAmount(e.target.value)}
                    />
                  </div>
                  <Button
                    className="w-full"
                    onClick={handleOpenTrove}
                    disabled={!collAmount || !debtAmount || isPending || insufficientBalance}
                  >
                    {isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                    {insufficientBalance ? "Insufficient Balance" : "Open Trove"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </CardHeader>
        <CardContent>
          {!isConnected ? (
            <div className="text-center py-8 text-text-secondary">
              Connect Wallet to view your troves
            </div>
          ) : displayTroves.length === 0 ? (
            <div className="text-center py-8 text-text-secondary">
              No active troves. Open a trove to get started.
            </div>
          ) : (
            <div className="space-y-3">
              {displayTroves.map((t) => (
                <div
                  key={String(t.id)}
                  className="rounded-xl bg-bg-input p-4 flex flex-col sm:flex-row sm:items-center gap-4"
                >
                  <div className="flex-1 grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                    <div>
                      <span className="text-text-tertiary block">Collateral</span>
                      <span className="font-mono text-white">
                        {formatTokenAmount(t.coll, 18, 4)} {branch}
                      </span>
                    </div>
                    <div>
                      <span className="text-text-tertiary block">Debt</span>
                      <span className="font-mono text-white">
                        {formatTokenAmount(t.debt, 18, 2)} sbUSD
                      </span>
                    </div>
                    <div>
                      <span className="text-text-tertiary block">Rate</span>
                      <span className="font-mono text-white">
                        {formatNumber(Number(t.interestRate) / 1e16)}%
                      </span>
                    </div>
                    <div>
                      <span className="text-text-tertiary block">ICR</span>
                      <span className="font-mono text-white">
                        {formatNumber(t.icr)}%
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-2 items-center">
                    {t.isDemo && (
                      <span className="text-xs bg-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded">[Demo]</span>
                    )}
                    {!t.isDemo && (
                      <>
                        <Dialog open={adjustTroveId === t.id} onOpenChange={(open) => setAdjustTroveId(open ? t.id : null)}>
                          <DialogTrigger asChild>
                            <Button size="sm" variant="secondary">Adjust</Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Adjust Trove</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-3 py-4">
                              <div className="flex items-center gap-2">
                                <select
                                  className="bg-bg-input border border-border rounded px-2 py-1 text-sm"
                                  value={adjustIsCollIncrease ? "add" : "remove"}
                                  onChange={(e) => setAdjustIsCollIncrease(e.target.value === "add")}
                                >
                                  <option value="add">Add Coll</option>
                                  <option value="remove">Remove Coll</option>
                                </select>
                                <Input placeholder="0.00" className="font-mono" value={adjustCollChange} onChange={(e) => setAdjustCollChange(e.target.value)} />
                              </div>
                              <div className="flex items-center gap-2">
                                <select
                                  className="bg-bg-input border border-border rounded px-2 py-1 text-sm"
                                  value={adjustIsDebtIncrease ? "borrow" : "repay"}
                                  onChange={(e) => setAdjustIsDebtIncrease(e.target.value === "borrow")}
                                >
                                  <option value="borrow">Borrow More</option>
                                  <option value="repay">Repay Debt</option>
                                </select>
                                <Input placeholder="0.00" className="font-mono" value={adjustDebtChange} onChange={(e) => setAdjustDebtChange(e.target.value)} />
                              </div>
                              <Button className="w-full" onClick={handleAdjustTrove} disabled={isPending}>
                                {isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                                Confirm Adjust
                              </Button>
                            </div>
                          </DialogContent>
                        </Dialog>
                        <Dialog open={rateTroveId === t.id} onOpenChange={(open) => { setRateTroveId(open ? t.id : null); if (open) setNewRate(String(Number(t.interestRate) / 1e16)); }}>
                          <DialogTrigger asChild>
                            <Button size="sm" variant="secondary">Rate</Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Adjust Interest Rate</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-3 py-4">
                              <Input placeholder="5" className="font-mono" value={newRate} onChange={(e) => setNewRate(e.target.value)} />
                              <Button className="w-full" onClick={handleAdjustRate} disabled={isPending || !newRate}>
                                {isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                                Update Rate
                              </Button>
                            </div>
                          </DialogContent>
                        </Dialog>
                        <Button size="sm" variant="destructive" onClick={() => handleCloseTrove(t.id)} disabled={isPending}>
                          Close
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
