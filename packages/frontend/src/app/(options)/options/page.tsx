"use client";

import { useState } from "react";
import { useConnection, useWriteContract } from "wagmi";
import { parseEther } from "viem";
import {
  Card, CardHeader, CardTitle, CardContent, CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/common/StatCard";
import { PriceChart } from "@/components/options/PriceChart";
import { useOptions } from "@/hooks/options/useOptions";
import { useOptionsPrice } from "@/hooks/options/useOptionsPrice";
import { OptionsClearingHouseABI } from "@/abis";
import { OPTIONS } from "@/config/addresses";
import { formatTokenAmount, formatNumber } from "@/lib/utils";
import {
  ChartCandlestick,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Clock,
  Wallet,
  Loader2,
} from "lucide-react";

const ROUND_STATUS = ["Open", "Executed", "Settled"];

export default function OptionsPage() {
  const { address, isConnected } = useConnection();
  const { currentPrice, priceHistory } = useOptionsPrice();
  const { round, userBalance, userEscrow, submitOrder, isSubmitting } =
    useOptions();

  const [side, setSide] = useState<"over" | "under">("over");
  const [amount, setAmount] = useState("");
  const [depositAmount, setDepositAmount] = useState("");

  // Deposit to ClearingHouse
  const { writeContractAsync: depositAsync, isPending: isDepositing } =
    useWriteContract();

  const handleDeposit = async () => {
    if (!depositAmount) return;
    try {
      await depositAsync({
        address: OPTIONS.clearingHouse,
        abi: OptionsClearingHouseABI,
        functionName: "deposit",
        args: [parseEther(depositAmount)],
        value: parseEther(depositAmount),
      });
      setDepositAmount("");
    } catch (err) {
      console.error("Deposit failed:", err);
    }
  };

  const handleSubmitOrder = async () => {
    if (!amount) return;
    // In production, this would involve EIP-712 signing
    // For now, send via API
    try {
      await submitOrder({
        isOver: side === "over",
        amount: parseEther(amount).toString(),
        signature: "0x", // placeholder
        nonce: 0,
      });
      setAmount("");
    } catch (err) {
      console.error("Order failed:", err);
    }
  };

  const timeLeft =
    round && round.status === 0
      ? Math.max(
        0,
        Number(round.startTime + round.duration) -
        Math.floor(Date.now() / 1000)
      )
      : 0;
  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
      {/* Price + Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="BTC Price"
          value={
            currentPrice
              ? `$${formatNumber(currentPrice.price)}`
              : "—"
          }
          icon={<DollarSign className="w-4 h-4" />}
        />
        <StatCard
          label="Round"
          value={round ? `#${round.id}` : "—"}
          sub={round ? ROUND_STATUS[round.status] : undefined}
          icon={<ChartCandlestick className="w-4 h-4" />}
        />
        <StatCard
          label="Time Left"
          value={
            round && round.status === 0
              ? `${minutes}:${seconds.toString().padStart(2, "0")}`
              : "—"
          }
          icon={<Clock className="w-4 h-4" />}
        />
        <StatCard
          label="Your Balance"
          value={formatTokenAmount(userBalance, 18, 4)}
          sub={`Escrow: ${formatTokenAmount(userEscrow, 18, 4)}`}
          icon={<Wallet className="w-4 h-4" />}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6">
        {/* Chart */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">BTC/USD</CardTitle>
          </CardHeader>
          <CardContent>
            <PriceChart
              data={priceHistory}
              currentPrice={currentPrice?.price}
            />
          </CardContent>
        </Card>

        {/* Order Panel */}
        <div className="space-y-4">
          {/* Deposit */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Deposit</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex gap-2">
                <Input
                  type="text"
                  inputMode="decimal"
                  placeholder="0.0 tCTC"
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                  className="text-sm"
                />
                <Button
                  size="sm"
                  onClick={handleDeposit}
                  disabled={!isConnected || !depositAmount || isDepositing}
                >
                  {isDepositing ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    "Deposit"
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Order Form */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Place Order</CardTitle>
              <CardDescription>
                Predict if BTC price goes Over or Under
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Round info */}
              {round && round.status === 0 && (
                <div className="rounded-xl bg-[#1C1D30] p-4 space-y-3">
                  <div className="flex justify-between items-center bg-[#141525] rounded-lg p-2 px-3 border border-[#1F2037]">
                    <span className="text-xs text-[#8B8D97] uppercase tracking-wider font-semibold">Start Price</span>
                    <span className="font-mono text-sm text-white">
                      ${formatTokenAmount(round.startPrice, 18, 2)}
                    </span>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-xs">
                      <span className="text-[#8B8D97]">Pool Ratio</span>
                      <span className="font-mono text-[#8B8D97]">
                        {Number(round.totalOverAmount) === 0 && Number(round.totalUnderAmount) === 0
                          ? '50% / 50%'
                          : `${((Number(round.totalOverAmount) / (Number(round.totalOverAmount) + Number(round.totalUnderAmount))) * 100).toFixed(1)}% / ${((Number(round.totalUnderAmount) / (Number(round.totalOverAmount) + Number(round.totalUnderAmount))) * 100).toFixed(1)}%`}
                      </span>
                    </div>
                    <div className="h-2 flex rounded-full overflow-hidden">
                      <div
                        style={{ width: Number(round.totalOverAmount) === 0 && Number(round.totalUnderAmount) === 0 ? '50%' : `${(Number(round.totalOverAmount) / (Number(round.totalOverAmount) + Number(round.totalUnderAmount))) * 100}%` }}
                        className="bg-[#22c55e] transition-all duration-500"
                      />
                      <div
                        style={{ width: Number(round.totalOverAmount) === 0 && Number(round.totalUnderAmount) === 0 ? '50%' : `${(Number(round.totalUnderAmount) / (Number(round.totalOverAmount) + Number(round.totalUnderAmount))) * 100}%` }}
                        className="bg-[#ef4444] transition-all duration-500"
                      />
                    </div>

                    <div className="flex justify-between text-xs pt-1">
                      <span className="font-mono text-[#22c55e]">
                        {formatTokenAmount(round.totalOverAmount, 18, 4)} tCTC
                      </span>
                      <span className="font-mono text-[#ef4444]">
                        {formatTokenAmount(round.totalUnderAmount, 18, 4)} tCTC
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Side Selection */}
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant={side === "over" ? "success" : "secondary"}
                  onClick={() => setSide("over")}
                  className="flex-col h-auto py-3"
                >
                  <TrendingUp className="w-5 h-5 mb-1" />
                  <span className="text-sm font-semibold">Over</span>
                </Button>
                <Button
                  variant={side === "under" ? "destructive" : "secondary"}
                  onClick={() => setSide("under")}
                  className="flex-col h-auto py-3"
                >
                  <TrendingDown className="w-5 h-5 mb-1" />
                  <span className="text-sm font-semibold">Under</span>
                </Button>
              </div>

              {/* Amount */}
              <Input
                type="text"
                inputMode="decimal"
                placeholder="Amount (tCTC)"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />

              {/* Submit */}
              <Button
                className="w-full"
                onClick={handleSubmitOrder}
                disabled={
                  !isConnected ||
                  !amount ||
                  isSubmitting ||
                  !round ||
                  round.status !== 0
                }
              >
                {isSubmitting && (
                  <Loader2 className="w-4 h-4 animate-spin" />
                )}
                {side === "over" ? "Bet Over" : "Bet Under"}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
