"use client";

import { useState } from "react";
import { useAccount } from "wagmi";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/shared/components/ui/card";
import { Badge } from "@/shared/components/ui/badge";
import {
  Gem,
  Landmark,
  ArrowDownUp,
  ExternalLink,
} from "lucide-react";
import { monadTestnet } from "@/core/config/chain";
import { EULER, KURU, AMBIENT } from "@/core/config/monad";

// ─── Constants ────────────────────────────────────────────────────────────────

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

const isDeployed = (addr: string) => addr !== ZERO_ADDRESS;

// ─── Tab types ────────────────────────────────────────────────────────────────

type Tab = "lending" | "swap";

// ─── Lending tab ──────────────────────────────────────────────────────────────

function LendingTab() {
  const eulerDeployed = isDeployed(EULER.pool);

  return (
    <Card className="bg-bg-card/60 backdrop-blur-xl border-white/5">
      <CardHeader>
        <CardTitle className="text-base text-white flex items-center gap-2">
          <Landmark className="w-4 h-4 text-purple-400" />
          Euler Lending
          <Badge variant="outline" className="ml-auto text-xs">
            Euler V2
          </Badge>
          <a
            href="https://www.euler.finance"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-xs text-text-secondary hover:text-purple-400 transition-colors"
          >
            <ExternalLink className="w-3 h-3" />
          </a>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {eulerDeployed ? (
          <p className="text-sm text-text-secondary">Euler markets loading…</p>
        ) : (
          <div className="rounded-lg bg-purple-400/5 border border-purple-400/20 p-4 text-center">
            <p className="text-purple-400 text-sm font-medium">Coming Soon</p>
            <p className="text-text-secondary text-xs mt-1">
              Euler integration planned — contract addresses being verified on
              Monad mainnet.
            </p>
            <a
              href="https://www.euler.finance"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 mt-3 text-sm text-purple-400 hover:text-purple-300 transition-colors"
            >
              Visit Euler App <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Swap tab ─────────────────────────────────────────────────────────────────

function SwapTab() {
  const kuruDeployed = isDeployed(KURU.router);
  const ambientDeployed = isDeployed(AMBIENT.crocSwapDex);

  return (
    <div className="space-y-4">
      {/* Kuru */}
      <Card className="bg-bg-card/60 backdrop-blur-xl border-white/5">
        <CardHeader>
          <CardTitle className="text-base text-white flex items-center gap-2">
            <ArrowDownUp className="w-4 h-4 text-purple-400" />
            Kuru Exchange
            <Badge variant="outline" className="ml-auto text-xs">
              Order Book DEX
            </Badge>
            <a
              href="https://www.kuru.io"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs text-text-secondary hover:text-purple-400 transition-colors"
            >
              <ExternalLink className="w-3 h-3" />
            </a>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {kuruDeployed ? (
            <p className="text-sm text-text-secondary">Kuru swap loading…</p>
          ) : (
            <div className="rounded-lg bg-purple-400/5 border border-purple-400/20 p-4 text-center">
              <p className="text-purple-400 text-sm font-medium">Coming Soon</p>
              <p className="text-text-secondary text-xs mt-1">
                Kuru Exchange integration planned for Monad.
              </p>
              <a
                href="https://www.kuru.io"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 mt-3 text-sm text-purple-400 hover:text-purple-300 transition-colors"
              >
                Visit Kuru Exchange <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Ambient */}
      <Card className="bg-bg-card/60 backdrop-blur-xl border-white/5">
        <CardHeader>
          <CardTitle className="text-base text-white flex items-center gap-2">
            <ArrowDownUp className="w-4 h-4 text-pink-400" />
            Ambient
            <Badge variant="outline" className="ml-auto text-xs">
              AMM DEX
            </Badge>
            <a
              href="https://ambient.finance"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs text-text-secondary hover:text-pink-400 transition-colors"
            >
              <ExternalLink className="w-3 h-3" />
            </a>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {ambientDeployed ? (
            <p className="text-sm text-text-secondary">Ambient swap loading…</p>
          ) : (
            <div className="rounded-lg bg-pink-400/5 border border-pink-400/20 p-4 text-center">
              <p className="text-pink-400 text-sm font-medium">Coming Soon</p>
              <p className="text-text-secondary text-xs mt-1">
                Ambient integration planned for Monad.
              </p>
              <a
                href="https://ambient.finance"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 mt-3 text-sm text-pink-400 hover:text-pink-300 transition-colors"
              >
                Visit Ambient <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function MonadPage() {
  const [activeTab, setActiveTab] = useState<Tab>("lending");
  const { chain } = useAccount();
  const isMonad = chain?.id === monadTestnet.id;

  const tabs: { id: Tab; label: string }[] = [
    { id: "lending", label: "Lending" },
    { id: "swap", label: "Swap" },
  ];

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Gem className="w-6 h-6 text-purple-400" />
            Monad DeFi Hub
          </h1>
          <Badge className="bg-purple-400/10 text-purple-400 border-purple-400/20">
            10,000 TPS
          </Badge>
          <Badge className="bg-pink-400/10 text-pink-400 border-pink-400/20 hidden sm:inline-flex">
            Sub-second finality
          </Badge>
        </div>
        <div className="flex gap-3 text-sm text-text-secondary">
          <a
            href="https://www.kuru.io"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-purple-400 transition-colors flex items-center gap-1"
          >
            Kuru Exchange <ExternalLink className="w-3 h-3" />
          </a>
          <span>·</span>
          <a
            href="https://www.euler.finance"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-purple-400 transition-colors flex items-center gap-1"
          >
            Euler <ExternalLink className="w-3 h-3" />
          </a>
          <span>·</span>
          <a
            href="https://ambient.finance"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-purple-400 transition-colors flex items-center gap-1"
          >
            Ambient <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>

      {/* Chain gate */}
      {!isMonad && (
        <Card className="bg-purple-400/5 border-purple-400/20">
          <CardContent className="py-4 text-center text-purple-400 text-sm">
            Switch to Monad Testnet (Chain ID: {monadTestnet.id}) to interact
            with these protocols.
          </CardContent>
        </Card>
      )}

      {/* Protocol addresses notice */}
      <Card className="bg-white/[0.02] border-white/5">
        <CardContent className="py-3 text-center text-text-secondary text-xs">
          Protocol addresses are being verified on Monad mainnet. Testnet
          support coming soon.
        </CardContent>
      </Card>

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
      {activeTab === "lending" && <LendingTab />}
      {activeTab === "swap" && <SwapTab />}
    </div>
  );
}
