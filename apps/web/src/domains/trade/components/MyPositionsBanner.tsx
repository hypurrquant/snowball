"use client";

import Link from "next/link";
import { useConnection, useReadContract } from "wagmi";
import { NonfungiblePositionManagerABI } from "@/core/abis";
import { DEX } from "@/core/config/addresses";
import { ArrowRight, Droplets } from "lucide-react";

export function MyPositionsBanner() {
  const { address, isConnected } = useConnection();

  const { data: rawBalance } = useReadContract({
    address: DEX.nonfungiblePositionManager,
    abi: NonfungiblePositionManagerABI,
    functionName: "balanceOf",
    args: [address!],
    query: { enabled: !!address && isConnected },
  });

  const count = rawBalance ? Number(rawBalance) : 0;

  if (!isConnected || count === 0) return null;

  return (
    <Link
      href="/pool/positions"
      className="flex items-center justify-between px-4 py-3 rounded-xl bg-ice-500/10 border border-ice-400/20 hover:border-ice-400/40 transition-all group"
    >
      <div className="flex items-center gap-2 text-sm text-ice-400">
        <Droplets className="w-4 h-4" />
        <span>
          You have <strong>{count}</strong> active LP position
          {count !== 1 ? "s" : ""}
        </span>
      </div>
      <div className="flex items-center gap-1 text-sm text-ice-400 group-hover:translate-x-0.5 transition-transform">
        <span>View All</span>
        <ArrowRight className="w-4 h-4" />
      </div>
    </Link>
  );
}
