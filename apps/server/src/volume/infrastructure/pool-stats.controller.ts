import { Controller, Get } from "@nestjs/common";
import { VolumeQueryService } from "../application/volume-query.service";

@Controller()
export class PoolStatsController {
  constructor(private readonly queryService: VolumeQueryService) {}

  @Get("pools")
  getPools() {
    return this.queryService.getPoolStats();
  }

  @Get("protocol/stats")
  getProtocolStats() {
    return this.queryService.getProtocolStats();
  }

  @Get("volumes")
  getVolumes() {
    return this.queryService.getVolumeDetails();
  }
}
