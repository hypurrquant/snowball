import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  HttpCode,
  NotFoundException,
} from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { AgentService } from "./agent.service";
import { RunAgentDto } from "./dto/run-agent.dto";

@Controller("agent")
export class AgentController {
  constructor(private readonly agentService: AgentService) {}

  @Post("run")
  @HttpCode(200)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  async run(@Body() dto: RunAgentDto) {
    const troveId = dto.troveId ? BigInt(dto.troveId) : 0n;
    return this.agentService.runAgent(dto.user as `0x${string}`, dto.manifestId, troveId);
  }

  @Get("runs")
  getRuns(@Query("user") user?: string, @Query("limit") limit?: string) {
    return this.agentService.getRuns(user, limit ? parseInt(limit, 10) : undefined);
  }

  @Get("runs/:id")
  getRun(@Param("id") id: string) {
    const run = this.agentService.getRun(id);
    if (!run) {
      throw new NotFoundException(`Run not found: ${id}`);
    }
    return run;
  }

  @Get("status")
  getStatus() {
    return this.agentService.getStatus();
  }

  @Get("manifests")
  getManifests() {
    return this.agentService.getManifests();
  }
}
