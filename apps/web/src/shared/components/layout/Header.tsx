"use client";

import { useConnection, useConnect, useDisconnect } from "wagmi";
import { useTokenBalance } from "@/shared/hooks/useTokenBalance";
import { shortenAddress, formatTokenAmount } from "@/shared/lib/utils";
import {
  LogOut,
  Wallet,
  Copy,
  Check,
  Menu,
} from "lucide-react";
import Image from "next/image";
import { useState, useCallback } from "react";
import { MobileNav } from "./MobileNav";

export function Header() {
  const { address, isConnected } = useConnection();
  const { connectors, connect } = useConnect();
  const { disconnect } = useDisconnect();
  const { data: balance } = useTokenBalance({ address });
  const [copied, setCopied] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

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

  return (
    <>
      <header className="sticky top-0 z-30 flex items-center justify-between h-14 px-4 lg:px-6 backdrop-blur-xl bg-[rgba(10,11,20,0.4)] border-b border-white/[0.06]">
        {/* Mobile: hamburger + logo */}
        <div className="flex items-center gap-3 lg:hidden">
          <button
            onClick={() => setMobileOpen(true)}
            className="p-1.5 rounded-lg hover:bg-bg-hover transition-colors"
          >
            <Menu className="w-5 h-5 text-text-secondary" />
          </button>
          <Image src="/snowball-logo.png" alt="Snowball" width={28} height={28} className="rounded-lg brightness-0 invert" />
        </div>

        {/* Desktop: breadcrumb area */}
        <div className="hidden lg:block" />

        {/* Right: Wallet area */}
        <div className="flex items-center gap-3">
          {/* Network badge */}
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-bg-card border border-border text-xs text-text-secondary">
            <div className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
            Testnet
          </div>

          {isConnected && address ? (
            <div className="flex items-center gap-2">
              {/* Balance */}
              {balance && (
                <span className="hidden sm:inline text-xs text-text-secondary font-mono">
                  {formatTokenAmount(balance.value, balance.decimals, 2)} {balance.symbol}
                </span>
              )}

              {/* Address chip */}
              <button
                onClick={copyAddress}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-bg-card border border-border hover:border-ice-400/30 transition-colors text-sm"
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
                className="p-1.5 rounded-lg hover:bg-bg-hover transition-colors text-text-tertiary hover:text-danger"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button onClick={handleConnect} className="btn-primary text-sm px-4 py-1.5">
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
