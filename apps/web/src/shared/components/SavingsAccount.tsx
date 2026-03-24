"use client";

import Link from "next/link";
import { useAccount } from "wagmi";
import { useYieldVaults } from "@/domains/defi/yield/hooks/useYieldVaults";
import { useYieldVaultAPY } from "@/domains/defi/yield/hooks/useYieldVaultAPY";
import { TOKEN_INFO } from "@/core/config/addresses";
import { formatUSD } from "@/shared/lib/utils";
import { PiggyBank, TrendingUp, ArrowRight, ShieldCheck, Shield, AlertTriangle } from "lucide-react";
import { formatTokenAmount } from "@/shared/lib/utils";
import type { Address } from "viem";

// ─── Risk level helpers ───

type RiskLevel = "Low" | "Medium" | "High";

function getRiskLevel(vaultName: string): RiskLevel {
  if (vaultName.toLowerCase().includes("stability") || vaultName.toLowerCase().includes("sbusd")) return "Low";
  if (vaultName.toLowerCase().includes("usdc")) return "Low";
  if (vaultName.toLowerCase().includes("wctc")) return "Medium";
  return "Medium";
}

function RiskBadge({ level }: { level: RiskLevel }) {
  const config = {
    Low: {
      label: "Low Risk",
      className: "bg-emerald-400/10 text-emerald-400 border-emerald-400/20",
      icon: <ShieldCheck className="w-3 h-3" />,
    },
    Medium: {
      label: "Med Risk",
      className: "bg-amber-400/10 text-amber-400 border-amber-400/20",
      icon: <Shield className="w-3 h-3" />,
    },
    High: {
      label: "High Risk",
      className: "bg-red-400/10 text-red-400 border-red-400/20",
      icon: <AlertTriangle className="w-3 h-3" />,
    },
  }[level];

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${config.className}`}
    >
      {config.icon}
      {config.label}
    </span>
  );
}

// ─── Inner component (needs address) ───

function SavingsAccountInner({ address }: { address: Address }) {
  const { vaults, isLoading } = useYieldVaults();
  const apyMap = useYieldVaultAPY();

  const activeVaults = vaults.filter((v) => !v.paused);

  // User's deposits
  const userDeposits = vaults.filter(
    (v) => v.userShares !== undefined && v.userShares > 0n,
  );

  const totalAnnualEarnings = userDeposits.reduce((sum, v) => {
    if (!v.userShares || !v.pricePerShare) return sum;
    const assets = (v.userShares * v.pricePerShare) / 10n ** 18n;
    const price = TOKEN_INFO[v.want]?.mockPriceUsd ?? 1;
    const depositUsd = (Number(assets) / 1e18) * price;
    const apyState = apyMap[v.address];
    const apy = apyState?.kind === "ready" ? apyState.value / 100 : 0;
    return sum + depositUsd * apy;
  }, 0);

  const totalDepositedUsd = userDeposits.reduce((sum, v) => {
    if (!v.userShares || !v.pricePerShare) return sum;
    const assets = (v.userShares * v.pricePerShare) / 10n ** 18n;
    const price = TOKEN_INFO[v.want]?.mockPriceUsd ?? 1;
    return sum + (Number(assets) / 1e18) * price;
  }, 0);

  return (
    <div className="w-full max-w-2xl rounded-2xl bg-bg-card/60 backdrop-blur-xl border border-border overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border/50">
        <div className="flex items-center gap-2.5">
          <PiggyBank className="w-5 h-5 text-emerald-400" />
          <div>
            <span className="font-semibold text-white">Savings Account</span>
            <p className="text-xs text-text-tertiary mt-0.5">
              Earn interest on your crypto, just like a bank account
            </p>
          </div>
        </div>
        <Link
          href="/yield"
          className="text-xs text-ice-400 hover:text-ice-300 flex items-center gap-1 shrink-0"
        >
          All vaults <ArrowRight className="w-3 h-3" />
        </Link>
      </div>

      {/* Vault cards */}
      <div className="px-6 py-4">
        {isLoading ? (
          <div className="grid grid-cols-2 gap-3">
            {[1, 2].map((i) => (
              <div key={i} className="h-28 rounded-xl bg-bg-hover animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {activeVaults.map((v) => {
              const apyState = apyMap[v.address];
              const apyLabel =
                !apyState || apyState.kind === "loading"
                  ? "..."
                  : apyState.kind === "ready"
                  ? `${apyState.value.toFixed(1)}% APY`
                  : apyState.kind === "variable"
                  ? "Variable APY"
                  : "—";

              const risk = getRiskLevel(v.name);

              return (
                <div
                  key={v.address}
                  className="flex flex-col gap-2.5 p-4 rounded-xl bg-bg-input/50 border border-border/50 hover:border-emerald-400/20 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-white text-sm">{v.wantSymbol}</p>
                      <p className="text-xs text-text-tertiary mt-0.5 leading-snug">{v.name}</p>
                    </div>
                    <RiskBadge level={risk} />
                  </div>

                  <div className="flex items-center gap-1.5">
                    <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-400 font-semibold text-sm">{apyLabel}</span>
                  </div>

                  <Link
                    href="/yield"
                    className="w-full text-center py-1.5 rounded-lg bg-emerald-400/10 hover:bg-emerald-400/20 text-emerald-400 text-xs font-medium transition-colors border border-emerald-400/20"
                  >
                    Deposit
                  </Link>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* User deposits section */}
      {userDeposits.length > 0 && (
        <div className="border-t border-border/50 px-6 py-4 space-y-3">
          <p className="text-xs font-medium text-text-secondary">Your Deposits</p>

          <div className="space-y-2">
            {userDeposits.map((v) => {
              const assets =
                v.userShares && v.pricePerShare
                  ? (v.userShares * v.pricePerShare) / 10n ** 18n
                  : 0n;
              const price = TOKEN_INFO[v.want]?.mockPriceUsd ?? 1;
              const depositUsd = (Number(assets) / 1e18) * price;

              const apyState = apyMap[v.address];
              const apy = apyState?.kind === "ready" ? apyState.value / 100 : 0;
              const annualEarnings = depositUsd * apy;

              return (
                <div key={v.address} className="flex items-center justify-between text-sm">
                  <div>
                    <span className="text-white font-medium">
                      {formatTokenAmount(assets, 18, 2)} {v.wantSymbol}
                    </span>
                    <span className="text-text-tertiary text-xs ml-1.5">{formatUSD(depositUsd)}</span>
                  </div>
                  {annualEarnings > 0 && (
                    <span className="text-emerald-400 text-xs font-medium">
                      +{formatUSD(annualEarnings)}/yr
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          {totalAnnualEarnings > 0 && (
            <div className="flex items-center justify-between pt-2 border-t border-border/30">
              <span className="text-xs text-text-secondary">Total Annual Interest</span>
              <span className="text-emerald-400 font-semibold text-sm">
                ~{formatUSD(totalAnnualEarnings)}/yr
              </span>
            </div>
          )}

          {totalDepositedUsd > 0 && (
            <div className="flex items-center justify-between text-xs text-text-tertiary">
              <span>Total deposited</span>
              <span>{formatUSD(totalDepositedUsd)}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main Export ───

export function SavingsAccount() {
  const { address, isConnected } = useAccount();

  if (!isConnected || !address) return null;

  return <SavingsAccountInner address={address} />;
}
