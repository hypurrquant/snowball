"use client";

import { useState, useMemo, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { useConnection } from "wagmi";
import { parseEther, formatEther, toFunctionSelector, maxUint256, type Address } from "viem";
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
import { TOKENS, ERC8004, LIQUITY } from "@/core/config/addresses";
import { InterestRateSlider } from "@/domains/defi/liquity/components/InterestRateSlider";
import { PositionSummary } from "@/domains/defi/liquity/components/PositionSummary";
import { EditTroveDialog } from "@/domains/defi/liquity/components/EditTroveDialog";
import { MiniRateGauge } from "@/domains/defi/liquity/components/MiniRateGauge";
import { DEMO_TROVES } from "@/domains/defi/liquity/data/fixtures";
import type { TroveData } from "@/domains/defi/liquity/types";
import { formatTokenAmount, formatNumber } from "@/shared/lib/utils";
import { TxPipelineModal } from "@/shared/components/ui/tx-pipeline-modal";
import { useTxPipeline } from "@/shared/hooks/useTxPipeline";
import type { TxStep, TxPhase } from "@/shared/types/tx";
import { Shield, TrendingDown, DollarSign, HandCoins, Loader2, Users, AlertTriangle, Info, Bot } from "lucide-react";
import { useTroveDelegationStatus } from "@/domains/defi/liquity/hooks/useTroveDelegationStatus";
import { useTroveDelegate } from "@/domains/defi/liquity/hooks/useTroveDelegate";
import { useVaultPermission } from "@/domains/agent/hooks/useVaultPermission";

const IS_TEST_MODE = process.env.NEXT_PUBLIC_TEST_MODE === "true";
// Matches on-chain Constants.sol MIN_DEBT = 10e18
const MIN_DEBT = 10;

export default function LiquityBorrowPage() {
  const searchParams = useSearchParams();
  const branch = (searchParams.get("branch") as "wCTC" | "lstCTC") ?? "wCTC";
  const { address, isConnected } = useConnection();

  const { stats, isLoading: statsLoading } = useLiquityBranch(branch);
  const { troves, troveCount, isLoading: trovesLoading, refetch: refetchTroves, nextOwnerIndex } = useTroves(branch, address);
  const { troves: allTroves, totalCount: systemTroveCount, isLoading: allTrovesLoading } = useAllTroves(branch);
  const collToken = branch === "wCTC" ? TOKENS.wCTC : TOKENS.lstCTC;
  const { data: collBalance, refetch: refetchBalance } = useTokenBalance({ address, token: collToken });
  const marketStats = useMarketRateStats(branch);

  // Open Trove form
  const [collAmount, setCollAmount] = useState("");
  const [debtAmount, setDebtAmount] = useState("");

  const parsedColl = collAmount ? parseEther(collAmount) : 0n;

  const {
    approveCollateral, approveGasComp, openTrove, closeTrove, isPending,
    needsCollApproval, needsGasApproval, needsApproval,
  } = useTroveActions(branch, address, parsedColl);
  const [ratePercent, setRatePercent] = useState(5);
  const [openDialogOpen, setOpenDialogOpen] = useState(false);

  // Tx pipeline state
  const [txSteps, setTxSteps] = useState<TxStep[]>([]);
  const [txPhase, setTxPhase] = useState<TxPhase>("idle");
  const [showTxModal, setShowTxModal] = useState(false);

  const updateStep = useCallback((id: string, update: Partial<TxStep>) => {
    setTxSteps((prev) => prev.map((s) => (s.id === id ? { ...s, ...update } : s)));
  }, []);

  // Close Trove pipeline
  const closePipeline = useTxPipeline();

  // Delegation
  const troveIds = useMemo(() => troves.map((t) => t.id), [troves]);
  const { delegationMap } = useTroveDelegationStatus(branch, troveIds);
  const { fullUndelegate, setAddManager, setInterestIndividualDelegate, isPending: isDelegatePending } = useTroveDelegate(branch);
  const { grantPermission } = useVaultPermission();
  const [undelegateTarget, setUndelegateTarget] = useState<bigint | null>(null);
  const [delegateTarget, setDelegateTarget] = useState<bigint | null>(null);
  const delegatePipeline = useTxPipeline();

  const handleUndelegate = async (troveId: bigint) => {
    if (!address) return;
    try {
      await fullUndelegate(troveId, address, ERC8004.agentVault);
      setUndelegateTarget(null);
      refetchTroves();
    } catch {
      // error visible to user through isPending state reset
    }
  };

  const handleDelegate = async (troveId: bigint) => {
    if (!address) return;
    const b = LIQUITY.branches[branch];
    const collToken = (branch === "lstCTC" ? TOKENS.lstCTC : TOKENS.wCTC) as Address;

    await delegatePipeline.run(
      [
        { id: "permission", type: "approve" as const, label: "Grant Vault Permission" },
        { id: "add-manager", type: "delegate" as const, label: "Set Add Manager" },
        { id: "interest-delegate", type: "delegate" as const, label: "Set Interest Delegate" },
      ],
      {
        permission: async () => {
          const hash = await grantPermission({
            agent: ERC8004.agentEOA as Address,
            targets: [b.borrowerOperations as Address],
            functions: [
              toFunctionSelector("adjustTroveInterestRate(uint256,uint256,uint256,uint256,uint256)"),
              toFunctionSelector("addColl(uint256,uint256)"),
            ],
            expiry: BigInt(Math.floor(Date.now() / 1000) + 30 * 24 * 3600),
            tokenCaps: [{ token: collToken, cap: parseEther("100") }],
          });
          return hash as `0x${string}` | undefined;
        },
        "add-manager": async () => {
          const hash = await setAddManager(troveId, ERC8004.agentVault as Address);
          return hash as `0x${string}` | undefined;
        },
        "interest-delegate": async () => {
          const hash = await setInterestIndividualDelegate({
            troveId,
            delegate: ERC8004.agentVault as Address,
            minInterestRate: parseEther("0.005"),
            maxInterestRate: parseEther("0.15"),
            newAnnualInterestRate: 0n,
            upperHint: 0n,
            lowerHint: 0n,
            maxUpfrontFee: maxUint256,
            minInterestRateChangePeriod: 0n,
          });
          return hash as `0x${string}` | undefined;
        },
      },
    );
    refetchTroves();
  };

  // Edit Trove
  const [editTroveId, setEditTroveId] = useState<bigint | null>(null);

  const collBalanceValue = collBalance?.value ?? 0n;
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

  const userTroveIds = useMemo(
    () => new Set(troves.map((t) => String(t.id))),
    [troves],
  );

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
    if (needsCollApproval) {
      steps.push({ id: "approve-coll", type: "approve", label: `Approve ${branch}`, status: "pending" });
    }
    if (needsGasApproval) {
      steps.push({ id: "approve-gas", type: "approve", label: "Approve wCTC (gas)", status: "pending" });
    }
    steps.push({ id: "open", type: "openTrove", label: "Open Trove", status: "pending" });

    setTxSteps(steps);
    setTxPhase("executing");
    setShowTxModal(true);

    try {
      if (needsCollApproval) {
        updateStep("approve-coll", { status: "executing" });
        const approveAmt = branch === "wCTC" ? parsedColl + ETH_GAS_COMPENSATION : parsedColl;
        const hash = await approveCollateral(approveAmt);
        updateStep("approve-coll", { status: "done", txHash: hash as `0x${string}` | undefined });
      }
      if (needsGasApproval) {
        updateStep("approve-gas", { status: "executing" });
        const hash = await approveGasComp(ETH_GAS_COMPENSATION);
        updateStep("approve-gas", { status: "done", txHash: hash as `0x${string}` | undefined });
      }

      updateStep("open", { status: "executing" });
      const hash = await openTrove({
        coll: parsedColl,
        debt: parsedDebt,
        rate: parsedRate,
        // TODO(liquity-upfront-fee):
        // `maxFee` here is an absolute sbUSD cap for BorrowerOperations._requireUserAcceptsUpfrontFee(),
        // not a percentage/slippage value. `parseEther("1")` means "revert if the predicted upfront fee
        // is above 1 sbUSD".
        //
        // Why this sometimes fails:
        // - On CC3 testnet, openTrove can revert with `BorrowerOperations.UpfrontFeeTooHigh()`
        //   (selector `0x2337edc7`) even when approval and hints are otherwise correct.
        // - Example reproduced on 2026-03-07:
        //   11111 wCTC collateral / 2222 sbUSD debt / 5% rate required about
        //   2.021279626946928609 sbUSD upfront fee, so this hardcoded 1 sbUSD cap reverted.
        // - Lowering borrow size or interest rate can make the tx succeed again because the predicted fee
        //   drops below 1 sbUSD, which makes this look intermittent.
        //
        // Proper fix:
        // - Read `HintHelpers.predictOpenTroveUpfrontFee(branchIdx, debt, rate)` before sending.
        // - Add a safety buffer (for example 10-20%) to absorb state changes between read and write.
        // - Show that estimated fee in the UI so the user knows why the cap is what it is.
        // - Pass the buffered estimate here instead of a hardcoded `parseEther("1")`.
        maxFee: parseEther("1"),
        ownerIndex: nextOwnerIndex,
      });
      updateStep("open", { status: "done", txHash: hash as `0x${string}` | undefined });

      setTxPhase("complete");
      setCollAmount("");
      setDebtAmount("");
      setRatePercent(5);
      refetchTroves(); refetchBalance();
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Open trove failed";
      setTxSteps((prev) => prev.map((s) =>
        s.status === "executing" ? { ...s, status: "error" as const, error: errorMsg } : s,
      ));
      setTxPhase("error");
    }
  };

  const handleCloseTrove = async (troveId: bigint) => {
    await closePipeline.run(
      [{ id: "close", type: "closeTrove" as const, label: "Close Trove" }],
      {
        close: async () => {
          const h = await closeTrove(troveId);
          refetchTroves(); refetchBalance();
          return h as `0x${string}` | undefined;
        },
      },
    );
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
                    <PositionSummary preview={preview} mcrPct={mcrPct} ccrPct={ccrPct} />
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
                      <MiniRateGauge
                        rate={Number(t.interestRate) / 1e16}
                        median={marketStats?.median ?? null}
                        isUser
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <span className="text-text-tertiary block">ICR</span>
                      <span className="font-mono text-white">
                        {formatNumber(t.icr)}%
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-2 items-center flex-shrink-0">
                    {t.isDemo && (
                      <span className="text-xs bg-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded">[Demo]</span>
                    )}
                    {!t.isDemo && (() => {
                      const info = delegationMap.get(t.id.toString());
                      const isDelegated = info?.isDelegated ?? false;
                      return (
                        <>
                          {/* Agent icon — colored when delegated, click to delegate/undelegate */}
                          {isDelegated ? (
                            <Dialog open={undelegateTarget === t.id} onOpenChange={(open) => setUndelegateTarget(open ? t.id : null)}>
                              <DialogTrigger asChild>
                                <button
                                  className="flex items-center gap-1 px-2 py-1 rounded-lg bg-ice-400/20 text-ice-300 hover:bg-ice-400/30 transition-colors text-xs font-medium"
                                  title="Agent Delegated — click to undelegate"
                                >
                                  <Bot className="w-3.5 h-3.5" /> Delegated
                                </button>
                              </DialogTrigger>
                              <DialogContent className="sm:max-w-md">
                                <DialogHeader>
                                  <DialogTitle>Undelegate Trove</DialogTitle>
                                  <DialogDescription>
                                    Remove agent delegation from this trove. The agent will no longer manage interest rates or collateral.
                                  </DialogDescription>
                                </DialogHeader>
                                <div className="flex gap-2 pt-4">
                                  <Button variant="outline" onClick={() => setUndelegateTarget(null)} className="flex-1">
                                    Cancel
                                  </Button>
                                  <Button
                                    variant="destructive"
                                    onClick={() => handleUndelegate(t.id)}
                                    disabled={isDelegatePending}
                                    className="flex-1"
                                  >
                                    {isDelegatePending && <Loader2 className="w-3 h-3 animate-spin mr-1" />}
                                    Confirm Undelegate
                                  </Button>
                                </div>
                              </DialogContent>
                            </Dialog>
                          ) : (
                            <Dialog open={delegateTarget === t.id} onOpenChange={(open) => setDelegateTarget(open ? t.id : null)}>
                              <DialogTrigger asChild>
                                <button
                                  className="flex items-center gap-1 px-2 py-1 rounded-lg text-text-tertiary hover:text-ice-300 hover:bg-ice-400/10 transition-colors text-xs"
                                  title="Delegate to Agent"
                                >
                                  <Bot className="w-3.5 h-3.5" /> Delegate
                                </button>
                              </DialogTrigger>
                              <DialogContent className="sm:max-w-md">
                                <DialogHeader>
                                  <DialogTitle>Delegate Trove to Agent</DialogTitle>
                                  <DialogDescription>
                                    Allow the AI agent to manage this trove&apos;s interest rate automatically.
                                  </DialogDescription>
                                </DialogHeader>
                                <div className="space-y-4 py-2">
                                  <div className="rounded-xl bg-bg-input p-3 grid grid-cols-2 gap-2 text-xs">
                                    <div>
                                      <span className="text-text-tertiary">Collateral</span>
                                      <p className="font-mono text-white">{formatTokenAmount(t.coll, 18, 4)} {branch}</p>
                                    </div>
                                    <div>
                                      <span className="text-text-tertiary">Debt</span>
                                      <p className="font-mono text-white">{formatTokenAmount(t.debt, 18, 2)} sbUSD</p>
                                    </div>
                                    <div>
                                      <span className="text-text-tertiary">Current Rate</span>
                                      <p className="font-mono text-white">{formatNumber(Number(t.interestRate) / 1e16)}%</p>
                                    </div>
                                    <div>
                                      <span className="text-text-tertiary">ICR</span>
                                      <p className="font-mono text-white">{formatNumber(t.icr)}%</p>
                                    </div>
                                  </div>
                                  <div className="rounded-xl bg-ice-400/10 border border-ice-400/20 p-3 text-xs space-y-1.5">
                                    <p className="text-ice-300 font-medium">Agent will manage:</p>
                                    <ul className="text-text-secondary space-y-1 ml-3 list-disc">
                                      <li>Adjust interest rate to track market average</li>
                                      <li>Rate range: 0.5% ~ 15%</li>
                                      <li>Cooldown: 7 days between changes</li>
                                      <li>Permission expires in 30 days</li>
                                    </ul>
                                  </div>
                                  <div className="flex gap-2">
                                    <Button variant="outline" onClick={() => setDelegateTarget(null)} className="flex-1">
                                      Cancel
                                    </Button>
                                    <Button
                                      onClick={() => handleDelegate(t.id)}
                                      disabled={isDelegatePending}
                                      className="flex-1"
                                    >
                                      {isDelegatePending && <Loader2 className="w-3 h-3 animate-spin mr-1" />}
                                      Confirm Delegate
                                    </Button>
                                  </div>
                                </div>
                              </DialogContent>
                            </Dialog>
                          )}
                          <Button size="sm" variant="secondary" onClick={() => setEditTroveId(t.id)}>
                            Edit
                          </Button>
                          <EditTroveDialog
                            open={editTroveId === t.id}
                            onOpenChange={(open) => setEditTroveId(open ? t.id : null)}
                            trove={t}
                            branch={branch}
                            address={address}
                            onSuccess={() => { refetchTroves(); refetchBalance(); }}
                          />
                          <Button size="sm" variant="destructive" onClick={() => handleCloseTrove(t.id)} disabled={isPending}>
                            Close
                          </Button>
                        </>
                      );
                    })()}
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
                      <td className="py-2.5 px-3">
                        <div className="flex flex-col items-end gap-1">
                          <span className="font-mono text-white">
                            {formatNumber(Number(t.annualInterestRate) / 1e16)}%
                          </span>
                          <MiniRateGauge
                            rate={Number(t.annualInterestRate) / 1e16}
                            median={marketStats?.median ?? null}
                            isUser={userTroveIds.has(String(t.id))}
                          />
                        </div>
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

      {/* Tx Pipeline Modal — Open Trove */}
      <TxPipelineModal
        open={showTxModal}
        onClose={() => {
          if (txPhase === "complete") setOpenDialogOpen(false);
          setShowTxModal(false);
          setTxPhase("idle");
          setTxSteps([]);
        }}
        onRetry={handleOpenTrove}
        steps={txSteps}
        phase={txPhase}
        title="Open Trove"
      />

      {/* Tx Pipeline Modal — Close Trove */}
      <TxPipelineModal
        open={closePipeline.showTxModal}
        onClose={() => closePipeline.reset()}
        steps={closePipeline.txSteps}
        phase={closePipeline.txPhase}
        title="Close Trove"
      />

      {/* Tx Pipeline Modal — Delegate Trove */}
      <TxPipelineModal
        open={delegatePipeline.showTxModal}
        onClose={() => { delegatePipeline.reset(); setDelegateTarget(null); }}
        steps={delegatePipeline.txSteps}
        phase={delegatePipeline.txPhase}
        title="Delegate Trove"
      />
    </div>
  );
}
