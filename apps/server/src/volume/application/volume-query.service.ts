import { Injectable } from "@nestjs/common";
import { formatUnits } from "viem";
import { CHAIN_ID, TOKEN_INFO } from "@snowball/core/src/config/addresses";
import { DEX_POOLS } from "@snowball/core/src/config/pools";
import { VolumeStorePort } from "../domain/volume-store.port";
import { HourlyVolumeRecord } from "../domain/volume.types";
import { PoolTvlStorePort } from "../../pool/domain/pool-tvl-store.port";
import type { PoolStats, PoolStatsResponse, ProtocolStatsResponse, VolumeDetailResponse } from "@snowball/core/src/volume/types";

function getHourBucketNHoursAgo(hours: number): string {
  const d = new Date(Date.now() - hours * 3600_000);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  const h = String(d.getUTCHours()).padStart(2, "0");
  return `${y}${m}${day}${h}`;
}

@Injectable()
export class VolumeQueryService {
  constructor(
    private readonly volumeStore: VolumeStorePort,
    private readonly tvlStore: PoolTvlStorePort,
  ) {}

  getPoolStats(): PoolStatsResponse {
    const since = getHourBucketNHoursAgo(24);
    const poolAddresses = DEX_POOLS.map((p) => p.poolAddress.toLowerCase());
    const hourlyVolumes = this.volumeStore.getHourlyVolumes(
      CHAIN_ID,
      poolAddresses,
      since,
    );

    const data: PoolStats[] = DEX_POOLS.map((pool) => {
      const poolAddr = pool.poolAddress.toLowerCase();
      const poolVolumes = hourlyVolumes.filter(
        (v) => v.poolAddress === poolAddr,
      );
      const tvl = this.tvlStore.getByPool(CHAIN_ID, poolAddr);
      const tvlUsd = tvl?.tvlUsd ?? 0;

      const { volume24hUsd, fees24hUsd, swapCount24h } =
        this.computePoolMetrics(pool, poolVolumes);

      const feeApr =
        tvlUsd > 0 ? (fees24hUsd * 365) / tvlUsd : null;

      return {
        poolAddress: pool.poolAddress,
        name: pool.name,
        token0: pool.token0,
        token1: pool.token1,
        fee: pool.fee,
        tvlUsd,
        volume24hUsd,
        fees24hUsd,
        feeApr,
        swapCount24h,
      };
    });

    return {
      data,
      lastUpdated: new Date().toISOString(),
      count: data.length,
    };
  }

  getProtocolStats(): ProtocolStatsResponse {
    const poolStats = this.getPoolStats();
    return {
      data: {
        tvlUsd: poolStats.data.reduce((s, p) => s + p.tvlUsd, 0),
        volume24hUsd: poolStats.data.reduce((s, p) => s + p.volume24hUsd, 0),
        fees24hUsd: poolStats.data.reduce((s, p) => s + p.fees24hUsd, 0),
        totalPools: poolStats.data.length,
      },
      lastUpdated: poolStats.lastUpdated,
    };
  }

  getVolumeDetails(): VolumeDetailResponse {
    const poolStats = this.getPoolStats();
    const cursor = this.volumeStore.getCursor(CHAIN_ID);

    return {
      data: poolStats.data.map((p) => ({
        poolAddress: p.poolAddress,
        volume24hUsd: p.volume24hUsd,
        fees24hUsd: p.fees24hUsd,
        feeApr: p.feeApr,
        swapCount24h: p.swapCount24h,
      })),
      lastSyncBlock: cursor
        ? { [String(CHAIN_ID)]: cursor.lastProcessedBlock }
        : {},
      count: poolStats.data.length,
    };
  }

  private computePoolMetrics(
    pool: (typeof DEX_POOLS)[number],
    hourlyVolumes: HourlyVolumeRecord[],
  ): { volume24hUsd: number; fees24hUsd: number; swapCount24h: number } {
    const token0Info =
      TOKEN_INFO[pool.token0.toLowerCase()] || TOKEN_INFO[pool.token0];
    const token1Info =
      TOKEN_INFO[pool.token1.toLowerCase()] || TOKEN_INFO[pool.token1];
    const price0 = token0Info?.mockPriceUsd ?? 1;
    const price1 = token1Info?.mockPriceUsd ?? 1;
    const decimals0 = token0Info?.decimals ?? 18;
    const decimals1 = token1Info?.decimals ?? 18;
    const feeRate = pool.fee / 1_000_000; // 3000 → 0.003

    let volume24hUsd = 0;
    let swapCount24h = 0;

    // Per-hour-bucket max: for each bucket, max(token0_usd, token1_usd)
    for (const hv of hourlyVolumes) {
      const vol0Usd =
        Number(formatUnits(BigInt(hv.volumeToken0Raw), decimals0)) * price0;
      const vol1Usd =
        Number(formatUnits(BigInt(hv.volumeToken1Raw), decimals1)) * price1;
      volume24hUsd += Math.max(vol0Usd, vol1Usd);
      swapCount24h += hv.swapCount;
    }

    const fees24hUsd = volume24hUsd * feeRate;

    return { volume24hUsd, fees24hUsd, swapCount24h };
  }
}
