"use client";

import { useConnection, useReadContracts } from "wagmi";
import { useTokenBalance } from "@/shared/hooks/useTokenBalance";
import { Card, CardHeader, CardTitle, CardContent } from "@/shared/components/ui/card";
import { StatCard } from "@/shared/components/common/StatCard";
import { TOKENS, LIQUITY } from "@/core/config/addresses";
import { TroveNFTABI, StabilityPoolABI } from "@/core/abis";
import { formatTokenAmount } from "@/shared/lib/utils";
import {
  Wallet,
  LayoutDashboard,
  HandCoins,
  Percent,
  ArrowLeftRight,
  Landmark,
  ChartCandlestick,
} from "lucide-react";
import Link from "next/link";

const QUICK_LINKS = [
  { href: "/swap", label: "Swap", icon: <ArrowLeftRight className="w-5 h-5" />, color: "text-blue-400" },
  { href: "/lend", label: "Lend", icon: <Landmark className="w-5 h-5" />, color: "text-emerald-400" },
  { href: "/borrow", label: "Borrow", icon: <HandCoins className="w-5 h-5" />, color: "text-amber-400" },
  { href: "/earn", label: "Earn", icon: <Percent className="w-5 h-5" />, color: "text-purple-400" },
  { href: "/options", label: "Options", icon: <ChartCandlestick className="w-5 h-5" />, color: "text-rose-400" },
];

export default function DashboardPage() {
  const { address, isConnected } = useConnection();

  const { data: tCTCBalance } = useTokenBalance({ address });
  const { data: wCTCBalance } = useTokenBalance({ address, token: TOKENS.wCTC });
  const { data: sbUSDBalance } = useTokenBalance({ address, token: TOKENS.sbUSD });
  const { data: lstCTCBalance } = useTokenBalance({ address, token: TOKENS.lstCTC });

  // Trove count
  const { data: troveData } = useReadContracts({
    contracts: [
      {
        address: LIQUITY.branches.wCTC.troveNFT,
        abi: TroveNFTABI,
        functionName: "balanceOf",
        args: [address!],
      },
      {
        address: LIQUITY.branches.lstCTC.troveNFT,
        abi: TroveNFTABI,
        functionName: "balanceOf",
        args: [address!],
      },
      {
        address: LIQUITY.branches.wCTC.stabilityPool,
        abi: StabilityPoolABI,
        functionName: "getCompoundedBoldDeposit",
        args: [address!],
      },
    ],
    query: { enabled: !!address },
  });

  const wCTCTroves =
    troveData?.[0]?.status === "success" ? Number(troveData[0].result) : 0;
  const lstCTCTroves =
    troveData?.[1]?.status === "success" ? Number(troveData[1].result) : 0;
  const spDeposit =
    troveData?.[2]?.status === "success" ? (troveData[2].result as bigint) : 0n;

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      <h1 className="text-2xl font-bold flex items-center gap-2">
        <LayoutDashboard className="w-6 h-6 text-ice-400" />
        Dashboard
      </h1>

      {!isConnected ? (
        <Card>
          <CardContent className="py-12 text-center text-text-secondary">
            Connect your wallet to view your dashboard
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Balances */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              label="tCTC"
              value={
                tCTCBalance
                  ? formatTokenAmount(tCTCBalance.value, 18, 4)
                  : "—"
              }
              icon={<Wallet className="w-4 h-4" />}
            />
            <StatCard
              label="wCTC"
              value={
                wCTCBalance
                  ? formatTokenAmount(wCTCBalance.value, 18, 4)
                  : "—"
              }
              icon={<Wallet className="w-4 h-4" />}
            />
            <StatCard
              label="sbUSD"
              value={
                sbUSDBalance
                  ? formatTokenAmount(sbUSDBalance.value, 18, 4)
                  : "—"
              }
              icon={<Wallet className="w-4 h-4" />}
            />
            <StatCard
              label="lstCTC"
              value={
                lstCTCBalance
                  ? formatTokenAmount(lstCTCBalance.value, 18, 4)
                  : "—"
              }
              icon={<Wallet className="w-4 h-4" />}
            />
          </div>

          {/* Positions Summary */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <StatCard
              label="Active Troves"
              value={`${wCTCTroves + lstCTCTroves}`}
              sub={`wCTC: ${wCTCTroves}, lstCTC: ${lstCTCTroves}`}
              icon={<HandCoins className="w-5 h-5 text-ice-400" />}
            />
            <StatCard
              label="SP Deposit"
              value={formatTokenAmount(spDeposit, 18, 4)}
              sub="sbUSD"
              icon={<Percent className="w-5 h-5 text-ice-400" />}
            />
            <StatCard
              label="Lend Positions"
              value="—"
              sub="View in Lend"
              icon={<Landmark className="w-5 h-5 text-ice-400" />}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="bg-bg-card/60 backdrop-blur-xl border-white/5">
              <CardHeader>
                <CardTitle className="text-base text-white">Portfolio Asset Distribution</CardTitle>
              </CardHeader>
              <CardContent className="flex items-center justify-center min-h-[200px]">
                {/* Placeholder for Recharts Donut */}
                <div className="text-text-secondary text-sm flex flex-col items-center gap-2">
                  <div className="w-32 h-32 rounded-full border-4 border-border border-t-ice-400 border-r-violet-500 border-b-emerald-400 animate-[spin_10s_linear_infinite]" />
                  <span className="mt-4">Loading Chart Data...</span>
                </div>
              </CardContent>
            </Card>

            {/* Quick Links */}
            <Card className="bg-bg-card/60 backdrop-blur-xl border-white/5">
              <CardHeader>
                <CardTitle className="text-base text-white">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3">
                  {QUICK_LINKS.map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      className="group flex items-center gap-3 p-4 rounded-xl bg-bg-input/50 border border-transparent hover:border-ice-400/30 hover:bg-bg-hover transition-all duration-300"
                    >
                      <div className={`p-2 rounded-lg bg-bg-card group-hover:scale-110 transition-transform ${link.color}`}>
                        {link.icon}
                      </div>
                      <span className="text-sm font-medium text-white">
                        {link.label}
                      </span>
                    </Link>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
