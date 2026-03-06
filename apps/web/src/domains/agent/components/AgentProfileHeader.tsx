"use client";

import { Badge } from "@/shared/components/ui/badge";
import { Bot, Shield, CheckCircle, ExternalLink } from "lucide-react";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { EXPLORER_URL } from "@/core/config/addresses";
import type { AgentInfo, Validation } from "../types";
import type { Address } from "viem";

interface AgentProfileHeaderProps {
  agent: AgentInfo | undefined;
  owner: Address | undefined;
  isValidated: boolean;
  validation?: Validation;
  isLoading: boolean;
}

export function AgentProfileHeader({
  agent,
  owner,
  isValidated,
  validation,
  isLoading,
}: AgentProfileHeaderProps) {
  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-32" />
        <div className="flex gap-2">
          <Skeleton className="h-6 w-16" />
          <Skeleton className="h-6 w-20" />
        </div>
      </div>
    );
  }

  if (!agent) {
    return (
      <div className="text-center py-12 text-text-secondary">
        Agent not found
      </div>
    );
  }

  const shortOwner = owner
    ? `${owner.slice(0, 6)}...${owner.slice(-4)}`
    : "Unknown";

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-full bg-ice-400/10 flex items-center justify-center">
          <Bot className="w-6 h-6 text-ice-400" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-white">{agent.name}</h1>
            {isValidated && (
              <CheckCircle className="w-5 h-5 text-success" />
            )}
          </div>
          <span className="text-sm text-text-tertiary">{agent.agentType}</span>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Badge variant={agent.isActive ? "default" : "secondary"}>
          {agent.isActive ? "Active" : "Inactive"}
        </Badge>
        {isValidated ? (
          <Badge variant="secondary" className="gap-1">
            <Shield className="w-3 h-3" />
            Validated
            {validation?.expiresAt
              ? ` (until ${new Date(Number(validation.expiresAt) * 1000).toLocaleDateString()})`
              : ""}
          </Badge>
        ) : (
          <Badge variant="secondary" className="text-text-tertiary">
            Unvalidated
          </Badge>
        )}
      </div>

      <div className="rounded-xl bg-bg-input p-4 space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-text-secondary">Owner</span>
          <a
            href={`${EXPLORER_URL}/address/${owner}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-ice-400 hover:underline flex items-center gap-1"
          >
            {shortOwner}
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
        <div className="flex justify-between">
          <span className="text-text-secondary">Endpoint</span>
          <a
            href={`${EXPLORER_URL}/address/${agent.endpoint}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-ice-400 hover:underline flex items-center gap-1"
          >
            {`${agent.endpoint.slice(0, 6)}...${agent.endpoint.slice(-4)}`}
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
        <div className="flex justify-between">
          <span className="text-text-secondary">Registered</span>
          <span className="text-white">
            {new Date(Number(agent.registeredAt) * 1000).toLocaleDateString()}
          </span>
        </div>
      </div>
    </div>
  );
}
