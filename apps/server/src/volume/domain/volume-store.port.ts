import { HourlyVolumeRecord, VolumeCursorRecord } from "./volume.types";

export abstract class VolumeStorePort {
  abstract upsertHourlyVolume(record: HourlyVolumeRecord): void;
  abstract getCursor(chainId: number): VolumeCursorRecord | undefined;
  abstract setCursor(cursor: VolumeCursorRecord): void;
  abstract cleanup(chainId: number, beforeHourBucket: string): number;
  abstract getHourlyVolumes(
    chainId: number,
    poolAddresses: string[],
    sinceHourBucket: string,
  ): HourlyVolumeRecord[];
  abstract resetAll(chainId: number): void;
  abstract runInTransaction(fn: () => void): void;
}
