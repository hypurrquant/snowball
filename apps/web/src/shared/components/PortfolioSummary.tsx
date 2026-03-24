"use client";

import { useConnection, useReadContracts } from "wagmi";
import { erc20Abi } from "viem";
import Link from "next/link";
import {
  Wallet,
  HandCoins,
  Landmark,
  LayoutGrid,
  TrendingUp,
  ExternalLink,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/shared/components/ui/card";
import { StatCard } from "@/shared/components/common/StatCard";
import { useTroves } from "@/domains/defi/liquity/hooks/useTroves";
import { useMorphoPosition } from "@/domains/defi/morpho/hooks/useMorphoPosition";
import { useUserPositions } from "@/domains/trade/hooks/useUserPositions";
import { useYieldVaults } from "@/domains/defi/yield/hooks/useYieldVaults";
import { TOKENS, TOKEN_INFO, LEND } from "@/core/config/addresses";
import { formatTokenAmount, formatUSD } from "@/shared/lib/utils";
import type { Address } from "viem";

// ─── Wallet Balances Card ───

function WalletCard({ address }: { address: Address }) {
  const { data: balances, isLoading } = useReadContracts({
    contracts: [
      { address: TOKENS.wCTC, abi: erc20Abi, functionName: "balanceOf", args: [address] },
      { address: TOKENS.lstCTC, abi: erc20Abi, functionName: "balanceOf", args: [address] },
      { address: TOKENS.sbUSD, abi: erc20Abi, functionName: "balanceOf", args: [address] },
      { address: TOKENS.USDC, abi: erc20Abi, functionName: "balanceOf", args: [address] },
    ],
    query: { enabled: !!address },
  });

  const tokens = [
    { key: TOKENS.wCTC, label: "wCTC" },
    { key: TOKENS.lstCTC, label: "lstCTC" },
    { key: TOKENS.sbUSD, label: "sbUSD" },
    { key: TOKENS.USDC, label: "USDC" },
  ] as const;

  const totalUsd = balances
    ? tokens.reduce((sum, t, i) => {
        const raw = balances[i]?.status === "success" ? (balances[i].result as bigint) : 0n;
        const price = TOKEN_INFO[t.key]?.mockPriceUsd ?? 0;
        return sum + (Number(raw) / 1e18) * price;
      }, 0)
    : 0;

  return (
    <Card className="bg-bg-card/60 backdrop-blur-xl border-white/5">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium text-text-secondary flex items-center gap-2">
          <Wallet className="w-4 h-4 text-ice-400" />
          Wallet Balances
        </CardTitle>
        <div className="text-xl font-bold text-white">{formatUSD(totalUsd)}</div>
      </CardHeader>
      <CardContent className="space-y-2">
        {isLoading
          ? tokens.map((t) => (
              <div key={t.label} className="h-5 rounded bg-bg-hover animate-pulse" />
            ))
          : tokens.map((t, i) => {
              const raw = balances?.[i]?.status === "success" ? (balances[i].result as bigint) : 0n;
              const price = TOKEN_INFO[t.key]?.mockPriceUsd ?? 0;
              const usd = (Number(raw) / 1e18) * price;
              return (
                <div key={t.label} className="flex items-center justify-between text-sm">
                  <span className="text-text-secondary">{t.label}</span>
                  <span className="text-white font-medium">
                    {formatTokenAmount(raw, 18, 4)}
                    <span className="text-text-tertiary ml-1 text-xs">{formatUSD(usd)}</span>
                  </span>
                </div>
              );
            })}
      </CardContent>
    </Card>
  );
}

// ─── Liquity CDPs Card ───

function LiquityCDPCard({ address }: { address: Address }) {
  const { troves: wCTCTroves, isLoading: wCTCLoading } = useTroves("wCTC", address);
  const { troves: lstCTCTroves, isLoading: lstCTCLoading } = useTroves("lstCTC", address);

  const allTroves = [...wCTCTroves, ...lstCTCTroves];
  const isLoading = wCTCLoading || lstCTCLoading;

  const totalColl = allTroves.reduce((s, t) => s + t.coll, 0n);
  const totalDebt = allTroves.reduce((s, t) => s + t.debt, 0n);

  // wCTC price $5, lstCTC price $5.20 — use mock prices for CR colouring
  const totalCollUsd =
    wCTCTroves.reduce((s, t) => s + (Number(t.coll) / 1e18) * 5, 0) +
    lstCTCTroves.reduce((s, t) => s + (Number(t.coll) / 1e18) * 5.2, 0);
  const totalDebtUsd = Number(totalDebt) / 1e18; // sbUSD = $1
  const avgCR = totalDebtUsd > 0 ? (totalCollUsd / totalDebtUsd) * 100 : 0;

  const crColor =
    avgCR === 0 ? "text-text-secondary" :
    avgCR >= 200 ? "text-emerald-400" :
    avgCR >= 150 ? "text-amber-400" : "text-red-400";

  return (
    <Card className="bg-bg-card/60 backdrop-blur-xl border-white/5">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-text-secondary flex items-center gap-2">
            <HandCoins className="w-4 h-4 text-amber-400" />
            Liquity CDPs
          </CardTitle>
          <Link
            href="/liquity/borrow"
            className="text-xs text-ice-400 hover:text-ice-300 flex items-center gap-1"
          >
            View <ExternalLink className="w-3 h-3" />
          </Link>
        </div>
        <div className="text-xl font-bold text-white">
          {isLoading ? "—" : `${allTroves.length} Trove${allTroves.length !== 1 ? "s" : ""}`}
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {isLoading ? (
          <>
            <div className="h-5 rounded bg-bg-hover animate-pulse" />
            <div className="h-5 rounded bg-bg-hover animate-pulse" />
          </>
        ) : allTroves.length === 0 ? (
          <p className="text-xs text-text-tertiary">No open troves</p>
        ) : (
          <>
            <div className="flex items-center justify-between text-sm">
              <span className="text-text-secondary">Total Collateral</span>
              <span className="text-white font-medium">{formatTokenAmount(totalColl, 18, 2)}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-text-secondary">Total Debt</span>
              <span className="text-white font-medium">{formatTokenAmount(totalDebt, 18, 2)} sbUSD</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-text-secondary">Avg CR</span>
              <span className={`font-medium ${crColor}`}>
                {avgCR > 0 ? `${avgCR.toFixed(1)}%` : "—"}
              </span>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Morpho Lending Card ───

function MorphoCard({ address }: { address: Address }) {
  // Show positions across all 3 markets
  const market0 = LEND.markets[0];
  const market1 = LEND.markets[1];
  const market2 = LEND.markets[2];

  const { position: pos0, isLoading: l0 } = useMorphoPosition(market0.id, address);
  const { position: pos1, isLoading: l1 } = useMorphoPosition(market1.id, address);
  const { position: pos2, isLoading: l2 } = useMorphoPosition(market2.id, address);

  const isLoading = l0 || l1 || l2;

  const positions = [
    { market: market0, pos: pos0 },
    { market: market1, pos: pos1 },
    { market: market2, pos: pos2 },
  ];

  const totalSupply = positions.reduce(
    (s, { pos }) => s + (pos?.supplyAssets ?? 0n),
    0n,
  );
  const totalBorrow = positions.reduce(
    (s, { pos }) => s + (pos?.borrowAssets ?? 0n),
    0n,
  );

  const activePositions = positions.filter(
    ({ pos }) => pos && (pos.supplyAssets > 0n || pos.borrowAssets > 0n || pos.collateral > 0n),
  );

  const minHF = activePositions.reduce(
    (min, { pos }) =>
      pos && pos.healthFactor > 0 ? Math.min(min, pos.healthFactor) : min,
    Infinity,
  );
  const hf = isFinite(minHF) ? minHF : null;
  const hfColor =
    hf === null ? "text-text-secondary" :
    hf >= 2 ? "text-emerald-400" :
    hf >= 1.2 ? "text-amber-400" : "text-red-400";

  return (
    <Card className="bg-bg-card/60 backdrop-blur-xl border-white/5">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-text-secondary flex items-center gap-2">
            <Landmark className="w-4 h-4 text-emerald-400" />
            Morpho Lending
          </CardTitle>
          <Link
            href="/morpho/supply"
            className="text-xs text-ice-400 hover:text-ice-300 flex items-center gap-1"
          >
            View <ExternalLink className="w-3 h-3" />
          </Link>
        </div>
        <div className="text-xl font-bold text-white">
          {isLoading ? "—" : formatUSD(Number(totalSupply) / 1e18)}
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {isLoading ? (
          <>
            <div className="h-5 rounded bg-bg-hover animate-pulse" />
            <div className="h-5 rounded bg-bg-hover animate-pulse" />
          </>
        ) : (
          <>
            <div className="flex items-center justify-between text-sm">
              <span className="text-text-secondary">Supplied</span>
              <span className="text-white font-medium">{formatTokenAmount(totalSupply, 18, 2)} sbUSD</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-text-secondary">Borrowed</span>
              <span className="text-white font-medium">{formatTokenAmount(totalBorrow, 18, 2)} sbUSD</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-text-secondary">Health Factor</span>
              <span className={`font-medium ${hfColor}`}>
                {hf !== null ? hf.toFixed(2) : "—"}
              </span>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

// ─── LP Positions Card ───

function LPPositionsCard({ address }: { address: Address }) {
  const { positions, positionCount, totalValueUsd, isLoading } = useUserPositions(address);

  return (
    <Card className="bg-bg-card/60 backdrop-blur-xl border-white/5">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-text-secondary flex items-center gap-2">
            <LayoutGrid className="w-4 h-4 text-violet-400" />
            LP Positions
          </CardTitle>
          <Link
            href="/pool/positions"
            className="text-xs text-ice-400 hover:text-ice-300 flex items-center gap-1"
          >
            View <ExternalLink className="w-3 h-3" />
          </Link>
        </div>
        <div className="text-xl font-bold text-white">
          {isLoading ? "—" : formatUSD(totalValueUsd)}
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {isLoading ? (
          <>
            <div className="h-5 rounded bg-bg-hover animate-pulse" />
            <div className="h-5 rounded bg-bg-hover animate-pulse" />
          </>
        ) : (
          <>
            <div className="flex items-center justify-between text-sm">
              <span className="text-text-secondary">LP NFTs</span>
              <span className="text-white font-medium">{positionCount}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-text-secondary">Active Positions</span>
              <span className="text-white font-medium">{positions.length}</span>
            </div>
            {positions.length > 0 && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-text-secondary">In-Range</span>
                <span className="text-emerald-400 font-medium">
                  {positions.filter((p) => p.isInRange).length} / {positions.length}
                </span>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Yield Vaults Card ───

function YieldVaultsCard() {
  const { vaults, isLoading } = useYieldVaults();

  const activeVaults = vaults.filter(
    (v) => v.userShares !== undefined && v.userShares > 0n,
  );

  const totalDepositedUsd = activeVaults.reduce((sum, v) => {
    if (!v.userShares || !v.pricePerShare) return sum;
    const assets = (v.userShares * v.pricePerShare) / 10n ** 18n;
    const price = TOKEN_INFO[v.want]?.mockPriceUsd ?? 1;
    return sum + (Number(assets) / 1e18) * price;
  }, 0);

  return (
    <Card className="bg-bg-card/60 backdrop-blur-xl border-white/5">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-text-secondary flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-rose-400" />
            Yield Vaults
          </CardTitle>
          <Link
            href="/yield"
            className="text-xs text-ice-400 hover:text-ice-300 flex items-center gap-1"
          >
            View <ExternalLink className="w-3 h-3" />
          </Link>
        </div>
        <div className="text-xl font-bold text-white">
          {isLoading ? "—" : formatUSD(totalDepositedUsd)}
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {isLoading ? (
          <>
            <div className="h-5 rounded bg-bg-hover animate-pulse" />
            <div className="h-5 rounded bg-bg-hover animate-pulse" />
          </>
        ) : activeVaults.length === 0 ? (
          <p className="text-xs text-text-tertiary">No vault deposits</p>
        ) : (
          activeVaults.map((v) => {
            const assets =
              v.userShares && v.pricePerShare
                ? (v.userShares * v.pricePerShare) / 10n ** 18n
                : 0n;
            return (
              <div key={v.address} className="flex items-center justify-between text-sm">
                <span className="text-text-secondary">{v.name}</span>
                <span className="text-white font-medium">
                  {formatTokenAmount(assets, 18, 4)} {v.wantSymbol}
                </span>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}

// ─── Total Portfolio Value Banner ───

function TotalValueBanner({
  address,
}: {
  address: Address;
}) {
  const { data: walletBalances } = useReadContracts({
    contracts: [
      { address: TOKENS.wCTC, abi: erc20Abi, functionName: "balanceOf", args: [address] },
      { address: TOKENS.lstCTC, abi: erc20Abi, functionName: "balanceOf", args: [address] },
      { address: TOKENS.sbUSD, abi: erc20Abi, functionName: "balanceOf", args: [address] },
      { address: TOKENS.USDC, abi: erc20Abi, functionName: "balanceOf", args: [address] },
    ],
    query: { enabled: !!address },
  });

  const { totalValueUsd: lpValueUsd } = useUserPositions(address);
  const { vaults } = useYieldVaults();

  const walletUsd = walletBalances
    ? [TOKENS.wCTC, TOKENS.lstCTC, TOKENS.sbUSD, TOKENS.USDC].reduce(
        (sum, token, i) => {
          const raw =
            walletBalances[i]?.status === "success"
              ? (walletBalances[i].result as bigint)
              : 0n;
          return sum + (Number(raw) / 1e18) * (TOKEN_INFO[token]?.mockPriceUsd ?? 0);
        },
        0,
      )
    : 0;

  const vaultUsd = vaults.reduce((sum, v) => {
    if (!v.userShares || !v.pricePerShare) return sum;
    const assets = (v.userShares * v.pricePerShare) / 10n ** 18n;
    return sum + (Number(assets) / 1e18) * (TOKEN_INFO[v.want]?.mockPriceUsd ?? 1);
  }, 0);

  const totalUsd = walletUsd + lpValueUsd + vaultUsd;

  return (
    <div className="card bg-gradient-to-r from-ice-400/10 to-violet-500/10 border-ice-400/20">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-text-tertiary uppercase tracking-wider font-medium mb-1">
            Total Portfolio Value
          </p>
          <p className="text-3xl font-bold text-white">{formatUSD(totalUsd)}</p>
          <p className="text-xs text-text-secondary mt-1">
            Wallet · LP · Vaults (excl. Liquity / Morpho on-chain debt)
          </p>
        </div>
        <div className="text-ice-400 opacity-60">
          <Wallet className="w-10 h-10" />
        </div>
      </div>
    </div>
  );
}

// ─── Main Export ───

export function PortfolioSummary({ address }: { address: Address }) {
  return (
    <div className="space-y-6">
      <TotalValueBanner address={address} />

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        <WalletCard address={address} />
        <LiquityCDPCard address={address} />
        <MorphoCard address={address} />
        <LPPositionsCard address={address} />
        <YieldVaultsCard />
      </div>
    </div>
  );
}
