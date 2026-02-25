"use client";

import { usePrivy } from "@privy-io/react-auth";
import { useConnection, useBalance, useConnect, useDisconnect } from "wagmi";
import { shortenAddress, formatTokenAmount } from "@/lib/utils";
import {
  LogOut,
  Wallet,
  Copy,
  Check,
  Menu,
  Snowflake,
} from "lucide-react";
import { useState, useCallback } from "react";
import { MobileNav } from "./MobileNav";
import { useIsTestMode } from "@/components/providers";

function HeaderInner({
  authenticated,
  login,
  logout,
  displayName,
}: {
  authenticated: boolean;
  login: () => void;
  logout: () => void;
  displayName: string | null;
}) {
  const { address, isConnected } = useConnection();
  const { data: balance } = useBalance({ address });
  const [copied, setCopied] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const copyAddress = useCallback(() => {
    if (address) {
      navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [address]);

  const resolvedDisplayName =
    displayName ?? (address ? shortenAddress(address) : null);

  return (
    <>
      <header className="sticky top-0 z-30 flex items-center justify-between h-14 px-4 lg:px-6 bg-bg-secondary/80 backdrop-blur-md border-b border-border">
        {/* Mobile: hamburger + logo */}
        <div className="flex items-center gap-3 lg:hidden">
          <button
            onClick={() => setMobileOpen(true)}
            className="p-1.5 rounded-lg hover:bg-bg-hover transition-colors"
          >
            <Menu className="w-5 h-5 text-text-secondary" />
          </button>
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-ice-400 to-ice-600 flex items-center justify-center">
            <Snowflake className="w-3.5 h-3.5 text-white" />
          </div>
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

          {authenticated && isConnected ? (
            <div className="flex items-center gap-2">
              {/* Balance */}
              {balance && (
                <span className="hidden sm:inline text-xs text-text-secondary font-mono">
                  {formatTokenAmount(balance.value, 18, 2)} tCTC
                </span>
              )}

              {/* Address chip */}
              <button
                onClick={copyAddress}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-bg-card border border-border hover:border-ice-400/30 transition-colors text-sm"
              >
                <Wallet className="w-3.5 h-3.5 text-ice-400" />
                <span className="font-mono text-xs">{resolvedDisplayName}</span>
                {copied ? (
                  <Check className="w-3 h-3 text-success" />
                ) : (
                  <Copy className="w-3 h-3 text-text-tertiary" />
                )}
              </button>

              {/* Logout */}
              <button
                onClick={logout}
                className="p-1.5 rounded-lg hover:bg-bg-hover transition-colors text-text-tertiary hover:text-danger"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button onClick={login} className="btn-primary text-sm px-4 py-1.5">
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

function PrivyHeader() {
  const { login, logout, authenticated, user } = usePrivy();
  const displayName = user?.email?.address ?? user?.google?.email ?? null;
  return (
    <HeaderInner
      authenticated={authenticated}
      login={login}
      logout={logout}
      displayName={displayName}
    />
  );
}

function TestHeader() {
  const { isConnected } = useConnection();
  const { connectors, connect } = useConnect();
  const { disconnect } = useDisconnect();

  const login = () => {
    const connector = connectors[0];
    if (connector) connect({ connector });
  };

  return (
    <HeaderInner
      authenticated={isConnected}
      login={login}
      logout={() => disconnect()}
      displayName={null}
    />
  );
}

export function Header() {
  const isTestMode = useIsTestMode();
  return isTestMode ? <TestHeader /> : <PrivyHeader />;
}
