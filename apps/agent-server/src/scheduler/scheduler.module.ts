import { Module } from "@nestjs/common";
import { AgentModule } from "../agent/agent.module";
import { SchedulerService } from "./scheduler.service";

@Module({
  imports: [AgentModule],
  providers: [SchedulerService],
})
export class SchedulerModule {}
