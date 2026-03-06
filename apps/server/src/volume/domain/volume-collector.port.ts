import { SwapLogEntry } from "./volume.types";

export abstract class VolumeCollectorPort {
  abstract fetchSwapLogs(
    poolAddresses: string[],
    fromBlock: bigint,
    toBlock: bigint,
  ): Promise<SwapLogEntry[]>;

  abstract getLatestBlockNumber(): Promise<number>;

  abstract getBlockTimestamp(blockNumber: bigint): Promise<number>;
}
