import { createPublicClient, createWalletClient, http, type Address } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import type { AgentManifest, RunResult, AgentConfig } from "./types.js";
import { CapabilityRegistry } from "./registry.js";
import { morphoSupply, morphoWithdraw, liquityAdjustInterestRate, liquityAddCollateral } from "./capabilities/index.js";
import { buildSnapshot } from "./observers/build-snapshot.js";
import { plan as planWithClaude } from "./planner/anthropic-planner.js";
import { executePlan } from "./executor/execute-plan.js";
import { loadConfig } from "./config.js";

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

  async run(manifest: AgentManifest, user: Address, troveId: bigint = 0n): Promise<RunResult> {
    const runId = `run-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
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

      // 2. Observer: build snapshot
      logs.push("[Runtime] Building snapshot...");
      const snapshot = await buildSnapshot(
        publicClient,
        this.config,
        user,
        account.address,
        troveId
      );
      logs.push("[Runtime] Snapshot built successfully");

      // 3. Planner: Claude API
      logs.push("[Runtime] Planning...");
      const { plan, reasoning } = await planWithClaude(
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
      const ctx = { config: this.config, user, snapshot, walletClient, publicClient };
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
