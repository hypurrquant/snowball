import { Module } from "@nestjs/common";
import { PoolModule } from "../pool/pool.module";
import { VolumeSyncService } from "./application/volume-sync.service";
import { VolumeQueryService } from "./application/volume-query.service";
import { VolumeCollectorPort } from "./domain/volume-collector.port";
import { VolumeStorePort } from "./domain/volume-store.port";
import { RpcVolumeCollectorAdapter } from "./infrastructure/rpc-volume-collector.adapter";
import { SqliteVolumeStoreAdapter } from "./infrastructure/sqlite-volume-store.adapter";
import { PoolStatsController } from "./infrastructure/pool-stats.controller";

@Module({
  imports: [PoolModule],
  controllers: [PoolStatsController],
  providers: [
    VolumeSyncService,
    VolumeQueryService,
    { provide: VolumeCollectorPort, useClass: RpcVolumeCollectorAdapter },
    { provide: VolumeStorePort, useClass: SqliteVolumeStoreAdapter },
  ],
})
export class VolumeModule {}
