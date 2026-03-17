"use client";

import { useState } from "react";
import { useAccount } from "wagmi";
import { GitBranch, Wallet } from "lucide-react";
import type { Address } from "viem";
import { Card, CardContent } from "@/shared/components/ui/card";
import { useStrategyRoutes } from "@/domains/defi/strategy/hooks/useStrategyRoutes";
import { AssetSelector } from "@/domains/defi/strategy/components/AssetSelector";
import { StrategyCard, StrategyCardSkeleton } from "@/domains/defi/strategy/components/StrategyCard";
import { StrategyExecutor } from "@/domains/defi/strategy/components/StrategyExecutor";
import type { YieldPath } from "@/domains/defi/strategy/types";

export default function StrategyRouterPage() {
  const { isConnected } = useAccount();

  const [selectedAsset, setSelectedAsset] = useState<Address | undefined>(undefined);
  const [amount, setAmount] = useState<bigint>(0n);
  const [selectedPath, setSelectedPath] = useState<YieldPath | null>(null);

  const { paths, isLoading } = useStrategyRoutes(selectedAsset, amount);

  const handleSelect = (asset: Address, amt: bigint) => {
    setSelectedAsset(asset);
    setAmount(amt);
  };

  const handleExecute = (path: YieldPath) => {
    setSelectedPath(path);
  };

  const handleExecutorClose = () => {
    setSelectedPath(null);
  };

  const showSkeletons = isLoading && !!selectedAsset && amount > 0n;
  const showEmpty = !isLoading && !!selectedAsset && amount > 0n && paths.length === 0;
  const showPrompt = !selectedAsset || amount === 0n;

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 relative space-y-6">
      {/* Background glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-2xl h-[300px] bg-ice-400/5 rounded-[100%] blur-[100px] pointer-events-none -z-10" />

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2 text-white">
          <GitBranch className="w-6 h-6 text-ice-400" />
          Strategy Router
        </h1>
        <p className="text-text-secondary mt-1 text-sm">
          Select an asset and amount to discover the best yield paths across all Snowball protocols
        </p>
      </div>

      {/* Wallet not connected */}
      {!isConnected && (
        <Card className="bg-bg-card/60 border-border">
          <CardContent className="p-6 flex items-center gap-3 text-text-secondary">
            <Wallet className="w-5 h-5 text-ice-400 shrink-0" />
            <span className="text-sm">Connect your wallet to see available strategies and execute transactions.</span>
          </CardContent>
        </Card>
      )}

      {/* Asset selector */}
      <AssetSelector
        selectedAsset={selectedAsset}
        amount={amount}
        onSelect={handleSelect}
      />

      {/* Stats bar — only when paths exist */}
      {paths.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <Card className="bg-bg-card/60 border-border">
            <CardContent className="p-4">
              <div className="text-xs text-text-secondary mb-1">Available Paths</div>
              <div className="text-xl font-bold text-white">{paths.length}</div>
            </CardContent>
          </Card>
          <Card className="bg-bg-card/60 border-border">
            <CardContent className="p-4">
              <div className="text-xs text-text-secondary mb-1">Best APY</div>
              <div className="text-xl font-bold text-success font-mono">
                {paths[0].estimatedAPY !== null ? paths[0].apyLabel : "Variable"}
              </div>
            </CardContent>
          </Card>
          <Card className="bg-bg-card/60 border-border col-span-2 sm:col-span-1">
            <CardContent className="p-4">
              <div className="text-xs text-text-secondary mb-1">Multi-hop paths</div>
              <div className="text-xl font-bold text-white">
                {paths.filter((p) => p.isMultiHop).length}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Section label */}
      {(showSkeletons || paths.length > 0) && (
        <div className="text-xs text-text-secondary font-medium uppercase tracking-wide">
          Recommended paths — sorted by APY
        </div>
      )}

      {/* Path cards */}
      <div className="space-y-3">
        {showSkeletons ? (
          <>
            <StrategyCardSkeleton />
            <StrategyCardSkeleton />
            <StrategyCardSkeleton />
          </>
        ) : showPrompt ? (
          <div className="bg-bg-card/60 border border-border rounded-2xl p-10 text-center">
            <GitBranch className="w-8 h-8 text-ice-400/40 mx-auto mb-3" />
            <p className="text-text-secondary text-sm">
              Select an asset and enter an amount above to find yield paths.
            </p>
          </div>
        ) : showEmpty ? (
          <div className="bg-bg-card/60 border border-border rounded-2xl p-10 text-center">
            <p className="text-text-secondary text-sm">
              No eligible paths found for the selected asset. Try wCTC, lstCTC, sbUSD, or USDC.
            </p>
          </div>
        ) : (
          paths.map((path, i) => (
            <StrategyCard
              key={path.id}
              path={path}
              rank={i + 1}
              onExecute={handleExecute}
            />
          ))
        )}
      </div>

      {/* Lazy executor — mounts only when a path is selected */}
      {selectedPath !== null && (
        <StrategyExecutor
          path={selectedPath}
          amount={amount}
          onClose={handleExecutorClose}
        />
      )}
    </div>
  );
}
