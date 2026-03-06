"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAccount } from "wagmi";
import { isAddress } from "viem";
import { Card, CardHeader, CardTitle, CardContent } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { ArrowLeft, Bot, Loader2 } from "lucide-react";
import { useRegisterAgent } from "@/domains/agent/hooks/useRegisterAgent";

export default function RegisterAgentPage() {
  const { isConnected } = useAccount();
  const router = useRouter();
  const { register, isPending, isConfirming, isSuccess, agentId } =
    useRegisterAgent();

  const [name, setName] = useState("");
  const [agentType, setAgentType] = useState("");
  const [endpoint, setEndpoint] = useState("");
  const [tokenURI, setTokenURI] = useState("");

  // Redirect on success
  useEffect(() => {
    if (isSuccess && agentId) {
      router.push(`/agent/${agentId.toString()}`);
    }
  }, [isSuccess, agentId, router]);

  const isValid =
    name.trim().length > 0 &&
    agentType.trim().length > 0 &&
    isAddress(endpoint);

  const handleSubmit = async () => {
    if (!isValid) return;
    try {
      await register({
        name: name.trim(),
        agentType: agentType.trim(),
        endpoint: endpoint as `0x${string}`,
        tokenURI: tokenURI.trim(),
      });
    } catch {
      // error handled by wallet
    }
  };

  const isLoading = isPending || isConfirming;

  return (
    <div className="max-w-lg mx-auto px-4 py-8 space-y-6">
      <Button variant="ghost" size="sm" asChild>
        <Link href="/agent">
          <ArrowLeft className="w-4 h-4 mr-1" />
          Back to Marketplace
        </Link>
      </Button>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bot className="w-5 h-5 text-ice-400" />
            Register Agent
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {!isConnected ? (
            <div className="text-center py-8 text-text-secondary">
              Connect wallet to register an agent
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <label className="text-sm text-text-secondary">Name *</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="My DeFi Agent"
                  className="w-full rounded-lg bg-bg-input border border-border px-3 py-2 text-sm text-white placeholder:text-text-tertiary focus:outline-none focus:ring-1 focus:ring-ice-400"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm text-text-secondary">
                  Agent Type *
                </label>
                <input
                  value={agentType}
                  onChange={(e) => setAgentType(e.target.value)}
                  placeholder="cdp-provider, consumer, etc."
                  className="w-full rounded-lg bg-bg-input border border-border px-3 py-2 text-sm text-white placeholder:text-text-tertiary focus:outline-none focus:ring-1 focus:ring-ice-400"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm text-text-secondary">
                  Endpoint Address *
                </label>
                <input
                  value={endpoint}
                  onChange={(e) => setEndpoint(e.target.value)}
                  placeholder="0x..."
                  className="w-full rounded-lg bg-bg-input border border-border px-3 py-2 text-sm text-white font-mono placeholder:text-text-tertiary focus:outline-none focus:ring-1 focus:ring-ice-400"
                />
                {endpoint && !isAddress(endpoint) && (
                  <span className="text-xs text-danger">
                    Invalid address format
                  </span>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-sm text-text-secondary">
                  Token URI (optional)
                </label>
                <input
                  value={tokenURI}
                  onChange={(e) => setTokenURI(e.target.value)}
                  placeholder="ipfs://... or https://..."
                  className="w-full rounded-lg bg-bg-input border border-border px-3 py-2 text-sm text-white placeholder:text-text-tertiary focus:outline-none focus:ring-1 focus:ring-ice-400"
                />
              </div>

              <Button
                onClick={handleSubmit}
                disabled={!isValid || isLoading}
                className="w-full"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    {isPending ? "Confirm in wallet..." : "Confirming..."}
                  </>
                ) : (
                  "Register Agent"
                )}
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
