"use client";

import { useState } from "react";
import { useConnection } from "wagmi";
import { parseEther } from "viem";
import {
  Card, CardContent,
} from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/shared/components/ui/dialog";
import { TxPipelineModal } from "@/shared/components/ui/tx-pipeline-modal";
import { useTxPipeline } from "@/shared/hooks/useTxPipeline";
import { useMorphoMarkets } from "@/domains/defi/morpho/hooks/useMorphoMarkets";
import { useMorphoPosition } from "@/domains/defi/morpho/hooks/useMorphoPosition";
import { useMorphoActions } from "@/domains/defi/morpho/hooks/useMorphoActions";
import { useTokenBalance } from "@/shared/hooks/useTokenBalance";
import { DEMO_POSITIONS } from "@/domains/defi/morpho/data/fixtures";
import type { MorphoMarket } from "@/domains/defi/morpho/types";
import { formatTokenAmount, formatNumber } from "@/shared/lib/utils";
import { calculateHealthFactor } from "@/domains/defi/morpho/lib/morphoMath";
import { Landmark } from "lucide-react";

const IS_TEST_MODE = process.env.NEXT_PUBLIC_TEST_MODE === "true";

function MarketBorrowCard({
  market,
  index,
}: {
  market: MorphoMarket;
  index: number;
}) {
  const { address, isConnected } = useConnection();
  const { position, refetch: refetchPosition } = useMorphoPosition(market.id, address, market.oraclePrice);
  const { data: collBalance, refetch: refetchCollBalance } = useTokenBalance({ address, token: market.collateralToken });
  const { refetch: refetchLoanBalance } = useTokenBalance({ address, token: market.loanToken });
  const actions = useMorphoActions(market, () => { refetchPosition(); refetchCollBalance(); refetchLoanBalance(); });
  const pipeline = useTxPipeline();

  const [collAmount, setCollAmount] = useState("");
  const [borrowAmount, setBorrowAmount] = useState("");
  const [repayAmount, setRepayAmount] = useState("");
  const [withdrawCollAmount, setWithdrawCollAmount] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);

  const demoPosition = IS_TEST_MODE ? DEMO_POSITIONS[index] : null;
  const displayPosition = position ?? demoPosition;
  const isDemo = !position && !!demoPosition;

  const parsedBorrow = borrowAmount ? parseEther(borrowAmount) : 0n;
  const currentCollateral = displayPosition?.collateral ?? 0n;
  const currentBorrow = displayPosition?.borrowAssets ?? 0n;
  const projectedHF = parsedBorrow > 0n
    ? calculateHealthFactor(currentCollateral, currentBorrow + parsedBorrow, market.lltv)
    : Infinity;
  const hfWarning = projectedHF < 1 && parsedBorrow > 0n;

  const handleSupplyCollateral = async () => {
    if (!collAmount) return;
    const amount = parseEther(collAmount);
    await pipeline.run(
      [
        { id: "approve", type: "approve" as const, label: `Approve ${market.collSymbol}` },
        { id: "supplyCollateral", type: "supplyCollateral" as const, label: `Supply ${market.collSymbol}` },
      ],
      {
        approve: async () => { const h = await actions.approveColl(amount); return h as `0x${string}` | undefined; },
        supplyCollateral: async () => { const h = await actions.supplyCollateral(amount); return h as `0x${string}` | undefined; },
      },
    );
    setCollAmount("");
  };

  const handleBorrow = async () => {
    if (!borrowAmount) return;
    const amount = parseEther(borrowAmount);
    await pipeline.run(
      [{ id: "borrow", type: "borrow" as const, label: `Borrow ${market.loanSymbol}` }],
      { borrow: async () => { const h = await actions.borrow(amount); return h as `0x${string}` | undefined; } },
    );
    setBorrowAmount("");
  };

  const handleRepay = async () => {
    if (!repayAmount) return;
    const amount = parseEther(repayAmount);
    await pipeline.run(
      [
        { id: "approve", type: "approve" as const, label: `Approve ${market.loanSymbol}` },
        { id: "repay", type: "repay" as const, label: `Repay ${market.loanSymbol}` },
      ],
      {
        approve: async () => { const h = await actions.approveLoan(amount); return h as `0x${string}` | undefined; },
        repay: async () => { const h = await actions.repay(amount); return h as `0x${string}` | undefined; },
      },
    );
    setRepayAmount("");
  };

  const handleWithdrawCollateral = async () => {
    if (!withdrawCollAmount) return;
    const amount = parseEther(withdrawCollAmount);
    await pipeline.run(
      [{ id: "withdrawCollateral", type: "withdrawCollateral" as const, label: `Withdraw ${market.collSymbol}` }],
      { withdrawCollateral: async () => { const h = await actions.withdrawCollateral(amount); return h as `0x${string}` | undefined; } },
    );
    setWithdrawCollAmount("");
  };

  return (
    <Card className="bg-bg-card/60 backdrop-blur-xl border-border hover:border-ice-400/30 transition-all duration-300">
      <CardContent className="p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-bg-input flex items-center justify-center text-ice-400">
              <Landmark className="w-5 h-5" />
            </div>
            <span className="font-semibold text-lg text-white">{market.name}</span>
          </div>
          {isDemo && (
            <span className="text-xs bg-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded">[Demo]</span>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4 bg-bg-input/50 rounded-xl p-3">
          <div>
            <div className="text-xs text-text-secondary mb-1">LLTV</div>
            <div className="font-mono font-medium text-white">{formatNumber(Number(market.lltv) / 1e16)}%</div>
          </div>
          <div>
            <div className="text-xs text-text-secondary mb-1">Available to borrow</div>
            <div className="font-mono font-medium text-white">
              {formatTokenAmount(market.totalSupply - market.totalBorrow, 18, 2)}
            </div>
          </div>
        </div>

        {displayPosition && (
          <div className="text-xs space-y-1 pt-2 border-t border-border">
            <div className="flex justify-between">
              <span className="text-text-secondary">Collateral</span>
              <span className="font-mono">{formatTokenAmount(displayPosition.collateral, 18, 4)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-secondary">Borrowed</span>
              <span className="font-mono">{formatTokenAmount(displayPosition.borrowAssets, 18, 4)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-secondary">Health Factor</span>
              <span className={`font-mono ${displayPosition.healthFactor < 1.2 ? "text-red-400" : "text-success"}`}>
                {displayPosition.healthFactor === Infinity ? "\u221E" : formatNumber(displayPosition.healthFactor)}
              </span>
            </div>
          </div>
        )}

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="w-full" disabled={!isConnected || isDemo}>
              {!isConnected ? "Connect Wallet" : "Manage Position"}
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>{market.name} - Borrow Position</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
              <div className="space-y-2">
                <label className="text-sm text-text-secondary font-medium">Supply Collateral ({market.collSymbol})</label>
                <Input placeholder="0.00" className="font-mono" value={collAmount} onChange={(e) => setCollAmount(e.target.value)} />
                {collBalance && (
                  <p className="text-xs text-text-tertiary">Balance: {formatTokenAmount(collBalance.value, 18, 4)}</p>
                )}
                <Button size="sm" className="w-full" onClick={handleSupplyCollateral} disabled={!collAmount || actions.isPending || isDemo}>
                  Supply Collateral
                </Button>
              </div>

              <div className="border-t border-border" />

              <div className="space-y-2">
                <label className="text-sm text-text-secondary font-medium">Borrow ({market.loanSymbol})</label>
                <Input placeholder="0.00" className="font-mono" value={borrowAmount} onChange={(e) => setBorrowAmount(e.target.value)} />
                {hfWarning && (
                  <p className="text-xs text-red-400">Health Factor below 1 - position will be liquidatable</p>
                )}
                <Button size="sm" className="w-full" onClick={handleBorrow} disabled={!borrowAmount || actions.isPending || isDemo || hfWarning}>
                  Borrow
                </Button>
              </div>

              <div className="border-t border-border" />

              <div className="space-y-2">
                <label className="text-sm text-text-secondary font-medium">Repay ({market.loanSymbol})</label>
                <Input placeholder="0.00" className="font-mono" value={repayAmount} onChange={(e) => setRepayAmount(e.target.value)} />
                <Button size="sm" variant="secondary" className="w-full" onClick={handleRepay} disabled={!repayAmount || actions.isPending || isDemo}>
                  Repay
                </Button>
              </div>

              <div className="border-t border-border" />

              <div className="space-y-2">
                <label className="text-sm text-text-secondary font-medium">Withdraw Collateral ({market.collSymbol})</label>
                <Input placeholder="0.00" className="font-mono" value={withdrawCollAmount} onChange={(e) => setWithdrawCollAmount(e.target.value)} />
                <Button size="sm" variant="secondary" className="w-full" onClick={handleWithdrawCollateral} disabled={!withdrawCollAmount || actions.isPending || isDemo}>
                  Withdraw Collateral
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <TxPipelineModal
          open={pipeline.showTxModal}
          onClose={() => {
            if (pipeline.txPhase === "complete") setDialogOpen(false);
            pipeline.reset();
          }}
          steps={pipeline.txSteps}
          phase={pipeline.txPhase}
          title={`${market.name} Transaction`}
        />
      </CardContent>
    </Card>
  );
}

export default function MorphoBorrowPage() {
  const { markets } = useMorphoMarkets();

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
      {markets.map((m, i) => (
        <MarketBorrowCard key={m.id} market={m} index={i} />
      ))}
    </div>
  );
}
