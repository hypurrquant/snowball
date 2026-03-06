"use client";

import Link from "next/link";
import { useAccount } from "wagmi";
import { Card, CardContent } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { Bot, Plus, Users, Vault } from "lucide-react";
import { useAgentList } from "@/domains/agent/hooks/useAgentList";
import { useMyAgents } from "@/domains/agent/hooks/useMyAgents";
import { AgentCard } from "@/domains/agent/components/AgentCard";

export default function AgentPage() {
  const { isConnected } = useAccount();
  const { agents, total, isLoading } = useAgentList();
  const { myAgents, isLoading: isLoadingMy } = useMyAgents();

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2 text-white">
          <Bot className="w-6 h-6 text-ice-400" />
          Agent Marketplace
          <Badge>{total} agents</Badge>
        </h1>
        <div className="flex gap-2">
          {isConnected && (
            <Button variant="secondary" asChild>
              <Link href="/agent/vault">
                <Vault className="w-4 h-4 mr-1" />
                My Vault
              </Link>
            </Button>
          )}
          <Button asChild className="bg-white text-black hover:bg-gray-200">
            <Link href="/agent/register">
              <Plus className="w-4 h-4 mr-1" />
              Register Agent
            </Link>
          </Button>
        </div>
      </div>

      {/* My Agents */}
      {isConnected && (
        <div>
          <h2 className="flex items-center gap-2 text-sm font-semibold text-text-secondary uppercase tracking-wider mb-3">
            <Users className="w-4 h-4 text-ice-400" />
            My Agents
          </h2>
          {isLoadingMy ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2].map((i) => (
                <Skeleton key={i} className="h-32 rounded-xl" />
              ))}
            </div>
          ) : myAgents.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-text-secondary">
                You haven&apos;t registered any agents yet.{" "}
                <Link href="/agent/register" className="text-ice-400 hover:underline">
                  Register one
                </Link>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {myAgents.map((a) => (
                <AgentCard key={a.id.toString()} id={a.id} agent={a} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* All Agents */}
      <div>
        <h2 className="flex items-center gap-2 text-sm font-semibold text-text-secondary uppercase tracking-wider mb-3">
          <Bot className="w-4 h-4 text-text-tertiary" />
          All Agents
        </h2>
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Skeleton key={i} className="h-32 rounded-xl" />
            ))}
          </div>
        ) : agents.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-text-secondary">
              No agents registered yet. Be the first to{" "}
              <Link href="/agent/register" className="text-ice-400 hover:underline">
                register an agent
              </Link>
              .
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {agents.map((a) => (
              <AgentCard key={a.id.toString()} id={a.id} agent={a} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
