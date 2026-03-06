import { Module } from "@nestjs/common";
import { PoolTvlService } from "./application/pool-tvl.service";
import { PoolTvlStorePort } from "./domain/pool-tvl-store.port";
import { SqlitePoolTvlStoreAdapter } from "./infrastructure/sqlite-pool-tvl-store.adapter";

@Module({
  providers: [
    PoolTvlService,
    { provide: PoolTvlStorePort, useClass: SqlitePoolTvlStoreAdapter },
  ],
  exports: [PoolTvlStorePort],
})
export class PoolModule {}
