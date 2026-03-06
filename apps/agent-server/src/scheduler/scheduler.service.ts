import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { AgentService } from "../agent/agent.service";

@Injectable()
export class SchedulerService {
  private readonly logger = new Logger(SchedulerService.name);

  constructor(private readonly agentService: AgentService) {}

  @Cron(process.env.AGENT_CRON || CronExpression.EVERY_HOUR)
  async handleCron(): Promise<void> {
    const cronUser = process.env.AGENT_CRON_USER as `0x${string}` | undefined;
    const cronManifest = process.env.AGENT_CRON_MANIFEST;

    if (!cronUser || !cronManifest) {
      this.logger.debug("Cron skipped: AGENT_CRON_USER or AGENT_CRON_MANIFEST not set");
      return;
    }

    this.logger.log(`Cron triggered: user=${cronUser}, manifest=${cronManifest}`);

    try {
      const troveId = process.env.AGENT_CRON_TROVE_ID
        ? BigInt(process.env.AGENT_CRON_TROVE_ID)
        : 0n;
      const result = await this.agentService.runAgent(cronUser, cronManifest, troveId);
      this.logger.log(`Cron run completed: ${result.runId} — ${result.status}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(`Cron run failed: ${message}`);
    }
  }
}
