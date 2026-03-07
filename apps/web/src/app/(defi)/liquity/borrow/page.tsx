"use client";

import { useState, useMemo, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { useConnection } from "wagmi";
import { parseEther, formatEther } from "viem";
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
import { useTroveActions, ETH_GAS_COMPENSATION } from "@/domains/defi/liquity/hooks/useTroveActions";
import { useAllTroves } from "@/domains/defi/liquity/hooks/useAllTroves";
import { useTokenBalance } from "@/shared/hooks/useTokenBalance";
import { usePositionPreview } from "@/domains/defi/liquity/hooks/usePositionPreview";
import { useMarketRateStats } from "@/domains/defi/liquity/hooks/useMarketRateStats";
import { TOKENS } from "@/core/config/addresses";
import { DEMO_TROVES } from "@/domains/defi/liquity/data/fixtures";
import type { TroveData } from "@/domains/defi/liquity/types";
import { formatTokenAmount, formatNumber } from "@/shared/lib/utils";
import { TxPipelineModal } from "@/shared/components/ui/tx-pipeline-modal";
import type { TxStep, TxPhase } from "@/shared/types/tx";
import { Shield, TrendingDown, DollarSign, HandCoins, Loader2, Users, AlertTriangle, Info } from "lucide-react";

const IS_TEST_MODE = process.env.NEXT_PUBLIC_TEST_MODE === "true";
// Matches on-chain Constants.sol MIN_DEBT = 10e18
const MIN_DEBT = 10;

/** Gradient gauge slider for interest rate */
function InterestRateSlider({ value, onChange, avgRate }: { value: number; onChange: (v: number) => void; avgRate?: number | null }) {
  // thumb is 20px wide, so we need to offset the gauge to align with thumb center
  const THUMB = 20; // px, matches w-5
  const toPct = (v: number) => ((v - 0.5) / (25 - 0.5)) * 100;
  const pct = toPct(value);
  const avgPct = avgRate != null ? toPct(avgRate) : null;
  return (
    <div className="space-y-1">
      <div className="relative h-8 flex items-center">
        {/* Track background (unfilled portion) */}
        <div className="absolute inset-x-0 h-2.5 rounded-full bg-bg-input/50" />
        {/* Filled gradient gauge — offset by half-thumb so it aligns with thumb center */}
        <div
          className="absolute h-2.5 rounded-full"
          style={{
            left: 0,
            width: `calc(${pct}% + ${THUMB / 2 - (pct / 100) * THUMB}px)`,
            background: "linear-gradient(to right, #ef4444, #f59e0b 40%, #4ade80 80%, #22c55e)",
          }}
        />
        {/* Avg marker line on the track */}
        {avgPct !== null && (
          <div
            className="absolute top-1/2 -translate-y-1/2 w-0.5 h-5 bg-white/50 rounded-full pointer-events-none z-[5]"
            style={{ left: `calc(${avgPct}% + ${THUMB / 2 - (avgPct / 100) * THUMB}px)` }}
          />
        )}
        {/* Native range input (invisible but interactive) */}
        <input
          type="range"
          min={0.5}
          max={25}
          step={0.1}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="relative z-10 w-full h-2.5 appearance-none bg-transparent cursor-pointer
            [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white/90 [&::-webkit-slider-thumb]:bg-[#1a1b2e] [&::-webkit-slider-thumb]:shadow-lg [&::-webkit-slider-thumb]:cursor-grab [&::-webkit-slider-thumb]:active:cursor-grabbing
            [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-white/90 [&::-moz-range-thumb]:bg-[#1a1b2e] [&::-moz-range-thumb]:shadow-lg [&::-moz-range-thumb]:cursor-grab
            [&::-moz-range-track]:bg-transparent"
        />
      </div>
      {/* Avg label below, aligned to the marker */}
      {avgPct !== null && avgRate != null && (
        <div className="relative h-3">
          <span
            className="absolute text-[10px] text-white/50 whitespace-nowrap pointer-events-none"
            style={{
              left: `calc(${avgPct}% + ${THUMB / 2 - (avgPct / 100) * THUMB}px)`,
              transform: "translateX(-50%)",
            }}
          >
            Avg {avgRate.toFixed(1)}%
          </span>
        </div>
      )}
    </div>
  );
}

export default function LiquityBorrowPage() {
  const searchParams = useSearchParams();
  const branch = (searchParams.get("branch") as "wCTC" | "lstCTC") ?? "wCTC";
  const { address, isConnected } = useConnection();

  const { stats, isLoading: statsLoading } = useLiquityBranch(branch);
  const { troves, troveCount, isLoading: trovesLoading, refetch: refetchTroves, nextOwnerIndex } = useTroves(branch, address);
  const { troves: allTroves, totalCount: systemTroveCount, isLoading: allTrovesLoading } = useAllTroves(branch);
  const { approveCollateral, openTrove, adjustTrove, adjustInterestRate, closeTrove, isPending, needsApproval } =
    useTroveActions(branch, address);
  const collToken = branch === "wCTC" ? TOKENS.wCTC : TOKENS.lstCTC;
  const { data: collBalance, refetch: refetchBalance } = useTokenBalance({ address, token: collToken });
  const marketStats = useMarketRateStats(branch);

  // Open Trove form
  const [collAmount, setCollAmount] = useState("");
  const [debtAmount, setDebtAmount] = useState("");
  const [ratePercent, setRatePercent] = useState(5);
  const [openDialogOpen, setOpenDialogOpen] = useState(false);

  // Tx pipeline state
  const [txSteps, setTxSteps] = useState<TxStep[]>([]);
  const [txPhase, setTxPhase] = useState<TxPhase>("idle");
  const [showTxModal, setShowTxModal] = useState(false);

  const updateStep = useCallback((id: string, update: Partial<TxStep>) => {
    setTxSteps((prev) => prev.map((s) => (s.id === id ? { ...s, ...update } : s)));
  }, []);

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
  const parsedDebt = debtAmount ? parseEther(debtAmount) : 0n;
  const parsedRate = parseEther(String(ratePercent / 100));
  const insufficientBalance = parsedColl > 0n && parsedColl > collBalanceValue;

  // Position preview
  const preview = usePositionPreview({
    coll: parsedColl,
    debt: parsedDebt,
    rate: parsedRate,
    price: stats.price,
    mcr: stats.mcr,
    ccr: stats.ccr,
  });

  // Derived values
  const collPrice = stats.price > 0n ? Number(formatEther(stats.price)) : 0;
  const collNum = parseFloat(collAmount) || 0;
  const debtNum = parseFloat(debtAmount) || 0;
  const collValueUSD = collNum * collPrice;
  const mcrPct = stats.mcr > 0n ? Number(stats.mcr) / 1e16 : 110;
  const ccrPct = stats.ccr > 0n ? Number(stats.ccr) / 1e16 : 150;

  // Validation
  const errors: string[] = [];
  if (debtNum > 0 && debtNum < MIN_DEBT) errors.push(`Minimum debt is ${MIN_DEBT} sbUSD.`);
  if (preview.cr > 0 && !preview.isAboveMCR) errors.push(`CR (${preview.cr.toFixed(0)}%) is below MCR (${mcrPct.toFixed(0)}%). Increase collateral or reduce debt.`);
  const canOpen = !!collAmount && !!debtAmount && debtNum >= MIN_DEBT && preview.isAboveMCR && !insufficientBalance;

  const displayTroves: (TroveData & { isDemo?: boolean })[] = [
    ...troves.map((t) => ({ ...t, isDemo: false })),
    ...(IS_TEST_MODE ? DEMO_TROVES.map((t) => ({ ...t, isDemo: true })) : []),
  ];

  // Quick-fill helpers
  const handleHalf = () => {
    if (collBalanceValue > 0n) {
      const half = collBalanceValue / 2n;
      setCollAmount(formatEther(half));
    }
  };
  const handleMax = () => {
    if (collBalanceValue > 0n) {
      setCollAmount(formatEther(collBalanceValue));
    }
  };
  const handleSafe = () => {
    if (collNum > 0 && collPrice > 0) {
      const safeBorrow = (collNum * collPrice) / 2; // 200% CR target
      if (safeBorrow >= MIN_DEBT) {
        setDebtAmount(safeBorrow.toFixed(2));
      }
    }
  };

  const handleOpenTrove = async () => {
    if (!canOpen) return;

    const steps: TxStep[] = [];
    if (needsApproval) {
      steps.push({ id: "approve", type: "approve", label: `Approve ${branch}`, status: "pending" });
    }
    steps.push({ id: "open", type: "openTrove", label: "Open Trove", status: "pending" });

    setTxSteps(steps);
    setTxPhase("executing");
    setShowTxModal(true);

    try {
      if (needsApproval) {
        updateStep("approve", { status: "executing" });
        const hash = await approveCollateral(parsedColl + ETH_GAS_COMPENSATION);
        updateStep("approve", { status: "done", txHash: hash as `0x${string}` | undefined });
      }

      updateStep("open", { status: "executing" });
      const hash = await openTrove({
        coll: parsedColl,
        debt: parsedDebt,
        rate: parsedRate,
        maxFee: parseEther("1"),
        ownerIndex: nextOwnerIndex,
      });
      updateStep("open", { status: "done", txHash: hash as `0x${string}` | undefined });

      setTxPhase("complete");
      setCollAmount("");
      setDebtAmount("");
      setRatePercent(5);
      setOpenDialogOpen(false);
      refetchTroves(); refetchBalance();
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Open trove failed";
      setTxSteps((prev) => prev.map((s) =>
        s.status === "executing" ? { ...s, status: "error" as const, error: errorMsg } : s,
      ));
      setTxPhase("error");
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

  // Button text
  const getButtonText = () => {
    if (isPending) return null; // spinner shown separately
    if (!collAmount) return "Enter deposit amount";
    if (!debtAmount) return "Enter borrow amount";
    if (debtNum > 0 && debtNum < MIN_DEBT) return `Min debt: ${MIN_DEBT} sbUSD`;
    if (insufficientBalance) return "Insufficient Balance";
    if (preview.cr > 0 && !preview.isAboveMCR) return `CR too low (min ${mcrPct.toFixed(0)}%)`;
    return "Open Trove";
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
              <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                  <DialogTitle>Open {branch} Trove</DialogTitle>
                  <DialogDescription>
                    Deposit {branch} to mint sbUSD. Maintain CR above {mcrPct.toFixed(0)}%.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-5 py-4">
                  {/* Collateral Input */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <label className="text-text-secondary">Collateral ({branch})</label>
                      <div className="flex gap-2">
                        <button onClick={handleHalf} className="text-xs text-text-tertiary hover:text-ice-300 transition-colors">HALF</button>
                        <button onClick={handleMax} className="text-xs text-ice-400 hover:text-ice-300 transition-colors">
                          MAX: {formatTokenAmount(collBalanceValue, 18, 4)}
                        </button>
                      </div>
                    </div>
                    <Input
                      type="number"
                      placeholder="0.00"
                      className="font-mono"
                      value={collAmount}
                      onChange={(e) => setCollAmount(e.target.value)}
                    />
                    {collAmount && collPrice > 0 && (
                      <p className="text-xs text-text-tertiary">
                        = ${collValueUSD.toFixed(2)} USD
                        {preview.maxBorrow > 0n && (
                          <> · Max borrow: <span className="text-text-secondary">{formatTokenAmount(preview.maxBorrow, 18, 2)} sbUSD</span></>
                        )}
                      </p>
                    )}
                  </div>

                  {/* Borrow Amount Input */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <label className="text-text-secondary">Borrow Amount (sbUSD)</label>
                      <div className="flex gap-2 items-center">
                        {collNum > 0 && (
                          <button onClick={handleSafe} className="text-xs text-success/80 hover:text-success transition-colors">SAFE</button>
                        )}
                        <span className="text-xs text-text-tertiary">Min: {MIN_DEBT} sbUSD</span>
                      </div>
                    </div>
                    <Input
                      type="number"
                      placeholder="0.00"
                      className="font-mono"
                      value={debtAmount}
                      onChange={(e) => setDebtAmount(e.target.value)}
                    />
                  </div>

                  {/* Interest Rate Slider */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <label className="text-text-secondary">Interest Rate</label>
                      <span className="text-white font-semibold">{ratePercent.toFixed(1)}% APR</span>
                    </div>
                    <div>
                      <InterestRateSlider
                        value={ratePercent}
                        onChange={setRatePercent}
                        avgRate={marketStats?.median ?? null}
                      />
                      {/* Risk labels */}
                      <div className="flex justify-between text-[10px] mt-1">
                        <span className="flex items-center gap-0.5 text-red-400/70"><Info className="w-2.5 h-2.5" /> Higher redemption risk</span>
                        <span className="text-green-400/70">Lower redemption risk</span>
                      </div>
                    </div>
                    {/* Annual interest cost */}
                    {debtNum > 0 && (
                      <p className="text-xs text-text-tertiary">
                        Annual interest: <span className="text-text-secondary">~{formatTokenAmount(preview.annualCost, 18, 2)} sbUSD</span>
                      </p>
                    )}
                  </div>

                  {/* Position Summary */}
                  {(collNum > 0 || debtNum > 0) && (
                    <div className="rounded-xl bg-bg-input p-4 space-y-2.5">
                      <p className="font-semibold text-white text-sm">Position Summary</p>
                      <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                        <div className="flex justify-between col-span-2">
                          <span className="text-text-tertiary">Health Factor</span>
                          <span className={`font-bold ${preview.crColor}`}>
                            {preview.cr > 0 ? (preview.cr / 100).toFixed(2) : "\u2014"}
                          </span>
                        </div>
                        <div className="flex justify-between col-span-2">
                          <span className="text-text-tertiary">Collateral Ratio</span>
                          <span className={`font-mono ${preview.crColor}`}>
                            {preview.cr > 0 ? `${preview.cr.toFixed(1)}%` : "\u2014"}
                          </span>
                        </div>
                        <div className="flex justify-between col-span-2">
                          <span className="text-text-tertiary">Liquidation Price</span>
                          <span className="text-white font-mono">
                            {preview.liquidationPrice > 0n ? `$${formatTokenAmount(preview.liquidationPrice, 18, 4)}` : "\u2014"}
                          </span>
                        </div>
                        <div className="flex justify-between col-span-2">
                          <span className="text-text-tertiary">7-day Upfront Fee</span>
                          <span className="text-white font-mono">
                            {preview.upfrontFee > 0n ? `${formatTokenAmount(preview.upfrontFee, 18, 4)} sbUSD` : "\u2014"}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-text-tertiary">MCR</span>
                          <span className="text-text-secondary">{mcrPct.toFixed(0)}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-text-tertiary">CCR</span>
                          <span className="text-text-secondary">{ccrPct.toFixed(0)}%</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Errors */}
                  {errors.length > 0 && (
                    <div className="space-y-1.5">
                      {errors.map((err, i) => (
                        <div key={i} className="flex items-center gap-2 text-xs text-red-400 bg-red-400/10 border border-red-400/20 rounded-xl px-3 py-2">
                          <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                          {err}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Submit */}
                  <Button
                    className="w-full"
                    onClick={handleOpenTrove}
                    disabled={!canOpen || isPending}
                  >
                    {isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                    {getButtonText()}
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

      {/* System Troves */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-ice-400" />
            <CardTitle>System Troves ({systemTroveCount})</CardTitle>
          </div>
          <CardDescription>
            All active troves in the {branch} branch, sorted by interest rate
          </CardDescription>
        </CardHeader>
        <CardContent>
          {allTrovesLoading ? (
            <div className="text-center py-8 text-text-secondary">
              <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" />
              Loading system troves...
            </div>
          ) : allTroves.length === 0 ? (
            <div className="text-center py-8 text-text-secondary">
              No active troves in this branch yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-text-tertiary text-left">
                    <th className="py-2 px-3 font-medium">Trove ID</th>
                    <th className="py-2 px-3 font-medium text-right">Collateral</th>
                    <th className="py-2 px-3 font-medium text-right">Debt</th>
                    <th className="py-2 px-3 font-medium text-right">Rate</th>
                    <th className="py-2 px-3 font-medium text-right">ICR</th>
                  </tr>
                </thead>
                <tbody>
                  {allTroves.map((t) => (
                    <tr key={String(t.id)} className="border-b border-border/50 hover:bg-bg-input/30 transition-colors">
                      <td className="py-2.5 px-3 font-mono text-text-secondary text-xs">
                        {`${String(t.id).slice(0, 8)}...${String(t.id).slice(-4)}`}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-right text-white">
                        {formatTokenAmount(t.entireColl, 18, 2)} {branch}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-right text-white">
                        {formatTokenAmount(t.entireDebt, 18, 2)} sbUSD
                      </td>
                      <td className="py-2.5 px-3 font-mono text-right text-white">
                        {formatNumber(Number(t.annualInterestRate) / 1e16)}%
                      </td>
                      <td className={`py-2.5 px-3 font-mono text-right ${t.icr < 150 ? "text-red-400" : t.icr < 200 ? "text-yellow-400" : "text-success"}`}>
                        {formatNumber(t.icr)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tx Pipeline Modal */}
      <TxPipelineModal
        open={showTxModal}
        onClose={() => {
          setShowTxModal(false);
          setTxPhase("idle");
          setTxSteps([]);
        }}
        steps={txSteps}
        phase={txPhase}
        title="Open Trove"
      />
    </div>
  );
}
