"use client";

import { useConnection, useConnect, useDisconnect, useAccount, useSwitchChain } from "wagmi";
import { useTokenBalance } from "@/shared/hooks/useTokenBalance";
import { shortenAddress, formatTokenAmount } from "@/shared/lib/utils";
import {
  LogOut,
  Wallet,
  Copy,
  Check,
  Menu,
  ChevronDown,
} from "lucide-react";
import Image from "next/image";
import { useState, useCallback, useEffect, useRef } from "react";
import { MobileNav } from "./MobileNav";
import { GasSponsorBadge } from "@/shared/components/GasSponsorBadge";
import { creditcoinTestnet, giwaSepoliaChain, hyperEvmMainnet } from "@/core/config/chain";

const SUPPORTED_CHAINS = [
  { id: creditcoinTestnet.id, name: "Creditcoin Testnet", dotClass: "bg-success" },
  { id: giwaSepoliaChain.id, name: "GIWA Sepolia", dotClass: "bg-blue-400" },
  { id: hyperEvmMainnet.id, name: "HyperEVM", dotClass: "bg-orange-400" },
];

export function Header() {
  const { address, isConnected } = useConnection();
  const { chain: currentChain } = useAccount();
  const { connectors, connect } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChain } = useSwitchChain();
  const { data: balance } = useTokenBalance({ address });
  const [copied, setCopied] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [chainOpen, setChainOpen] = useState(false);
  const chainRef = useRef<HTMLDivElement>(null);

  const activeChain = SUPPORTED_CHAINS.find((c) => c.id === currentChain?.id) ?? SUPPORTED_CHAINS[0];

  const handleConnect = () => {
    const connector = connectors[0];
    if (connector) connect({ connector });
  };

  const copyAddress = useCallback(() => {
    if (address) {
      navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [address]);

  // Close chain dropdown on outside tap/click
  useEffect(() => {
    if (!chainOpen) return;
    const handler = (e: MouseEvent | TouchEvent) => {
      if (chainRef.current && !chainRef.current.contains(e.target as Node)) {
        setChainOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    document.addEventListener("touchstart", handler);
    return () => {
      document.removeEventListener("mousedown", handler);
      document.removeEventListener("touchstart", handler);
    };
  }, [chainOpen]);

  return (
    <>
      <header className="sticky top-0 z-30 flex items-center justify-between h-14 px-4 lg:px-6 backdrop-blur-xl bg-[rgba(10,11,20,0.4)] border-b border-white/[0.06]">
        {/* Mobile: hamburger + logo */}
        <div className="flex items-center gap-3 lg:hidden">
          <button
            onClick={() => setMobileOpen(true)}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg hover:bg-bg-hover transition-colors"
          >
            <Menu className="w-5 h-5 text-text-secondary" />
          </button>
          <Image src="/snowball-logo.png" alt="Snowball" width={28} height={28} className="rounded-lg brightness-0 invert" />
        </div>

        {/* Desktop: breadcrumb area */}
        <div className="hidden lg:block" />

        {/* Right: Wallet area */}
        <div className="flex items-center gap-3">
          {/* Chain selector */}
          <div className="relative hidden sm:block" ref={chainRef}>
            <button
              onClick={() => setChainOpen((o) => !o)}
              className="flex items-center gap-1.5 px-2.5 py-1 min-h-[36px] rounded-lg bg-bg-card border border-border text-xs text-text-secondary hover:border-ice-400/30 transition-colors"
            >
              <div className={`w-1.5 h-1.5 rounded-full ${activeChain.dotClass} animate-pulse`} />
              {activeChain.name}
              <ChevronDown className="w-3 h-3" />
            </button>
            {chainOpen && (
              <div className="absolute right-0 mt-1 w-44 rounded-lg bg-bg-card border border-border shadow-lg z-50 overflow-hidden">
                {SUPPORTED_CHAINS.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => {
                      switchChain({ chainId: c.id });
                      setChainOpen(false);
                    }}
                    className={`w-full flex items-center gap-2 px-3 min-h-[44px] text-xs text-left hover:bg-bg-hover transition-colors ${
                      c.id === activeChain.id ? "text-text-primary" : "text-text-secondary"
                    }`}
                  >
                    <div className={`w-1.5 h-1.5 rounded-full ${c.dotClass}`} />
                    {c.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          <GasSponsorBadge />

          {isConnected && address ? (
            <div className="flex items-center gap-2">
              {/* Balance */}
              {balance && (
                <span className="hidden sm:inline text-xs text-text-secondary font-mono">
                  {formatTokenAmount(balance.value, balance.decimals, 2)} {balance.symbol}
                </span>
              )}

              {/* Address chip — min-h-[44px] on mobile for touch target */}
              <button
                onClick={copyAddress}
                className="flex items-center gap-1.5 px-3 py-1.5 min-h-[44px] md:min-h-0 rounded-lg bg-bg-card border border-border hover:border-ice-400/30 transition-colors text-sm"
              >
                <Wallet className="w-3.5 h-3.5 text-ice-400" />
                <span className="font-mono text-xs">{shortenAddress(address)}</span>
                {copied ? (
                  <Check className="w-3 h-3 text-success" />
                ) : (
                  <Copy className="w-3 h-3 text-text-tertiary" />
                )}
              </button>

              {/* Disconnect */}
              <button
                onClick={() => disconnect()}
                className="min-h-[44px] min-w-[44px] md:min-h-0 md:min-w-0 p-1.5 flex items-center justify-center rounded-lg hover:bg-bg-hover transition-colors text-text-tertiary hover:text-danger"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button onClick={handleConnect} className="btn-primary text-sm px-4 py-1.5 min-h-[44px] md:min-h-0">
              Connect
            </button>
          )}
        </div>
      </header>

      {/* Mobile nav overlay */}
      <MobileNav open={mobileOpen} onClose={() => setMobileOpen(false)} />
    </>
  );
}
