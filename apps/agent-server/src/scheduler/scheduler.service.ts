import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { AgentService } from "../agent/agent.service";
import { loadConfig, AgentVaultABI, TroveManagerABI, TroveNFTABI } from "@snowball/agent-runtime";
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

    this.logger.log(
      `Cron triggered: ${users.length} users, manifest=${cronManifest}`,
    );

    // 2. Build trove map (once per tick)
    const troveMap = await this.buildTroveMap();

    // 3. Execute per user
    for (const user of users) {
      const troveId = troveMap.get(user.toLowerCase()) ?? 0n;
      try {
        const result = await this.agentService.runAgent(
          user,
          cronManifest,
          troveId,
        );
        this.logger.log(
          `User ${user}: ${result.runId} — ${result.status}`,
        );
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        this.logger.error(`User ${user} failed: ${message}`);
      }
    }
  }

  private async buildTroveMap(): Promise<Map<string, bigint>> {
    try {
      const count = (await this.publicClient.readContract({
        address: this.config.liquity.troveManager,
        abi: TroveManagerABI,
        functionName: "getTroveIdsCount",
      })) as bigint;

      const map = new Map<string, bigint>();
      for (let i = 0n; i < count; i++) {
        const troveId = (await this.publicClient.readContract({
          address: this.config.liquity.troveManager,
          abi: TroveManagerABI,
          functionName: "getTroveFromTroveIdsArray",
          args: [i],
        })) as bigint;

        const owner = (await this.publicClient.readContract({
          address: this.config.liquity.troveNFT,
          abi: TroveNFTABI,
          functionName: "ownerOf",
          args: [troveId],
        })) as Address;

        map.set(owner.toLowerCase(), troveId);
      }
      return map;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(`buildTroveMap failed: ${message}`);
      return new Map();
    }
  }
}
