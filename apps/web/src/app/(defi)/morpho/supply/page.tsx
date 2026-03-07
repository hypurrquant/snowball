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
import { Landmark } from "lucide-react";

const IS_TEST_MODE = process.env.NEXT_PUBLIC_TEST_MODE === "true";

function MarketSupplyCard({
  market,
  index,
}: {
  market: MorphoMarket;
  index: number;
}) {
  const { address, isConnected } = useConnection();
  const { position, refetch: refetchPosition } = useMorphoPosition(market.id, address, market.oraclePrice);
  const { data: tokenBalance, refetch: refetchBalance } = useTokenBalance({ address, token: market.loanToken });
  const actions = useMorphoActions(market, () => { refetchPosition(); refetchBalance(); });
  const pipeline = useTxPipeline();

  const [supplyAmount, setSupplyAmount] = useState("");
  const [withdrawAmount, setWithdrawAmount] = useState("");

  const parsedSupply = (() => { try { return supplyAmount ? parseEther(supplyAmount) : 0n; } catch { return 0n; } })();
  const insufficientBalance = parsedSupply > 0n && tokenBalance && parsedSupply > tokenBalance.value;
  const [dialogOpen, setDialogOpen] = useState(false);

  const demoPosition = IS_TEST_MODE ? DEMO_POSITIONS[index] : null;
  const displayPosition = position ?? demoPosition;
  const isDemo = !position && !!demoPosition;

  const handleSupply = async () => {
    if (!supplyAmount) return;
    const amount = parseEther(supplyAmount);
    await pipeline.run(
      [
        { id: "approve", type: "approve" as const, label: `Approve ${market.loanSymbol}` },
        { id: "supply", type: "supply" as const, label: `Supply ${market.loanSymbol}` },
      ],
      {
        approve: async () => { const h = await actions.approveLoan(amount); return h as `0x${string}` | undefined; },
        supply: async () => { const h = await actions.supply(amount); return h as `0x${string}` | undefined; },
      },
    );
    setSupplyAmount("");
  };

  const handleWithdraw = async () => {
    if (!withdrawAmount) return;
    const amount = parseEther(withdrawAmount);
    await pipeline.run(
      [{ id: "withdraw", type: "withdraw", label: `Withdraw ${market.loanSymbol}` }],
      { withdraw: async () => { const h = await actions.withdraw(amount); return h as `0x${string}` | undefined; } },
    );
    setWithdrawAmount("");
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
            <div className="text-xs text-text-secondary mb-1">Supply APY</div>
            <div className="text-success font-mono font-medium">{formatNumber(market.supplyAPY)}%</div>
          </div>
          <div>
            <div className="text-xs text-text-secondary mb-1">Borrow APR</div>
            <div className="text-warning font-mono font-medium">{formatNumber(market.borrowAPR)}%</div>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between text-xs">
            <span className="text-text-secondary">Utilization</span>
            <span className="font-mono text-white">{formatNumber(market.utilization)}%</span>
          </div>
          <div className="h-2 rounded-full bg-bg-input overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-ice-400 to-ice-500 rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, Math.max(0, market.utilization))}%` }}
            />
          </div>
        </div>

        {displayPosition && (
          <div className="text-xs space-y-1 pt-2 border-t border-border">
            <div className="flex justify-between">
              <span className="text-text-secondary">Your Supply</span>
              <span className="font-mono">{formatTokenAmount(displayPosition.supplyAssets, 18, 4)}</span>
            </div>
          </div>
        )}

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="w-full" disabled={!isConnected || isDemo}>
              {!isConnected ? "Connect Wallet" : "Supply / Withdraw"}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{market.name} - Supply / Withdraw</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label className="text-sm text-text-secondary">Supply {market.loanSymbol}</label>
                <Input placeholder="0.00" className="font-mono" value={supplyAmount} onChange={(e) => setSupplyAmount(e.target.value)} />
                {tokenBalance && (
                  <p className="text-xs text-text-tertiary">Balance: {formatTokenAmount(tokenBalance.value, 18, 4)}</p>
                )}
              </div>
              {insufficientBalance && (
                <p className="text-xs text-red-400">Insufficient balance</p>
              )}
              <Button className="w-full" onClick={handleSupply} disabled={!supplyAmount || !!insufficientBalance || actions.isPending || isDemo}>
                {insufficientBalance ? "Insufficient Balance" : "Supply"}
              </Button>

              <div className="border-t border-border pt-4 space-y-2">
                <label className="text-sm text-text-secondary">Withdraw {market.loanSymbol}</label>
                <Input placeholder="0.00" className="font-mono" value={withdrawAmount} onChange={(e) => setWithdrawAmount(e.target.value)} />
              </div>
              <Button className="w-full" variant="secondary" onClick={handleWithdraw} disabled={!withdrawAmount || actions.isPending || isDemo}>
                Withdraw
              </Button>
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
          title={`${market.loanSymbol} Transaction`}
        />
      </CardContent>
    </Card>
  );
}

export default function MorphoSupplyPage() {
  const { markets } = useMorphoMarkets();

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
      {markets.map((m, i) => (
        <MarketSupplyCard key={m.id} market={m} index={i} />
      ))}
    </div>
  );
}
