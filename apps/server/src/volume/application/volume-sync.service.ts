import { Injectable, Logger } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import { CHAIN_ID } from "@snowball/core/src/config/addresses";
import { DEX_POOLS } from "@snowball/core/src/config/pools";
import { VolumeCollectorPort } from "../domain/volume-collector.port";
import { VolumeStorePort } from "../domain/volume-store.port";
import { HourlyVolumeRecord, SwapLogEntry } from "../domain/volume.types";

const BLOCKS_PER_24H = 14_400; // ~6s block time
const DEFAULT_MAX_BLOCKS = 600; // ~1 hour at 6s blocks — keeps chunk within single hour bucket

function getHourBucket(timestamp: number): string {
  const d = new Date(timestamp * 1000);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  const h = String(d.getUTCHours()).padStart(2, "0");
  return `${y}${m}${day}${h}`;
}

function getHourBucketNHoursAgo(hours: number): string {
  const d = new Date(Date.now() - hours * 3600_000);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  const h = String(d.getUTCHours()).padStart(2, "0");
  return `${y}${m}${day}${h}`;
}

@Injectable()
export class VolumeSyncService {
  private readonly logger = new Logger(VolumeSyncService.name);
  private isSyncing = false;
  private readonly maxBlocksPerCall: number;
  private readonly poolAddresses: string[];

  constructor(
    private readonly collector: VolumeCollectorPort,
    private readonly store: VolumeStorePort,
  ) {
    this.maxBlocksPerCall = Math.min(
      Number(process.env.MAX_BLOCKS_PER_CALL) || DEFAULT_MAX_BLOCKS,
      DEFAULT_MAX_BLOCKS,
    );
    this.poolAddresses = DEX_POOLS.map((p) => p.poolAddress.toLowerCase());
  }

  @Cron("*/60 * * * * *") // every 60 seconds
  async sync() {
    if (this.isSyncing) {
      this.logger.warn("already syncing, skipped");
      return;
    }
    this.isSyncing = true;
    try {
      await this.doSync();
    } catch (err) {
      this.logger.error(`Sync failed: ${err}`);
    } finally {
      this.isSyncing = false;
    }
  }

  private async doSync() {
    const latestBlock = await this.collector.getLatestBlockNumber();
    const cursor = this.store.getCursor(CHAIN_ID);

    // Testnet reset detection
    if (cursor && latestBlock < cursor.lastProcessedBlock) {
      this.logger.warn(
        `Testnet reset detected: latest=${latestBlock} < cursor=${cursor.lastProcessedBlock}. Resetting DB.`,
      );
      this.store.resetAll(CHAIN_ID);
    }

    let fromBlock: number;
    if (!cursor || latestBlock < (cursor?.lastProcessedBlock ?? 0)) {
      fromBlock = Math.max(0, latestBlock - BLOCKS_PER_24H);
      this.logger.log(`Cold start: syncing from block ${fromBlock}`);
    } else {
      fromBlock = cursor.lastProcessedBlock + 1;
      this.logger.log(`Syncing from block ${fromBlock}`);
    }

    if (fromBlock > latestBlock) {
      this.logger.debug("Already up to date");
      return;
    }

    let currentFrom = fromBlock;
    while (currentFrom <= latestBlock) {
      const currentTo = Math.min(
        currentFrom + this.maxBlocksPerCall - 1,
        latestBlock,
      );
      const logs = await this.fetchWithRetry(
        this.poolAddresses,
        currentFrom,
        currentTo,
      );

      const cursorRecord = {
        chainId: CHAIN_ID,
        lastProcessedBlock: currentTo,
        lastProcessedAt: new Date().toISOString(),
      };

      if (logs.length > 0) {
        const aggregated = await this.aggregateLogs(logs, currentFrom, currentTo);
        this.store.runInTransaction(() => {
          for (const record of aggregated) {
            this.store.upsertHourlyVolume(record);
          }
          this.store.setCursor(cursorRecord);
        });
      } else {
        this.store.setCursor(cursorRecord);
      }

      currentFrom = currentTo + 1;
    }

    // Cleanup 48h+ old records
    const cutoff = getHourBucketNHoursAgo(48);
    const deleted = this.store.cleanup(CHAIN_ID, cutoff);
    if (deleted > 0) {
      this.logger.log(`Cleaned up ${deleted} records older than 48h`);
    }
  }

  private async fetchWithRetry(
    poolAddresses: string[],
    from: number,
    to: number,
  ): Promise<SwapLogEntry[]> {
    try {
      return await this.collector.fetchSwapLogs(
        poolAddresses,
        BigInt(from),
        BigInt(to),
      );
    } catch (err: any) {
      const range = to - from;
      if (range <= 1) throw err;

      this.logger.warn(
        `getLogs failed for range ${from}-${to}, splitting in half`,
      );
      const mid = from + Math.floor(range / 2);
      const [left, right] = await Promise.all([
        this.fetchWithRetry(poolAddresses, from, mid),
        this.fetchWithRetry(poolAddresses, mid + 1, to),
      ]);
      return [...left, ...right];
    }
  }

  private async aggregateLogs(
    logs: SwapLogEntry[],
    fromBlock: number,
    toBlock: number,
  ): Promise<HourlyVolumeRecord[]> {
    // Get timestamp for middle block (approximate — chunk is ≤600 blocks ≈ 1 hour)
    const midBlock = Math.floor((fromBlock + toBlock) / 2);
    const timestamp = await this.collector.getBlockTimestamp(BigInt(midBlock));
    const hourBucket = getHourBucket(timestamp);

    // Aggregate by pool
    const byPool = new Map<
      string,
      { vol0: bigint; vol1: bigint; count: number; lastBlock: number }
    >();

    for (const log of logs) {
      const key = log.poolAddress;
      const existing = byPool.get(key) || {
        vol0: 0n,
        vol1: 0n,
        count: 0,
        lastBlock: 0,
      };
      existing.vol0 += log.amount0 < 0n ? -log.amount0 : log.amount0;
      existing.vol1 += log.amount1 < 0n ? -log.amount1 : log.amount1;
      existing.count += 1;
      existing.lastBlock = Math.max(existing.lastBlock, log.blockNumber);
      byPool.set(key, existing);
    }

    const now = new Date().toISOString();
    const records: HourlyVolumeRecord[] = [];
    for (const [poolAddress, agg] of byPool) {
      records.push({
        chainId: CHAIN_ID,
        poolAddress,
        hourBucket,
        volumeToken0Raw: agg.vol0.toString(),
        volumeToken1Raw: agg.vol1.toString(),
        swapCount: agg.count,
        lastBlock: agg.lastBlock,
        updatedAt: now,
      });
    }
    return records;
  }
}
