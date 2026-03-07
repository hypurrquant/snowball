import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { AgentService } from "../agent/agent.service";
import { loadConfig, AgentVaultABI, TroveManagerABI, TroveNFTABI } from "@snowball/agent-runtime";
import type { LiquityBranchConfig } from "@snowball/agent-runtime";
import { createPublicClient, http, type Address } from "viem";
import { privateKeyToAccount } from "viem/accounts";

@Injectable()
export class SchedulerService {
  private readonly logger = new Logger(SchedulerService.name);
  private readonly config = loadConfig();
  private readonly publicClient = createPublicClient({
    transport: http(this.config.rpcUrl),
  });
  private readonly agentEOA = privateKeyToAccount(
    this.config.agentPrivateKey,
  ).address;

  constructor(private readonly agentService: AgentService) {}

  @Cron(process.env.AGENT_CRON || CronExpression.EVERY_HOUR)
  async handleCron(): Promise<void> {
    const cronManifest = process.env.AGENT_CRON_MANIFEST;
    if (!cronManifest) {
      this.logger.debug("Cron skipped: AGENT_CRON_MANIFEST not set");
      return;
    }

    // Support comma-separated manifest IDs
    const manifestIds = cronManifest.split(",").map((s) => s.trim()).filter(Boolean);

    // 1. Get delegated users from on-chain
    let users: Address[];
    try {
      users = (await this.publicClient.readContract({
        address: this.config.agentVault,
        abi: AgentVaultABI,
        functionName: "getDelegatedUsers",
        args: [this.agentEOA],
      })) as Address[];
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(`getDelegatedUsers RPC failed: ${message}`);
      return;
    }

    if (users.length === 0) {
      this.logger.debug("Cron skipped: 0 delegated users");
      return;
    }

    // 2. Build trove maps for both branches (once per tick)
    const troveMaps = await this.buildTroveMaps();

    this.logger.log(
      `Cron triggered: ${users.length} users, manifests=[${manifestIds.join(",")}]`,
    );

    // 3. Execute per manifest, per user
    for (const manifestId of manifestIds) {
      const manifest = this.agentService.getManifest(manifestId);
      if (!manifest) {
        this.logger.warn(`Manifest not found: ${manifestId}, skipping`);
        continue;
      }

      const branch = (manifest.scope.liquityBranch === "lstCTC" ? "lstCTC" : "wCTC") as "wCTC" | "lstCTC";
      const troveMap = troveMaps.get(branch) ?? new Map<string, bigint>();

      for (const user of users) {
        const troveId = troveMap.get(user.toLowerCase()) ?? 0n;
        try {
          const result = await this.agentService.runAgent(
            user,
            manifestId,
            troveId,
          );
          this.logger.log(
            `User ${user} [${branch}]: ${result.runId} — ${result.status}`,
          );
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          this.logger.error(`User ${user} [${branch}] failed: ${message}`);
        }
      }
    }
  }

  private async buildTroveMaps(): Promise<Map<"wCTC" | "lstCTC", Map<string, bigint>>> {
    const result = new Map<"wCTC" | "lstCTC", Map<string, bigint>>();

    for (const [branchName, branchConfig] of Object.entries(this.config.liquityBranches) as ["wCTC" | "lstCTC", LiquityBranchConfig][]) {
      try {
        const map = await this.buildBranchTroveMap(branchConfig);
        result.set(branchName, map);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        this.logger.error(`buildTroveMap(${branchName}) failed: ${message}`);
        result.set(branchName, new Map());
      }
    }

    return result;
  }

  private async buildBranchTroveMap(branchConfig: LiquityBranchConfig): Promise<Map<string, bigint>> {
    const count = (await this.publicClient.readContract({
      address: branchConfig.troveManager,
      abi: TroveManagerABI,
      functionName: "getTroveIdsCount",
    })) as bigint;

    const map = new Map<string, bigint>();
    for (let i = 0n; i < count; i++) {
      const troveId = (await this.publicClient.readContract({
        address: branchConfig.troveManager,
        abi: TroveManagerABI,
        functionName: "getTroveFromTroveIdsArray",
        args: [i],
      })) as bigint;

      const owner = (await this.publicClient.readContract({
        address: branchConfig.troveNFT,
        abi: TroveNFTABI,
        functionName: "ownerOf",
        args: [troveId],
      })) as Address;

      map.set(owner.toLowerCase(), troveId);
    }
    return map;
  }
}
