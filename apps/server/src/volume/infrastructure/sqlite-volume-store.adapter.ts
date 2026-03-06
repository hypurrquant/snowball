import { Injectable } from "@nestjs/common";
import { DatabaseService } from "../../database/database.service";
import { VolumeStorePort } from "../domain/volume-store.port";
import { HourlyVolumeRecord, VolumeCursorRecord } from "../domain/volume.types";

@Injectable()
export class SqliteVolumeStoreAdapter extends VolumeStorePort {
  constructor(private readonly db: DatabaseService) {
    super();
  }

  upsertHourlyVolume(record: HourlyVolumeRecord): void {
    const existing = this.db.instance.prepare(
      "SELECT volume_token0_raw, volume_token1_raw, swap_count FROM hourly_volume WHERE chain_id = ? AND pool_address = ? AND hour_bucket = ?",
    ).get(record.chainId, record.poolAddress.toLowerCase(), record.hourBucket) as any;

    if (existing) {
      const vol0 = (BigInt(existing.volume_token0_raw) + BigInt(record.volumeToken0Raw)).toString();
      const vol1 = (BigInt(existing.volume_token1_raw) + BigInt(record.volumeToken1Raw)).toString();
      this.db.instance.prepare(`
        UPDATE hourly_volume SET
          volume_token0_raw = ?, volume_token1_raw = ?,
          swap_count = swap_count + ?, last_block = MAX(last_block, ?), updated_at = ?
        WHERE chain_id = ? AND pool_address = ? AND hour_bucket = ?
      `).run(vol0, vol1, record.swapCount, record.lastBlock, record.updatedAt,
        record.chainId, record.poolAddress.toLowerCase(), record.hourBucket);
    } else {
      this.db.instance.prepare(`
        INSERT INTO hourly_volume (chain_id, pool_address, hour_bucket, volume_token0_raw, volume_token1_raw, swap_count, last_block, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(record.chainId, record.poolAddress.toLowerCase(), record.hourBucket,
        record.volumeToken0Raw, record.volumeToken1Raw, record.swapCount, record.lastBlock, record.updatedAt);
    }
  }

  getCursor(chainId: number): VolumeCursorRecord | undefined {
    const row = this.db.instance.prepare(
      "SELECT * FROM volume_cursors WHERE chain_id = ?",
    ).get(chainId) as any;
    if (!row) return undefined;
    return {
      chainId: row.chain_id,
      lastProcessedBlock: row.last_processed_block,
      lastProcessedAt: row.last_processed_at,
    };
  }

  setCursor(cursor: VolumeCursorRecord): void {
    this.db.instance.prepare(`
      INSERT INTO volume_cursors (chain_id, last_processed_block, last_processed_at)
      VALUES (?, ?, ?)
      ON CONFLICT(chain_id) DO UPDATE SET
        last_processed_block = excluded.last_processed_block,
        last_processed_at = excluded.last_processed_at
    `).run(cursor.chainId, cursor.lastProcessedBlock, cursor.lastProcessedAt);
  }

  cleanup(chainId: number, beforeHourBucket: string): number {
    const result = this.db.instance.prepare(
      "DELETE FROM hourly_volume WHERE chain_id = ? AND hour_bucket < ?",
    ).run(chainId, beforeHourBucket);
    return result.changes;
  }

  getHourlyVolumes(
    chainId: number,
    poolAddresses: string[],
    sinceHourBucket: string,
  ): HourlyVolumeRecord[] {
    const placeholders = poolAddresses.map(() => "?").join(",");
    const rows = this.db.instance.prepare(`
      SELECT * FROM hourly_volume
      WHERE chain_id = ? AND pool_address IN (${placeholders}) AND hour_bucket >= ?
    `).all(chainId, ...poolAddresses.map((a) => a.toLowerCase()), sinceHourBucket) as any[];
    return rows.map((row) => ({
      chainId: row.chain_id,
      poolAddress: row.pool_address,
      hourBucket: row.hour_bucket,
      volumeToken0Raw: row.volume_token0_raw,
      volumeToken1Raw: row.volume_token1_raw,
      swapCount: row.swap_count,
      lastBlock: row.last_block,
      updatedAt: row.updated_at,
    }));
  }

  runInTransaction(fn: () => void): void {
    this.db.instance.transaction(fn)();
  }

  resetAll(chainId: number): void {
    const tx = this.db.instance.transaction(() => {
      this.db.instance.prepare("DELETE FROM hourly_volume WHERE chain_id = ?").run(chainId);
      this.db.instance.prepare("DELETE FROM volume_cursors WHERE chain_id = ?").run(chainId);
      this.db.instance.prepare("DELETE FROM pool_tvl WHERE chain_id = ?").run(chainId);
    });
    tx();
  }
}
