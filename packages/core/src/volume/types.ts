// Volume collection shared types (server + frontend)

export interface SwapLogEntry {
  poolAddress: string;
  blockNumber: number;
  transactionHash: string;
  amount0: bigint;
  amount1: bigint;
  sqrtPriceX96: bigint;
  liquidity: bigint;
  tick: number;
}

export interface HourlyVolume {
  chainId: number;
  poolAddress: string;
  hourBucket: string; // "YYYYMMDDHH" UTC
  volumeToken0Raw: string; // BigInt as string
  volumeToken1Raw: string;
  swapCount: number;
  lastBlock: number;
}

export interface VolumeCursor {
  chainId: number;
  lastProcessedBlock: number;
  lastProcessedAt: string; // ISO string
}

// API response types
export interface PoolStatsResponse {
  data: PoolStats[];
  lastUpdated: string;
  count: number;
}

export interface PoolStats {
  poolAddress: string;
  name: string;
  token0: string;
  token1: string;
  fee: number;
  tvlUsd: number;
  volume24hUsd: number;
  fees24hUsd: number;
  feeApr: number | null;
  swapCount24h: number;
}

export interface ProtocolStatsResponse {
  data: {
    tvlUsd: number;
    volume24hUsd: number;
    fees24hUsd: number;
    totalPools: number;
  };
  lastUpdated: string;
}

export interface VolumeDetailResponse {
  data: VolumeDetail[];
  lastSyncBlock: Record<string, number>;
  count: number;
}

export interface VolumeDetail {
  poolAddress: string;
  volume24hUsd: number;
  fees24hUsd: number;
  feeApr: number | null;
  swapCount24h: number;
}
