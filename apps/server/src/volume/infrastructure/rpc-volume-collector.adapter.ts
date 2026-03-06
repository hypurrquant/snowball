import { Injectable, Logger } from "@nestjs/common";
import { createPublicClient, http, parseAbiItem } from "viem";
import { RPC_URL } from "@snowball/core/src/config/addresses";
import { VolumeCollectorPort } from "../domain/volume-collector.port";
import { SwapLogEntry } from "../domain/volume.types";

const SWAP_EVENT = parseAbiItem(
  "event Swap(address indexed sender, address indexed recipient, int256 amount0, int256 amount1, uint160 sqrtPriceX96, uint128 liquidity, int24 tick)",
);

@Injectable()
export class RpcVolumeCollectorAdapter extends VolumeCollectorPort {
  private readonly logger = new Logger(RpcVolumeCollectorAdapter.name);
  private readonly client = createPublicClient({
    transport: http(RPC_URL),
  });

  async fetchSwapLogs(
    poolAddresses: string[],
    fromBlock: bigint,
    toBlock: bigint,
  ): Promise<SwapLogEntry[]> {
    const logs = await this.client.getLogs({
      address: poolAddresses as `0x${string}`[],
      event: SWAP_EVENT,
      fromBlock,
      toBlock,
    });

    return logs.map((log) => ({
      poolAddress: log.address.toLowerCase(),
      blockNumber: Number(log.blockNumber),
      transactionHash: log.transactionHash,
      amount0: log.args.amount0!,
      amount1: log.args.amount1!,
    }));
  }

  async getLatestBlockNumber(): Promise<number> {
    const block = await this.client.getBlockNumber();
    return Number(block);
  }

  async getBlockTimestamp(blockNumber: bigint): Promise<number> {
    const block = await this.client.getBlock({ blockNumber });
    return Number(block.timestamp);
  }
}
