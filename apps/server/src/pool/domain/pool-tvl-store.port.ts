import { PoolTvl } from "./pool.types";

export abstract class PoolTvlStorePort {
  abstract upsert(tvl: PoolTvl): void;
  abstract getAll(chainId: number): PoolTvl[];
  abstract getByPool(chainId: number, poolAddress: string): PoolTvl | undefined;
}
