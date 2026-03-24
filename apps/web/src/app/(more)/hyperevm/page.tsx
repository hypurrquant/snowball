"use client";

import { useState, useMemo } from "react";
import { useConnection } from "wagmi";
import { parseUnits, formatUnits, type Address } from "viem";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { Input } from "@/shared/components/ui/input";
import { useHyperLendMarkets } from "@/domains/defi/hyperlend/hooks/useHyperLendMarkets";
import { useHyperLendActions } from "@/domains/defi/hyperlend/hooks/useHyperLendActions";
import { useHyperSwap } from "@/domains/trade/hooks/useHyperSwap";
import {
  Landmark,
  ArrowDownUp,
  Loader2,
  ExternalLink,
  Zap,
  Shield,
} from "lucide-react";

// ─── Token lists ──────────────────────────────────────────────────────────────

const HYPEREVM_CHAIN_ID = 999;

const WHYPE: Address = "0x5555555555555555555555555555555555555555";
const USDT0: Address = "0xB8CE59FC3717ada4C02eaDF9682A9e934F625ebb";

const SWAP_TOKENS: { symbol: string; address: Address; decimals: number }[] = [
  { symbol: "wHYPE", address: WHYPE, decimals: 18 },
  { symbol: "USDT0", address: USDT0, decimals: 6 },
  { symbol: "USDC", address: "0x6d3cC56DFC016151eE2613BdDe0e03Af9ba885CC", decimals: 6 },
  { symbol: "USDe", address: "0x5d3a1Ff2b6BAb83b63cd9AD0787074081a52ef34", decimals: 18 },
  { symbol: "feUSD", address: "0x02c6a2fa58cc01a18b8d9e00ea48d65e4df26c70", decimals: 18 },
];

// ─── Tab types ────────────────────────────────────────────────────────────────

type Tab = "lending" | "cdp" | "swap";

// ─── Inline market action row ────────────────────────────────────────────────

interface MarketRowProps {
  symbol: string;
  underlying: Address;
  decimals: number;
  supplyAPY: number;
  borrowAPY: number;
  isHyperEVM: boolean;
}

function MarketRow({
  symbol,
  underlying,
  decimals,
  supplyAPY,
  borrowAPY,
  isHyperEVM,
}: MarketRowProps) {
  const [mode, setMode] = useState<"idle" | "supply" | "borrow">("idle");
  const [amountStr, setAmountStr] = useState("");
  const [txError, setTxError] = useState<string | null>(null);

  const { supply, borrow, approve, isPending } = useHyperLendActions(
    underlying,
    () => {
      setMode("idle");
      setAmountStr("");
      setTxError(null);
    }
  );

  const parsedAmount = useMemo(() => {
    try {
      return amountStr ? parseUnits(amountStr, decimals) : undefined;
    } catch {
      return undefined;
    }
  }, [amountStr, decimals]);

  const handleAction = async () => {
    if (!parsedAmount) return;
    setTxError(null);
    try {
      if (mode === "supply") {
        await approve?.();
        await supply(parsedAmount);
      } else if (mode === "borrow") {
        await borrow(parsedAmount);
      }
    } catch (err) {
      setTxError(err instanceof Error ? err.message : "Transaction failed");
    }
  };

  return (
    <>
      <tr className="border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors">
        <td className="px-4 py-3 font-medium text-white">{symbol}</td>
        <td className="px-4 py-3 text-right text-emerald-400">
          {supplyAPY.toFixed(2)}%
        </td>
        <td className="px-4 py-3 text-right text-amber-400">
          {borrowAPY.toFixed(2)}%
        </td>
        <td className="px-4 py-3 text-right">
          {isHyperEVM && (
            <div className="flex justify-end gap-1">
              <button
                onClick={() => {
                  setMode(mode === "supply" ? "idle" : "supply");
                  setAmountStr("");
                  setTxError(null);
                }}
                className={`text-xs px-2 py-1 rounded border transition-colors ${
                  mode === "supply"
                    ? "bg-emerald-400/20 border-emerald-400/40 text-emerald-400"
                    : "border-white/10 text-text-secondary hover:text-emerald-400 hover:border-emerald-400/30"
                }`}
              >
                Supply
              </button>
              <button
                onClick={() => {
                  setMode(mode === "borrow" ? "idle" : "borrow");
                  setAmountStr("");
                  setTxError(null);
                }}
                className={`text-xs px-2 py-1 rounded border transition-colors ${
                  mode === "borrow"
                    ? "bg-amber-400/20 border-amber-400/40 text-amber-400"
                    : "border-white/10 text-text-secondary hover:text-amber-400 hover:border-amber-400/30"
                }`}
              >
                Borrow
              </button>
            </div>
          )}
        </td>
      </tr>
      {mode !== "idle" && (
        <tr className="border-b border-white/5 bg-white/[0.02]">
          <td colSpan={4} className="px-4 py-3">
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min="0"
                placeholder={`Amount (${symbol})`}
                value={amountStr}
                onChange={(e) => setAmountStr(e.target.value)}
                className="flex-1 max-w-xs bg-bg-input border-white/10 text-white placeholder:text-text-secondary h-8 text-sm"
              />
              <Button
                size="sm"
                onClick={handleAction}
                disabled={isPending || !parsedAmount}
                className={
                  mode === "supply"
                    ? "bg-emerald-500 hover:bg-emerald-600 text-white h-8 text-xs"
                    : "bg-amber-500 hover:bg-amber-600 text-white h-8 text-xs"
                }
              >
                {isPending && (
                  <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                )}
                {mode === "supply" ? "Supply" : "Borrow"} {symbol}
              </Button>
              <button
                onClick={() => {
                  setMode("idle");
                  setAmountStr("");
                  setTxError(null);
                }}
                className="text-xs text-text-secondary hover:text-white transition-colors"
              >
                Cancel
              </button>
            </div>
            {txError && (
              <p className="mt-1 text-xs text-red-400">{txError}</p>
            )}
          </td>
        </tr>
      )}
    </>
  );
}

// ─── Lending tab ──────────────────────────────────────────────────────────────

function LendingTab({ isHyperEVM }: { isHyperEVM: boolean }) {
  const { markets, isLoading } = useHyperLendMarkets();

  return (
    <Card className="bg-bg-card/60 backdrop-blur-xl border-white/5">
      <CardHeader>
        <CardTitle className="text-base text-white flex items-center gap-2">
          <Landmark className="w-4 h-4 text-ice-400" />
          HyperLend Markets
          <Badge variant="outline" className="ml-auto text-xs">
            Aave V3 Fork
          </Badge>
          <a
            href="https://hyperlend.finance"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-xs text-text-secondary hover:text-ice-400 transition-colors"
          >
            <ExternalLink className="w-3 h-3" />
          </a>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {isLoading ? (
          <div className="space-y-2 p-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-10 w-full rounded-lg" />
            ))}
          </div>
        ) : markets.length === 0 ? (
          <div className="py-10 text-center text-text-secondary text-sm">
            {isHyperEVM
              ? "No market data available."
              : "Connect to HyperEVM to view markets."}
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/5 text-text-secondary">
                <th className="text-left px-4 py-2 font-medium">Asset</th>
                <th className="text-right px-4 py-2 font-medium">Supply APY</th>
                <th className="text-right px-4 py-2 font-medium">Borrow APY</th>
                <th className="text-right px-4 py-2 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {markets.map((m) => (
                <MarketRow
                  key={m.underlying}
                  symbol={m.symbol}
                  underlying={m.underlying}
                  decimals={m.decimals}
                  supplyAPY={m.supplyAPY}
                  borrowAPY={m.borrowAPY}
                  isHyperEVM={isHyperEVM}
                />
              ))}
            </tbody>
          </table>
        )}
      </CardContent>
    </Card>
  );
}

// ─── CDP tab ──────────────────────────────────────────────────────────────────

// Felix contract addresses — set to zero address until verified on HyperEVM
const FELIX_TROVE_MANAGER: Address = "0x0000000000000000000000000000000000000000";

function CdpTab() {
  const felixDeployed =
    FELIX_TROVE_MANAGER !== "0x0000000000000000000000000000000000000000";

  return (
    <div className="space-y-4">
      {/* Stats row */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="bg-bg-card/60 backdrop-blur-xl border-white/5">
          <CardContent className="py-4">
            <p className="text-xs text-text-secondary uppercase tracking-wider mb-1">
              feUSD Price
            </p>
            <p className="text-xl font-bold text-white">$1.00</p>
            <p className="text-xs text-text-secondary mt-1">Soft-pegged stablecoin</p>
          </CardContent>
        </Card>
        <Card className="bg-bg-card/60 backdrop-blur-xl border-white/5">
          <CardContent className="py-4">
            <p className="text-xs text-text-secondary uppercase tracking-wider mb-1">
              Total feUSD Supply
            </p>
            <p className="text-xl font-bold text-white">—</p>
            <p className="text-xs text-text-secondary mt-1">Loading…</p>
          </CardContent>
        </Card>
      </div>

      {/* Main card */}
      <Card className="bg-bg-card/60 backdrop-blur-xl border-white/5">
        <CardHeader>
          <CardTitle className="text-base text-white flex items-center gap-2">
            <Shield className="w-4 h-4 text-ice-400" />
            Felix — feUSD Stablecoin
            <a
              href="https://www.usefelix.xyz/"
              target="_blank"
              rel="noopener noreferrer"
              className="ml-auto flex items-center gap-1 text-xs text-text-secondary hover:text-ice-400 transition-colors font-normal"
            >
              usefelix.xyz <ExternalLink className="w-3 h-3" />
            </a>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-text-secondary mb-4">
            feUSD is a CDP stablecoin backed by HYPE collateral. Mint feUSD by
            depositing wHYPE as collateral in a Trove, repay your debt to
            reclaim collateral at any time.
          </p>

          {felixDeployed ? (
            <div className="space-y-4">
              {/* Trove management UI — shown when contracts are deployed */}
              <div className="rounded-lg border border-white/10 p-4 space-y-3">
                <h3 className="text-sm font-medium text-white">Open / Manage Trove</h3>
                <div className="space-y-2">
                  <div>
                    <label className="text-xs text-text-secondary uppercase tracking-wider">
                      Collateral (wHYPE)
                    </label>
                    <Input
                      type="number"
                      min="0"
                      placeholder="0.00"
                      className="mt-1 bg-bg-input border-white/10 text-white placeholder:text-text-secondary"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-text-secondary uppercase tracking-wider">
                      Borrow (feUSD)
                    </label>
                    <Input
                      type="number"
                      min="0"
                      placeholder="0.00"
                      className="mt-1 bg-bg-input border-white/10 text-white placeholder:text-text-secondary"
                    />
                  </div>
                </div>
                <Button className="w-full bg-ice-400/10 text-ice-400 border border-ice-400/20 hover:bg-ice-400/20">
                  Open Trove
                </Button>
              </div>
            </div>
          ) : (
            <div className="rounded-lg bg-amber-400/5 border border-amber-400/20 p-4 text-center">
              <p className="text-amber-400 text-sm font-medium">
                Felix integration coming soon
              </p>
              <p className="text-text-secondary text-xs mt-1">
                Contract addresses are being verified on HyperEVM.
              </p>
              <a
                href="https://www.usefelix.xyz/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 mt-3 text-sm text-ice-400 hover:text-ice-300 transition-colors"
              >
                Visit Felix App <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Swap tab ─────────────────────────────────────────────────────────────────

function SwapTab() {
  const { isConnected } = useConnection();

  const [tokenIn, setTokenIn] = useState<Address>(WHYPE);
  const [tokenOut, setTokenOut] = useState<Address>(USDT0);
  const [amountInStr, setAmountInStr] = useState("");

  const tokenInMeta = SWAP_TOKENS.find((t) => t.address === tokenIn);
  const tokenOutMeta = SWAP_TOKENS.find((t) => t.address === tokenOut);

  const amountIn = useMemo(() => {
    try {
      return amountInStr && tokenInMeta
        ? parseUnits(amountInStr, tokenInMeta.decimals)
        : undefined;
    } catch {
      return undefined;
    }
  }, [amountInStr, tokenInMeta]);

  const {
    expectedAmountOut,
    isQuoteLoading,
    isApprovalNeeded,
    approve,
    isApprovePending,
    swap,
    isSwapPending,
    isHyperEVM: isSwapOnHyperEVM,
  } = useHyperSwap(tokenIn, tokenOut, amountIn);

  const flipTokens = () => {
    setTokenIn(tokenOut);
    setTokenOut(tokenIn);
    setAmountInStr("");
  };

  const expectedOut =
    expectedAmountOut !== undefined && tokenOutMeta
      ? formatUnits(expectedAmountOut, tokenOutMeta.decimals)
      : undefined;

  return (
    <Card className="bg-bg-card/60 backdrop-blur-xl border-white/5 max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="text-base text-white flex items-center gap-2">
          <ArrowDownUp className="w-4 h-4 text-ice-400" />
          HyperSwap
          <Badge variant="outline" className="ml-auto text-xs">
            Uniswap V2 Fork
          </Badge>
          <a
            href="https://hyperswap.exchange"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-xs text-text-secondary hover:text-ice-400 transition-colors"
          >
            <ExternalLink className="w-3 h-3" />
          </a>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Token In */}
        <div className="space-y-1">
          <label className="text-xs text-text-secondary uppercase tracking-wider">
            You pay
          </label>
          <div className="flex gap-2">
            <select
              value={tokenIn}
              onChange={(e) => {
                setTokenIn(e.target.value as Address);
                setAmountInStr("");
              }}
              className="rounded-lg bg-bg-input border border-white/10 text-white text-sm px-3 py-2 focus:outline-none focus:border-ice-400/50"
            >
              {SWAP_TOKENS.filter((t) => t.address !== tokenOut).map((t) => (
                <option key={t.address} value={t.address}>
                  {t.symbol}
                </option>
              ))}
            </select>
            <Input
              type="number"
              min="0"
              placeholder="0.00"
              value={amountInStr}
              onChange={(e) => setAmountInStr(e.target.value)}
              className="flex-1 bg-bg-input border-white/10 text-white placeholder:text-text-secondary"
            />
          </div>
        </div>

        {/* Flip */}
        <div className="flex justify-center">
          <button
            onClick={flipTokens}
            className="p-2 rounded-lg bg-bg-input border border-white/10 hover:border-ice-400/40 hover:bg-bg-hover transition-all"
          >
            <ArrowDownUp className="w-4 h-4 text-text-secondary" />
          </button>
        </div>

        {/* Token Out */}
        <div className="space-y-1">
          <label className="text-xs text-text-secondary uppercase tracking-wider">
            You receive
          </label>
          <div className="flex gap-2">
            <select
              value={tokenOut}
              onChange={(e) => setTokenOut(e.target.value as Address)}
              className="rounded-lg bg-bg-input border border-white/10 text-white text-sm px-3 py-2 focus:outline-none focus:border-ice-400/50"
            >
              {SWAP_TOKENS.filter((t) => t.address !== tokenIn).map((t) => (
                <option key={t.address} value={t.address}>
                  {t.symbol}
                </option>
              ))}
            </select>
            <div className="flex-1 rounded-lg bg-bg-input border border-white/10 px-3 py-2 text-sm text-white min-h-[38px] flex items-center">
              {isQuoteLoading ? (
                <Loader2 className="w-4 h-4 animate-spin text-text-secondary" />
              ) : (
                <span className={expectedOut ? "text-white" : "text-text-secondary"}>
                  {expectedOut ?? "—"}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Action Button */}
        {!isConnected ? (
          <Button disabled className="w-full">
            Connect Wallet
          </Button>
        ) : !isSwapOnHyperEVM ? (
          <Button
            disabled
            className="w-full bg-amber-400/10 text-amber-400 border-amber-400/20"
          >
            Switch to HyperEVM
          </Button>
        ) : isApprovalNeeded ? (
          <Button
            onClick={() => approve?.()}
            disabled={isApprovePending}
            className="w-full"
          >
            {isApprovePending && (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            )}
            Approve {tokenInMeta?.symbol}
          </Button>
        ) : (
          <Button
            onClick={() => swap()}
            disabled={isSwapPending || !amountIn || !expectedAmountOut}
            className="w-full bg-white text-black hover:bg-gray-200 disabled:opacity-50"
          >
            {isSwapPending && (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            )}
            Swap
          </Button>
        )}

        <p className="text-xs text-text-secondary text-center">
          0.5% slippage · Powered by HyperSwap V2
        </p>

        {/* Token list */}
        <div className="border-t border-white/5 pt-3">
          <p className="text-xs text-text-secondary mb-2">HyperEVM Tokens</p>
          <div className="flex flex-wrap gap-1">
            {SWAP_TOKENS.map((t) => (
              <Badge
                key={t.address}
                variant="outline"
                className="text-xs cursor-pointer hover:border-ice-400/40 transition-colors"
                onClick={() => {
                  if (t.address !== tokenOut) setTokenIn(t.address);
                }}
              >
                {t.symbol}
              </Badge>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function HyperEVMPage() {
  const [activeTab, setActiveTab] = useState<Tab>("lending");
  const { isHyperEVM } = useHyperLendMarkets();

  const tabs: { id: Tab; label: string }[] = [
    { id: "lending", label: "Lending" },
    { id: "cdp", label: "CDP" },
    { id: "swap", label: "Swap" },
  ];

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Zap className="w-6 h-6 text-amber-400" />
            HyperEVM DeFi Hub
          </h1>
          <Badge className="bg-amber-400/10 text-amber-400 border-amber-400/20">
            Chain 999
          </Badge>
        </div>
        <div className="flex gap-3 text-sm text-text-secondary">
          <a
            href="https://hyperlend.finance"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-ice-400 transition-colors flex items-center gap-1"
          >
            HyperLend <ExternalLink className="w-3 h-3" />
          </a>
          <span>·</span>
          <a
            href="https://www.usefelix.xyz/"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-ice-400 transition-colors flex items-center gap-1"
          >
            Felix <ExternalLink className="w-3 h-3" />
          </a>
          <span>·</span>
          <a
            href="https://hyperswap.exchange"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-ice-400 transition-colors flex items-center gap-1"
          >
            HyperSwap <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>

      {/* Chain gate */}
      {!isHyperEVM && (
        <Card className="bg-amber-400/5 border-amber-400/20">
          <CardContent className="py-4 text-center text-amber-400 text-sm">
            Switch to HyperEVM (Chain ID: 999) to interact with these protocols.
          </CardContent>
        </Card>
      )}

      {/* Tabs — pill style */}
      <nav className="flex gap-1 rounded-lg bg-white/5 p-1 w-fit">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`rounded-md px-5 py-2 text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? "bg-white/10 text-white shadow-sm"
                : "text-text-secondary hover:text-white"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      {/* Tab content */}
      {activeTab === "lending" && <LendingTab isHyperEVM={isHyperEVM} />}
      {activeTab === "cdp" && <CdpTab />}
      {activeTab === "swap" && <SwapTab />}
    </div>
  );
}
