"use client";

import { useState } from "react";
import { useConnection, useReadContract, useWriteContract } from "wagmi";
import { useTokenBalance } from "@/hooks/useTokenBalance";
import { parseEther, formatEther } from "viem";
import {
  Card, CardHeader, CardTitle, CardContent, CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { StatCard } from "@/components/common/StatCard";
import { LIQUITY, TOKENS } from "@/config/addresses";
import {
  TroveManagerABI,
  TroveNFTABI,
  ActivePoolABI,
  MockPriceFeedABI,
} from "@/abis";
import { formatTokenAmount, formatNumber } from "@/lib/utils";
import { HandCoins, Shield, TrendingDown, DollarSign, Loader2 } from "lucide-react";

const BRANCHES = [
  { key: "wCTC" as const, label: "wCTC", token: TOKENS.wCTC },
  { key: "lstCTC" as const, label: "lstCTC", token: TOKENS.lstCTC },
];

export default function BorrowPage() {
  const { address, isConnected } = useConnection();
  const [selectedBranch, setSelectedBranch] = useState<"wCTC" | "lstCTC">("wCTC");

  const branch = LIQUITY.branches[selectedBranch];

  // Protocol stats
  const { data: systemColl } = useReadContract({
    address: branch.troveManager,
    abi: TroveManagerABI,
    functionName: "getEntireSystemColl",
    query: { refetchInterval: 10_000 },
  });

  const { data: systemDebt } = useReadContract({
    address: branch.troveManager,
    abi: TroveManagerABI,
    functionName: "getEntireSystemDebt",
    query: { refetchInterval: 10_000 },
  });

  const { data: priceResult } = useReadContract({
    address: branch.priceFeed,
    abi: MockPriceFeedABI,
    functionName: "getPrice",
    query: { refetchInterval: 10_000 },
  });

  // User troves count
  const { data: troveCount } = useReadContract({
    address: branch.troveNFT,
    abi: TroveNFTABI,
    functionName: "balanceOf",
    args: [address!],
    query: { enabled: !!address },
  });

  const { data: collBalance } = useTokenBalance({
    address,
    token: BRANCHES.find((b) => b.key === selectedBranch)!.token,
  });

  const price = priceResult ?? 0n;
  const tvl = systemColl ? systemColl : 0n;
  const totalDebt = systemDebt ? systemDebt : 0n;
  const tcr =
    totalDebt > 0n && price > 0n
      ? Number(((tvl * price) / totalDebt) * 100n / (10n ** 18n)) / 100
      : 0;

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      {/* Branch selector */}
      <Tabs
        value={selectedBranch}
        onValueChange={(v) => setSelectedBranch(v as "wCTC" | "lstCTC")}
      >
        <TabsList>
          {BRANCHES.map((b) => (
            <TabsTrigger key={b.key} value={b.key}>
              {b.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label={`${selectedBranch} Price`}
          value={
            price > 0n
              ? `$${formatTokenAmount(price, 18, 2)}`
              : "—"
          }
          icon={<DollarSign className="w-4 h-4" />}
        />
        <StatCard
          label="TVL"
          value={formatTokenAmount(tvl, 18, 2)}
          sub={selectedBranch}
          icon={<Shield className="w-4 h-4" />}
        />
        <StatCard
          label="Total Debt"
          value={formatTokenAmount(totalDebt, 18, 2)}
          sub="sbUSD"
          icon={<TrendingDown className="w-4 h-4" />}
        />
        <StatCard
          label="TCR"
          value={`${formatNumber(tcr)}%`}
          icon={<HandCoins className="w-4 h-4" />}
        />
      </div>

      {/* Troves */}
      <Card>
        <CardHeader>
          <CardTitle>Your Troves</CardTitle>
          <CardDescription>
            Deposit {selectedBranch} as collateral to borrow sbUSD
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!isConnected ? (
            <div className="text-center py-8 text-text-secondary">
              Connect wallet to view your troves
            </div>
          ) : troveCount === 0n ? (
            <div className="text-center py-8 space-y-4">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[#1C1D30] text-[#60a5fa] mb-2">
                <Shield className="w-8 h-8" />
              </div>
              <p className="text-[#8B8D97]">
                You don&apos;t have any active {selectedBranch} troves yet
              </p>
              <div className="inline-block px-4 py-2 rounded-lg bg-[#141525] border border-[#1F2037]">
                <p className="text-sm text-[#8B8D97]">
                  Available Balance: <span className="font-mono text-white">{collBalance ? formatTokenAmount(collBalance.value, 18, 4) : "0"} {selectedBranch}</span>
                </p>
              </div>
              <div>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button className="mt-2 inline-flex gap-2">
                      Open Trove
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                      <DialogTitle>Open {selectedBranch} Trove</DialogTitle>
                      <DialogDescription>
                        Deposit {selectedBranch} to mint sbUSD safely. Maintain your Collateral Ratio above 110%.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <label className="text-sm text-[#8B8D97]">Collateral Amount ({selectedBranch})</label>
                        <Input placeholder="0.00" className="font-mono" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm text-[#8B8D97]">Borrow Amount (sbUSD)</label>
                        <Input placeholder="0.00" className="font-mono" />
                      </div>

                      <div className="rounded-xl bg-[#1C1D30] p-4 space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-[#8B8D97]">Collateral Ratio</span>
                          <span className="font-mono text-[#22c55e]">0.00%</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-[#8B8D97]">Liquidation Price</span>
                          <span className="font-mono text-white">$0.00</span>
                        </div>
                      </div>

                      <Button className="w-full" disabled>Connect Wallet to Mint</Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-text-secondary">
              You have {String(troveCount)} trove(s). Trove details loading...
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
