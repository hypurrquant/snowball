"use client";

import { useState, useMemo, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { useConnection } from "wagmi";
import type { Address } from "viem";
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
import { useAllTroves } from "@/domains/defi/liquity/hooks/useAllTroves";
import { useTokenBalance } from "@/shared/hooks/useTokenBalance";
import { useMarketRateStats } from "@/domains/defi/liquity/hooks/useMarketRateStats";
import { useOpenTrovePipeline } from "@/domains/defi/liquity/hooks/useOpenTrovePipeline";
import { useTroveActions } from "@/domains/defi/liquity/hooks/useTroveActions";
import { TOKENS } from "@/core/config/addresses";
import { InterestRateSlider } from "@/domains/defi/liquity/components/InterestRateSlider";
import { PositionSummary } from "@/domains/defi/liquity/components/PositionSummary";
import { EditTroveDialog } from "@/domains/defi/liquity/components/EditTroveDialog";
import { MiniRateGauge } from "@/domains/defi/liquity/components/MiniRateGauge";
import { TroveDelegation } from "@/domains/defi/liquity/components/TroveDelegation";
import { DEMO_TROVES } from "@/domains/defi/liquity/data/fixtures";
import type { TroveData } from "@/domains/defi/liquity/types";
import { formatTokenAmount, formatNumber } from "@/shared/lib/utils";
import { TxPipelineModal } from "@/shared/components/ui/tx-pipeline-modal";
import { useTxPipeline } from "@/shared/hooks/useTxPipeline";
import { Shield, TrendingDown, DollarSign, HandCoins, Loader2, Users, AlertTriangle, Info } from "lucide-react";
import { useTroveDelegationStatus } from "@/domains/defi/liquity/hooks/useTroveDelegationStatus";
import { useVaultPermission } from "@/domains/agent/hooks/useVaultPermission";
import { MIN_DEBT } from "@/domains/defi/liquity/lib/constants";

const IS_TEST_MODE = process.env.NEXT_PUBLIC_TEST_MODE === "true";

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

  const collBalanceValue = collBalance?.value ?? 0n;

  // Open Trove pipeline
  const [openDialogOpen, setOpenDialogOpen] = useState(false);
  const onOpenTroveSuccess = useCallback(() => {
    refetchTroves(); refetchBalance();
  }, [refetchTroves, refetchBalance]);

  const pipeline = useOpenTrovePipeline({
    branch,
    address,
    collBalanceValue,
    stats,
    nextOwnerIndex,
    onSuccess: onOpenTroveSuccess,
  });

  // Close Trove pipeline
  const closePipeline = useTxPipeline();
  const { closeTrove } = useTroveActions(branch, address, 0n);

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

  // Delegation (agent domain hook stays at app layer)
  const troveIds = useMemo(() => troves.map((t) => t.id), [troves]);
  const { delegationMap } = useTroveDelegationStatus(branch, troveIds);
  const { grantPermission } = useVaultPermission();

  // Edit Trove
  const [editTroveId, setEditTroveId] = useState<bigint | null>(null);

  const userTroveIds = useMemo(
    () => new Set(troves.map((t) => String(t.id))),
    [troves],
  );

  const displayTroves: (TroveData & { isDemo?: boolean })[] = [
    ...troves.map((t) => ({ ...t, isDemo: false })),
    ...(IS_TEST_MODE ? DEMO_TROVES.map((t) => ({ ...t, isDemo: true })) : []),
  ];

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
                    Deposit {branch} to mint sbUSD. Maintain CR above {pipeline.mcrPct.toFixed(0)}%.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-5 py-4">
                  {/* Collateral Input */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <label className="text-text-secondary">Collateral ({branch})</label>
                      <div className="flex gap-2">
                        <button onClick={pipeline.handleHalf} className="text-xs text-text-tertiary hover:text-ice-300 transition-colors">HALF</button>
                        <button onClick={pipeline.handleMax} className="text-xs text-ice-400 hover:text-ice-300 transition-colors">
                          MAX: {formatTokenAmount(collBalanceValue, 18, 4)}
                        </button>
                      </div>
                    </div>
                    <Input
                      type="number"
                      placeholder="0.00"
                      className="font-mono"
                      value={pipeline.collAmount}
                      onChange={(e) => pipeline.setCollAmount(e.target.value)}
                    />
                    {pipeline.collAmount && pipeline.collPrice > 0 && (
                      <p className="text-xs text-text-tertiary">
                        = ${pipeline.collValueUSD.toFixed(2)} USD
                        {pipeline.preview.maxBorrow > 0n && (
                          <> · Max borrow: <span className="text-text-secondary">{formatTokenAmount(pipeline.preview.maxBorrow, 18, 2)} sbUSD</span></>
                        )}
                      </p>
                    )}
                  </div>

                  {/* Borrow Amount Input */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <label className="text-text-secondary">Borrow Amount (sbUSD)</label>
                      <div className="flex gap-2 items-center">
                        {pipeline.collNum > 0 && (
                          <button onClick={pipeline.handleSafe} className="text-xs text-success/80 hover:text-success transition-colors">SAFE</button>
                        )}
                        <span className="text-xs text-text-tertiary">Min: {MIN_DEBT} sbUSD</span>
                      </div>
                    </div>
                    <Input
                      type="number"
                      placeholder="0.00"
                      className="font-mono"
                      value={pipeline.debtAmount}
                      onChange={(e) => pipeline.setDebtAmount(e.target.value)}
                    />
                  </div>

                  {/* Interest Rate Slider */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <label className="text-text-secondary">Interest Rate</label>
                      <span className="text-white font-semibold">{pipeline.ratePercent.toFixed(1)}% APR</span>
                    </div>
                    <div>
                      <InterestRateSlider
                        value={pipeline.ratePercent}
                        onChange={pipeline.setRatePercent}
                        avgRate={marketStats?.median ?? null}
                      />
                      {/* Risk labels */}
                      <div className="flex justify-between text-[10px] mt-1">
                        <span className="flex items-center gap-0.5 text-red-400/70"><Info className="w-2.5 h-2.5" /> Higher redemption risk</span>
                        <span className="text-green-400/70">Lower redemption risk</span>
                      </div>
                    </div>
                    {/* Annual interest cost */}
                    {pipeline.debtNum > 0 && (
                      <p className="text-xs text-text-tertiary">
                        Annual interest: <span className="text-text-secondary">~{formatTokenAmount(pipeline.preview.annualCost, 18, 2)} sbUSD</span>
                      </p>
                    )}
                  </div>

                  {/* Position Summary */}
                  {(pipeline.collNum > 0 || pipeline.debtNum > 0) && (
                    <PositionSummary preview={pipeline.preview} mcrPct={pipeline.mcrPct} ccrPct={pipeline.ccrPct} />
                  )}

                  {/* Errors */}
                  {pipeline.errors.length > 0 && (
                    <div className="space-y-1.5">
                      {pipeline.errors.map((err, i) => (
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
                    onClick={pipeline.handleOpenTrove}
                    disabled={!pipeline.canOpen || pipeline.isPending}
                  >
                    {pipeline.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                    {pipeline.buttonText}
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
                    {!t.isDemo && address && (
                      <>
                        <TroveDelegation
                          branch={branch}
                          trove={t}
                          delegationInfo={delegationMap.get(t.id.toString())}
                          address={address}
                          grantPermission={grantPermission}
                          onDelegationChange={refetchTroves}
                        />
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
                        <Button size="sm" variant="destructive" onClick={() => handleCloseTrove(t.id)} disabled={pipeline.isPending}>
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
        open={pipeline.showTxModal}
        onClose={() => {
          if (pipeline.txPhase === "complete") setOpenDialogOpen(false);
          pipeline.resetTxModal();
        }}
        onRetry={pipeline.handleOpenTrove}
        steps={pipeline.txSteps}
        phase={pipeline.txPhase}
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
    </div>
  );
}
