"use client";

import Link from "next/link";
import { useConnection } from "wagmi";
import { Card, CardContent } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { useUserPositions } from "@/domains/trade/hooks/useUserPositions";
import { LPPortfolioSummary } from "@/domains/trade/components/LPPortfolioSummary";
import { PositionCard } from "@/domains/trade/components/PositionCard";
import { Droplets, Plus, ArrowLeft } from "lucide-react";

export default function PositionsPage() {
  const { address, isConnected } = useConnection();
  const { positions, totalValueUsd, totalFeesUsd, positionCount, isLoading } =
    useUserPositions(address);

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 relative space-y-6">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-2xl h-[300px] bg-ice-400/5 rounded-[100%] blur-[100px] pointer-events-none -z-10" />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/pool"
            className="p-2 rounded-lg hover:bg-bg-hover transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-text-secondary" />
          </Link>
          <h1 className="text-2xl font-bold flex items-center gap-2 text-white">
            <Droplets className="w-6 h-6 text-ice-400" />
            My LP Positions
          </h1>
        </div>
        <Button asChild className="bg-white text-black hover:bg-gray-200">
          <Link href="/pool/add">
            <Plus className="w-4 h-4 mr-1" />
            New Position
          </Link>
        </Button>
      </div>

      {!isConnected ? (
        <Card>
          <CardContent className="py-12 text-center text-text-secondary">
            Connect your wallet to view positions
          </CardContent>
        </Card>
      ) : isLoading ? (
        <Card>
          <CardContent className="py-12 text-center text-text-secondary">
            Loading positions...
          </CardContent>
        </Card>
      ) : positions.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center space-y-4">
            <p className="text-text-secondary">No active positions</p>
            <Button asChild variant="secondary">
              <Link href="/pool/add">
                <Plus className="w-4 h-4 mr-1" />
                New Position
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Portfolio Summary */}
          <LPPortfolioSummary
            totalValueUsd={totalValueUsd}
            positionCount={positions.length}
            totalFeesUsd={totalFeesUsd}
            isLoading={isLoading}
          />

          {/* Overflow notice */}
          {positionCount > 20 && (
            <p className="text-sm text-text-tertiary text-center">
              Showing up to 20 of {positionCount} positions
            </p>
          )}

          {/* Position cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {positions.map((p) => (
              <PositionCard key={String(p.tokenId)} position={p} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
