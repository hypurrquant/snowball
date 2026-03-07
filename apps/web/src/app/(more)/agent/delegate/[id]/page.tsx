"use client";

import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect } from "react";
import { useAccount } from "wagmi";
import Link from "next/link";
import { Button } from "@/shared/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { ERC8004 } from "@/core/config/addresses";
import { useAgentProfile } from "@/domains/agent/hooks/useAgentProfile";
import { AgentProfileHeader } from "@/domains/agent/components/AgentProfileHeader";
import { DelegationSetupWizard } from "@/domains/agent/components/DelegationSetupWizard";
import { DelegationStatus } from "@/domains/agent/components/DelegationStatus";
import { useMorphoAuthorization } from "@/domains/defi/morpho/hooks/useMorphoAuthorization";
import { useTroveDelegate } from "@/domains/defi/liquity/hooks/useTroveDelegate";

export default function DelegatePage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const agentId = params.id ? BigInt(params.id as string) : undefined;
  const { address } = useAccount();

  const qScenario = searchParams.get("scenario");
  const qTroveId = searchParams.get("troveId");
  const qBranch = searchParams.get("branch");

  const [scenario, setScenario] = useState<"morpho" | "liquity">(
    qScenario === "liquity" ? "liquity" : "morpho",
  );
  const [troveId, setTroveId] = useState(qTroveId ?? "");
  const branch: "wCTC" | "lstCTC" =
    qBranch === "lstCTC" ? "lstCTC" : "wCTC";

  const { agent, owner, isValidated, validation, isLoading } =
    useAgentProfile(agentId);

  // Check Morpho authorization state
  const { checkIsAuthorized } = useMorphoAuthorization();
  const [morphoAuthorized, setMorphoAuthorized] = useState(false);

  useEffect(() => {
    if (!address) return;
    checkIsAuthorized(address, ERC8004.agentVault).then(setMorphoAuthorized).catch(() => {});
  }, [address, checkIsAuthorized]);

  // Check Liquity delegation state (both addManager AND interestDelegate must be set)
  const { getAddManagerOf, getInterestIndividualDelegateOf } = useTroveDelegate(branch);
  const [liquityDelegated, setLiquityDelegated] = useState(false);

  useEffect(() => {
    if (!troveId) { setLiquityDelegated(false); return; }
    const id = BigInt(troveId);
    const vault = ERC8004.agentVault.toLowerCase();
    Promise.all([getAddManagerOf(id), getInterestIndividualDelegateOf(id)])
      .then(([manager, delegate]) => {
        const isManager = manager.toLowerCase() === vault;
        const isDelegate = delegate.account.toLowerCase() === vault;
        setLiquityDelegated(isManager && isDelegate);
      })
      .catch(() => setLiquityDelegated(false));
  }, [troveId, getAddManagerOf, getInterestIndividualDelegateOf]);

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      <Button variant="ghost" size="sm" asChild>
        <Link href={agentId ? `/agent/${agentId}` : "/agent"}>
          <ArrowLeft className="w-4 h-4 mr-1" />
          Back to Agent
        </Link>
      </Button>

      <AgentProfileHeader
        agent={agent}
        owner={owner}
        isValidated={isValidated}
        validation={validation}
        isLoading={isLoading}
      />

      {!address ? (
        <div className="text-center py-8 text-text-tertiary">
          Connect your wallet to set up delegation.
        </div>
      ) : !agent ? (
        isLoading ? (
          <div className="text-center py-8 text-text-tertiary">Loading...</div>
        ) : (
          <div className="text-center py-8 text-text-tertiary">Agent not found.</div>
        )
      ) : (
        <>
          {/* Scenario selector */}
          <div className="flex gap-2">
            <Button
              variant={scenario === "morpho" ? "default" : "outline"}
              onClick={() => setScenario("morpho")}
              size="sm"
            >
              Morpho (Supply/Withdraw)
            </Button>
            <Button
              variant={scenario === "liquity" ? "default" : "outline"}
              onClick={() => setScenario("liquity")}
              size="sm"
            >
              Liquity (Rate/Collateral)
            </Button>
          </div>

          <DelegationStatus
            agentAddress={agent.endpoint}
            morphoAuthorized={morphoAuthorized}
            liquityDelegated={liquityDelegated}
          />

          <DelegationSetupWizard
            agentAddress={agent.endpoint}
            agentVaultAddress={ERC8004.agentVault}
            scenario={scenario}
            branch={branch}
            troveId={troveId}
            onTroveIdChange={setTroveId}
            onComplete={() => router.push(`/agent/${agentId}`)}
          />
        </>
      )}
    </div>
  );
}
