import { Module } from "@nestjs/common";
import { ScheduleModule } from "@nestjs/schedule";
import { AgentModule } from "./agent/agent.module";
import { SchedulerModule } from "./scheduler/scheduler.module";

@Module({
  imports: [
    ScheduleModule.forRoot(),
    AgentModule,
    SchedulerModule,
  ],
})
export class AppModule {}
