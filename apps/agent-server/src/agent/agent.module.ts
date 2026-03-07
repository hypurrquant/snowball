import { Module } from "@nestjs/common";
import { AgentController } from "./agent.controller";
import { AgentService } from "./agent.service";
import { RunStoreService } from "./run-store.service";
import { AgentRuntime } from "@snowball/agent-runtime";

@Module({
  controllers: [AgentController],
  providers: [
    AgentService,
    RunStoreService,
    {
      provide: "AGENT_RUNTIME",
      useFactory: () => new AgentRuntime(),
    },
  ],
  exports: [AgentService],
})
export class AgentModule {}
