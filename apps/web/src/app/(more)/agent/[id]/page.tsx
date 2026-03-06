"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { useAccount } from "wagmi";
import { Button } from "@/shared/components/ui/button";
import { ArrowLeft, Power, Loader2, Shield } from "lucide-react";
import { useAgentProfile } from "@/domains/agent/hooks/useAgentProfile";
import { useAgentActions } from "@/domains/agent/hooks/useAgentActions";
import { AgentProfileHeader } from "@/domains/agent/components/AgentProfileHeader";
import { ReputationSection } from "@/domains/agent/components/ReputationSection";
import { ReviewForm } from "@/domains/agent/components/ReviewForm";
import { RunAgentButton } from "@/domains/agent/components/RunAgentButton";
import { ActivityLog } from "@/domains/agent/components/ActivityLog";

export default function AgentProfilePage() {
  const params = useParams();
  const agentId = params.id ? BigInt(params.id as string) : undefined;
  const { address } = useAccount();

  const {
    agent,
    owner,
    reputation,
    successRate,
    reviews,
    isValidated,
    validation,
    isLoading,
    refetch,
  } = useAgentProfile(agentId);

  const { activate, deactivate, isPending: isActionPending } =
    useAgentActions();

  const isOwner = !!address && !!owner && address.toLowerCase() === owner.toLowerCase();

  const handleToggle = async () => {
    if (!agentId || !agent) return;
    try {
      if (agent.isActive) {
        await deactivate(agentId);
      } else {
        await activate(agentId);
      }
      refetch();
    } catch {
      // error handled by wallet
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      <Button variant="ghost" size="sm" asChild>
        <Link href="/agent">
          <ArrowLeft className="w-4 h-4 mr-1" />
          Back to Marketplace
        </Link>
      </Button>

      <AgentProfileHeader
        agent={agent}
        owner={owner}
        isValidated={isValidated}
        validation={validation}
        isLoading={isLoading}
      />

      {/* Owner Actions */}
      {isOwner && agent && (
        <div className="flex gap-2">
          <Button
            onClick={handleToggle}
            disabled={isActionPending}
            variant={agent.isActive ? "destructive" : "default"}
            className="flex-1"
          >
            {isActionPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Power className="w-4 h-4" />
            )}
            {agent.isActive ? "Deactivate" : "Activate"}
          </Button>
        </div>
      )}

      <ReputationSection
        reputation={reputation}
        successRate={successRate}
        reviews={reviews}
        isLoading={isLoading}
      />

      {/* Delegate button — replaces old PermissionForm */}
      {address && agent && agentId && (
        <Button asChild className="w-full">
          <Link href={`/agent/delegate/${agentId}`}>
            <Shield className="w-4 h-4 mr-2" />
            Set Up Delegation
          </Link>
        </Button>
      )}

      {/* Run Agent */}
      {address && agent && (
        <RunAgentButton agentEndpoint={agent.endpoint} />
      )}

      {/* Activity Log */}
      {address && <ActivityLog />}

      {/* Review Form - available to any connected user */}
      {address && agentId && (
        <ReviewForm agentId={agentId} onSuccess={refetch} />
      )}
    </div>
  );
}
