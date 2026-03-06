import { Module } from "@nestjs/common";
import { ScheduleModule } from "@nestjs/schedule";
import { DatabaseModule } from "./database/database.module";
import { HealthModule } from "./health/health.module";
import { PoolModule } from "./pool/pool.module";
import { VolumeModule } from "./volume/volume.module";

@Module({
  imports: [
    ScheduleModule.forRoot(),
    DatabaseModule,
    HealthModule,
    PoolModule,
    VolumeModule,
  ],
})
export class AppModule {}
