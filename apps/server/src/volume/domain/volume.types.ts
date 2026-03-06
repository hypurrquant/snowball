export interface SwapLogEntry {
  poolAddress: string;
  blockNumber: number;
  transactionHash: string;
  amount0: bigint;
  amount1: bigint;
}

export interface HourlyVolumeRecord {
  chainId: number;
  poolAddress: string;
  hourBucket: string; // "YYYYMMDDHH"
  volumeToken0Raw: string;
  volumeToken1Raw: string;
  swapCount: number;
  lastBlock: number;
  updatedAt: string;
}

export interface VolumeCursorRecord {
  chainId: number;
  lastProcessedBlock: number;
  lastProcessedAt: string;
}
