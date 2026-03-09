"use client";

import { useState } from "react";
import { isAddress, parseEther, toFunctionSelector, type Address } from "viem";
import { Card, CardHeader, CardTitle, CardContent } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/shared/components/ui/tabs";
import { Shield, Loader2 } from "lucide-react";
import { LIQUITY, TOKENS } from "@/core/config/addresses";
import { useVaultPermission } from "../hooks/useVaultPermission";
import { PERMISSION_EXPIRY_SECONDS } from "../lib/constants";

// Preset: Allow agent to manage Liquity trove interest rate + add collateral
const PRESET_LIQUITY_RATE = {
  label: "Liquity Rate Adjuster",
  description: "Allow agent to adjust your trove interest rate and add collateral",
  targets: [LIQUITY.branches.wCTC.borrowerOperations],
  functions: [
    toFunctionSelector("adjustTroveInterestRate(uint256,uint256,uint256,uint256)"),
  ] as `0x${string}`[],
  tokenCaps: [
    { token: TOKENS.wCTC as Address, cap: parseEther("100") },
  ],
};

interface PermissionFormProps {
  agentEndpoint: `0x${string}`;
  onSuccess?: () => void;
}

export function PermissionForm({ agentEndpoint, onSuccess }: PermissionFormProps) {
  const [mode, setMode] = useState<"preset" | "custom">("preset");
  const [customAgent, setCustomAgent] = useState("");
  const [customTargets, setCustomTargets] = useState("");
  const [customFunctions, setCustomFunctions] = useState("");
  const [customExpiry, setCustomExpiry] = useState("");

  const { grantPermission, isGrantPending } = useVaultPermission();

  const handlePreset = async () => {
    try {
      const expiry = BigInt(Math.floor(Date.now() / 1000) + PERMISSION_EXPIRY_SECONDS);
      await grantPermission({
        agent: agentEndpoint,
        targets: PRESET_LIQUITY_RATE.targets,
        functions: PRESET_LIQUITY_RATE.functions,
        expiry,
        tokenCaps: PRESET_LIQUITY_RATE.tokenCaps,
      });
      onSuccess?.();
    } catch {
      // handled by wallet
    }
  };

  const handleCustom = async () => {
    const agent = customAgent.trim() as `0x${string}`;
    if (!isAddress(agent)) return;

    const targets = customTargets
      .split(",")
      .map((t) => t.trim())
      .filter((t) => isAddress(t)) as `0x${string}`[];
    const functions = customFunctions
      .split(",")
      .map((f) => f.trim())
      .filter((f) => /^0x[0-9a-fA-F]{8}$/.test(f)) as `0x${string}`[];

    if (targets.length === 0 || functions.length === 0) return;

    const expiryDate = customExpiry ? new Date(customExpiry) : null;
    const now = Date.now();

    if (expiryDate && expiryDate.getTime() <= now) {
      alert("Expiry must be in the future");
      return;
    }

    const expiry = expiryDate
      ? BigInt(Math.floor(expiryDate.getTime() / 1000))
      : 0n;

    try {
      await grantPermission({ agent, targets, functions, expiry, tokenCaps: [] });
      onSuccess?.();
    } catch {
      // handled by wallet
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Shield className="w-4 h-4 text-ice-400" />
          Grant Permission
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs value={mode} onValueChange={(v) => setMode(v as "preset" | "custom")}>
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="preset">Preset</TabsTrigger>
            <TabsTrigger value="custom">Custom</TabsTrigger>
          </TabsList>

          <TabsContent value="preset" className="space-y-4">
            <div className="rounded-xl bg-bg-input p-4 space-y-2">
              <div className="font-semibold text-white text-sm">
                {PRESET_LIQUITY_RATE.label}
              </div>
              <p className="text-xs text-text-tertiary">
                {PRESET_LIQUITY_RATE.description}
              </p>
              <p className="text-xs text-text-tertiary">
                Agent: {agentEndpoint.slice(0, 6)}...
                {agentEndpoint.slice(-4)}
              </p>
              <p className="text-xs text-text-tertiary">Expires: 30 days</p>
            </div>
            <Button
              onClick={handlePreset}
              disabled={isGrantPending}
              className="w-full"
            >
              {isGrantPending && (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              )}
              Grant Preset Permission
            </Button>
          </TabsContent>

          <TabsContent value="custom" className="space-y-3">
            <div className="space-y-2">
              <label className="text-xs text-text-secondary">Agent Address</label>
              <input
                value={customAgent}
                onChange={(e) => setCustomAgent(e.target.value)}
                placeholder="0x..."
                className="w-full rounded-lg bg-bg-input border border-border px-3 py-2 text-sm text-white font-mono placeholder:text-text-tertiary focus:outline-none focus:ring-1 focus:ring-ice-400"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs text-text-secondary">
                Target Addresses (comma-separated)
              </label>
              <input
                value={customTargets}
                onChange={(e) => setCustomTargets(e.target.value)}
                placeholder="0x..., 0x..."
                className="w-full rounded-lg bg-bg-input border border-border px-3 py-2 text-sm text-white font-mono placeholder:text-text-tertiary focus:outline-none focus:ring-1 focus:ring-ice-400"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs text-text-secondary">
                Function Selectors (comma-separated, 0x12345678)
              </label>
              <input
                value={customFunctions}
                onChange={(e) => setCustomFunctions(e.target.value)}
                placeholder="0x12345678, 0xabcdef01"
                className="w-full rounded-lg bg-bg-input border border-border px-3 py-2 text-sm text-white font-mono placeholder:text-text-tertiary focus:outline-none focus:ring-1 focus:ring-ice-400"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs text-text-secondary">
                Expiry Date
              </label>
              <input
                type="date"
                value={customExpiry}
                onChange={(e) => setCustomExpiry(e.target.value)}
                className="w-full rounded-lg bg-bg-input border border-border px-3 py-2 text-sm text-white placeholder:text-text-tertiary focus:outline-none focus:ring-1 focus:ring-ice-400"
              />
              <p className="text-xs text-text-tertiary">
                Custom mode: execution-only (no token caps). Use executeOnBehalf only.
              </p>
            </div>
            <Button
              onClick={handleCustom}
              disabled={isGrantPending}
              className="w-full"
            >
              {isGrantPending && (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              )}
              Grant Custom Permission
            </Button>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
