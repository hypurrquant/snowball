import { createPublicClient, createWalletClient, http, type Address } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import type { AgentManifest, RunResult, AgentConfig } from "./types";
import { CapabilityRegistry } from "./registry";
import { morphoSupply, morphoWithdraw, liquityAdjustInterestRate, liquityAddCollateral } from "./capabilities/index";
import { buildSnapshot } from "./observers/build-snapshot";
import { plan as planWithApi } from "./planner/anthropic-planner";
import { plan as planWithCli } from "./planner/cli-planner";
import { executePlan } from "./executor/execute-plan";
import { loadConfig } from "./config";

export function buildDemoRegistry(): CapabilityRegistry {
  const registry = new CapabilityRegistry();
  registry.register(morphoSupply);
  registry.register(morphoWithdraw);
  registry.register(liquityAdjustInterestRate);
  registry.register(liquityAddCollateral);
  return registry;
}

export class AgentRuntime {
  private config: AgentConfig;
  private registry: CapabilityRegistry;

  constructor(config?: AgentConfig, registry?: CapabilityRegistry) {
    this.config = config ?? loadConfig();
    this.registry = registry ?? buildDemoRegistry();
  }

  async run(manifest: AgentManifest, user: Address, troveId: bigint, runId: string): Promise<RunResult> {
    const logs: string[] = [];

    try {
      // 1. Setup clients
      const account = privateKeyToAccount(this.config.agentPrivateKey);
      const publicClient = createPublicClient({
        chain: { id: this.config.chainId, name: "Creditcoin Testnet", nativeCurrency: { name: "CTC", symbol: "CTC", decimals: 18 }, rpcUrls: { default: { http: [this.config.rpcUrl] } } },
        transport: http(this.config.rpcUrl),
      });
      const walletClient = createWalletClient({
        account,
        chain: { id: this.config.chainId, name: "Creditcoin Testnet", nativeCurrency: { name: "CTC", symbol: "CTC", decimals: 18 }, rpcUrls: { default: { http: [this.config.rpcUrl] } } },
        transport: http(this.config.rpcUrl),
      });

      logs.push(`[Runtime] Starting run ${runId} for user ${user}`);

      // Resolve liquity branch from manifest
      const branchName = (manifest.scope.liquityBranch === "lstCTC" ? "lstCTC" : "wCTC") as "wCTC" | "lstCTC";
      const branchConfig = this.config.liquityBranches[branchName];

      // 2. Observer: build snapshot
      logs.push(`[Runtime] Building snapshot (branch=${branchName})...`);
      const snapshot = await buildSnapshot(
        publicClient,
        this.config,
        branchConfig,
        user,
        account.address,
        troveId
      );
      logs.push("[Runtime] Snapshot built successfully");

      // 3. Planner: CLI proxy or API
      const plannerMode = process.env.PLANNER_MODE || "cli";
      const planFn = plannerMode === "api" ? planWithApi : planWithCli;
      logs.push(`[Runtime] Planning (mode=${plannerMode})...`);
      const { plan, reasoning } = await planFn(
        snapshot,
        manifest,
        this.registry,
        this.config
      );
      logs.push(`[Runtime] Plan: ${plan.steps.length} step(s)`);

      if (plan.steps.length === 0) {
        logs.push("[Runtime] No action needed");
        return {
          runId, status: "no_action", plan, txHashes: [], logs, errors: [],
          reasoning, timestamp: Date.now(), user, manifestId: manifest.id,
        };
      }

      // 4. Executor: execute plan
      logs.push("[Runtime] Executing plan...");
      const ctx = { config: this.config, liquityBranch: branchConfig, branchName, user, snapshot, walletClient, publicClient };
      const result = await executePlan(
        plan, ctx, this.registry, manifest, account.address, troveId
      );

      logs.push(...result.logs);
      logs.push(`[Runtime] Run completed: ${result.status}`);

      return {
        runId, status: result.status, plan, txHashes: result.txHashes,
        logs, errors: result.errors, reasoning, timestamp: Date.now(),
        user, manifestId: manifest.id,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      logs.push(`[Runtime] Fatal error: ${message}`);
      return {
        runId, status: "error", plan: null, txHashes: [],
        logs, errors: [message], timestamp: Date.now(), user, manifestId: manifest.id,
      };
    }
  }
}
