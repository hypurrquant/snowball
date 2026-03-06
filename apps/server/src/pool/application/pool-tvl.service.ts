import { Injectable, Logger } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import { createPublicClient, http, formatUnits } from "viem";
import { CHAIN_ID, RPC_URL, TOKEN_INFO } from "@snowball/core/src/config/addresses";
import { DEX_POOLS } from "@snowball/core/src/config/pools";
import { MockERC20ABI } from "@snowball/core/src/abis/dex";
import { PoolTvlStorePort } from "../domain/pool-tvl-store.port";

@Injectable()
export class PoolTvlService {
  private readonly logger = new Logger(PoolTvlService.name);
  private isSyncing = false;
  private readonly client = createPublicClient({
    transport: http(RPC_URL),
  });

  constructor(private readonly store: PoolTvlStorePort) {}

  @Cron("0 */5 * * * *") // every 5 minutes
  async syncAll() {
    if (this.isSyncing) {
      this.logger.warn("TVL sync already running, skipped");
      return;
    }
    this.isSyncing = true;
    try {
      for (const pool of DEX_POOLS) {
        await this.syncPool(pool);
      }
      this.logger.log(`TVL synced for ${DEX_POOLS.length} pools`);
    } catch (err) {
      this.logger.error(`TVL sync failed: ${err}`);
    } finally {
      this.isSyncing = false;
    }
  }

  private async syncPool(pool: typeof DEX_POOLS[number]) {
    const [balance0, balance1] = await Promise.all([
      this.client.readContract({
        address: pool.token0,
        abi: MockERC20ABI,
        functionName: "balanceOf",
        args: [pool.poolAddress],
      }),
      this.client.readContract({
        address: pool.token1,
        abi: MockERC20ABI,
        functionName: "balanceOf",
        args: [pool.poolAddress],
      }),
    ]);

    const token0Info = TOKEN_INFO[pool.token0.toLowerCase()] || TOKEN_INFO[pool.token0];
    const token1Info = TOKEN_INFO[pool.token1.toLowerCase()] || TOKEN_INFO[pool.token1];
    const decimals0 = token0Info?.decimals ?? 18;
    const decimals1 = token1Info?.decimals ?? 18;
    const price0 = token0Info?.mockPriceUsd ?? 1;
    const price1 = token1Info?.mockPriceUsd ?? 1;

    const amount0 = Number(formatUnits(balance0, decimals0));
    const amount1 = Number(formatUnits(balance1, decimals1));
    const tvlUsd = amount0 * price0 + amount1 * price1;

    this.store.upsert({
      chainId: CHAIN_ID,
      poolAddress: pool.poolAddress,
      reserve0Raw: balance0.toString(),
      reserve1Raw: balance1.toString(),
      token0PriceUsd: price0,
      token1PriceUsd: price1,
      tvlUsd,
      updatedAt: new Date().toISOString(),
    });
  }
}
