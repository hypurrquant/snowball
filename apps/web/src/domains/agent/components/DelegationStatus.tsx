"use client";

import { useAccount } from "wagmi";
import { Card, CardHeader, CardTitle, CardContent } from "@/shared/components/ui/card";
import { Shield, CheckCircle, XCircle } from "lucide-react";
import { useVaultPermission } from "../hooks/useVaultPermission";
import { useVaultBalance } from "../hooks/useVaultBalance";
import type { Address } from "viem";

interface DelegationStatusProps {
  agentAddress: Address;
  morphoAuthorized?: boolean;
  liquityDelegated?: boolean;
}

export function DelegationStatus({
  agentAddress,
  morphoAuthorized,
  liquityDelegated,
}: DelegationStatusProps) {
  const { address } = useAccount();
  const { permissions } = useVaultPermission();
  const { balances } = useVaultBalance();

  const activePermission = permissions.find(
    (p) =>
      p.agent.toLowerCase() === agentAddress.toLowerCase() &&
      p.permission?.active
  );

  const vaultHasBalance = balances.some((b) => b.balance > 0n);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Shield className="w-4 h-4 text-ice-400" />
          Delegation Status
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {!address ? (
          <p className="text-sm text-text-tertiary">Connect wallet to view status</p>
        ) : (
          <>
            <StatusRow
              label="Vault Funded"
              active={vaultHasBalance}
            />
            <StatusRow
              label="Vault Permission"
              active={!!activePermission}
            />
            <StatusRow
              label="Morpho Authorization"
              active={morphoAuthorized ?? false}
            />
            <StatusRow
              label="Liquity Delegation"
              active={liquityDelegated ?? false}
            />
          </>
        )}
      </CardContent>
    </Card>
  );
}

function StatusRow({ label, active }: { label: string; active: boolean }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-text-secondary">{label}</span>
      {active ? (
        <span className="flex items-center gap-1 text-green-400">
          <CheckCircle className="w-4 h-4" />
          Active
        </span>
      ) : (
        <span className="flex items-center gap-1 text-text-tertiary">
          <XCircle className="w-4 h-4" />
          Not set
        </span>
      )}
    </div>
  );
}
