"use client";

import { useSmartAccount } from "@/shared/hooks/useSmartAccount";
import { Fuel, Shield } from "lucide-react";
import Link from "next/link";

export function GasSponsorBadge() {
  const { gasSponsorAvailable, hasSmartAccount, isFactoryDeployed } = useSmartAccount();

  // Paymaster not on this chain
  if (!gasSponsorAvailable) return null;

  // Smart Account active → show Gas Free
  if (hasSmartAccount) {
    return (
      <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-green-500/10 border border-green-500/20 text-xs text-green-400">
        <Fuel className="w-3 h-3" />
        Gas Free
      </div>
    );
  }

  // Paymaster available but no Smart Account → prompt to create
  if (isFactoryDeployed) {
    return (
      <Link href="/dashboard" className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-yellow-500/10 border border-yellow-500/20 text-xs text-yellow-400 hover:bg-yellow-500/20 transition-colors">
        <Shield className="w-3 h-3" />
        Setup Gas Free
      </Link>
    );
  }

  return null;
}
