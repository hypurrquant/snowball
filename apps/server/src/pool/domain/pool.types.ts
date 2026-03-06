export interface PoolTvl {
  chainId: number;
  poolAddress: string;
  reserve0Raw: string;
  reserve1Raw: string;
  token0PriceUsd: number;
  token1PriceUsd: number;
  tvlUsd: number;
  updatedAt: string;
}
