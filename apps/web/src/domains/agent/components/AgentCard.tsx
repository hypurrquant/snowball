"use client";

import Link from "next/link";
import { Badge } from "@/shared/components/ui/badge";
import { Bot, Shield, CheckCircle } from "lucide-react";
import type { AgentInfo } from "../types";

interface AgentCardProps {
  id: bigint;
  agent: AgentInfo;
  isValidated?: boolean;
}

export function AgentCard({ id, agent, isValidated }: AgentCardProps) {
  return (
    <Link
      href={`/agent/${id.toString()}`}
      className="card card-hover group block"
    >
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 rounded-full bg-ice-400/10 flex items-center justify-center">
          <Bot className="w-5 h-5 text-ice-400" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-white group-hover:text-ice-400 transition-colors truncate">
              {agent.name}
            </span>
            {isValidated && (
              <CheckCircle className="w-4 h-4 text-success flex-shrink-0" />
            )}
          </div>
          <span className="text-xs text-text-tertiary">{agent.agentType}</span>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Badge variant={agent.isActive ? "default" : "secondary"}>
          {agent.isActive ? "Active" : "Inactive"}
        </Badge>
        {isValidated && (
          <Badge variant="secondary" className="gap-1">
            <Shield className="w-3 h-3" />
            Verified
          </Badge>
        )}
      </div>
    </Link>
  );
}
