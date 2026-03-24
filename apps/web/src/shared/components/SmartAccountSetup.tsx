"use client";

import { useState, useCallback } from "react";
import { useSmartAccount } from "@/shared/hooks/useSmartAccount";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import { Wallet, Fuel, Shield, Copy, Check } from "lucide-react";

export function SmartAccountSetup() {
  const {
    eoaAddress,
    smartAccountAddress,
    hasSmartAccount,
    isFactoryDeployed,
    gasSponsorAvailable,
    createSmartAccount,
    isPending,
  } = useSmartAccount();

  const [copied, setCopied] = useState(false);

  const copyAddress = useCallback(() => {
    if (smartAccountAddress) {
      navigator.clipboard.writeText(smartAccountAddress);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [smartAccountAddress]);

  if (!eoaAddress) return null;

  return (
    <Card className="bg-bg-card/60 backdrop-blur-xl border-border">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Shield className="w-4 h-4 text-ice-400" />
          Smart Account
          {gasSponsorAvailable && (
            <Badge className="bg-green-500/15 text-green-400 border-green-500/30 text-xs">
              <Fuel className="w-3 h-3 mr-1" />
              Gas Free
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {!isFactoryDeployed ? (
          <p className="text-xs text-text-tertiary">
            Smart Account Factory not deployed on this chain yet.
          </p>
        ) : !hasSmartAccount ? (
          <div className="space-y-2">
            <p className="text-xs text-text-secondary">
              Create a Smart Account to enable gasless transactions.
            </p>
            <Button
              size="sm"
              onClick={createSmartAccount}
              disabled={isPending}
            >
              {isPending ? "Creating..." : "Create Smart Account"}
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Wallet className="w-3.5 h-3.5 text-ice-400" />
              <code className="text-xs font-mono text-text-secondary">
                {smartAccountAddress?.slice(0, 8)}...
                {smartAccountAddress?.slice(-6)}
              </code>
              <button
                onClick={copyAddress}
                className="text-text-tertiary hover:text-text-primary"
              >
                {copied ? (
                  <Check className="w-3 h-3 text-green-400" />
                ) : (
                  <Copy className="w-3 h-3" />
                )}
              </button>
            </div>
            <p className="text-xs text-green-400">
              Smart Account active — gasless transactions enabled
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
