"use client";

import { useConnection } from "wagmi";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bot, Shield, Zap, Settings } from "lucide-react";

export default function AgentPage() {
  const { isConnected } = useConnection();

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      <h1 className="text-2xl font-bold flex items-center gap-2">
        <Bot className="w-6 h-6 text-ice-400" />
        Agent
        <Badge>ERC-8004</Badge>
      </h1>

      {!isConnected ? (
        <Card>
          <CardContent className="py-12 text-center text-text-secondary">
            Connect wallet to manage your agent
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Agent Status */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Shield className="w-4 h-4 text-ice-400" />
                Agent Status
              </CardTitle>
              <CardDescription>
                Your autonomous DeFi agent powered by ERC-8004
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-xl bg-bg-input p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-text-secondary">Status</span>
                  <Badge variant="secondary">Inactive</Badge>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-text-secondary">Server Wallet</span>
                  <span className="text-text-tertiary">Not created</span>
                </div>
              </div>
              <Button className="w-full">
                <Zap className="w-4 h-4" />
                Activate Agent
              </Button>
            </CardContent>
          </Card>

          {/* Agent Config */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Settings className="w-4 h-4 text-ice-400" />
                Configuration
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="rounded-xl bg-bg-input p-4 space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-text-secondary">Strategy</span>
                  <span>Conservative</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-secondary">Min. CR</span>
                  <span>200%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-secondary">Auto Rebalance</span>
                  <Badge variant="secondary">Off</Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-secondary">Auto Rate Adjust</span>
                  <Badge variant="secondary">Off</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
