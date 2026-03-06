import { Injectable } from "@nestjs/common";
import { DatabaseService } from "../../database/database.service";
import { PoolTvlStorePort } from "../domain/pool-tvl-store.port";
import { PoolTvl } from "../domain/pool.types";

@Injectable()
export class SqlitePoolTvlStoreAdapter extends PoolTvlStorePort {
  constructor(private readonly db: DatabaseService) {
    super();
  }

  upsert(tvl: PoolTvl): void {
    const stmt = this.db.instance.prepare(`
      INSERT INTO pool_tvl (chain_id, pool_address, reserve0_raw, reserve1_raw, token0_price_usd, token1_price_usd, tvl_usd, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(chain_id, pool_address) DO UPDATE SET
        reserve0_raw = excluded.reserve0_raw,
        reserve1_raw = excluded.reserve1_raw,
        token0_price_usd = excluded.token0_price_usd,
        token1_price_usd = excluded.token1_price_usd,
        tvl_usd = excluded.tvl_usd,
        updated_at = excluded.updated_at
    `);
    stmt.run(
      tvl.chainId,
      tvl.poolAddress.toLowerCase(),
      tvl.reserve0Raw,
      tvl.reserve1Raw,
      tvl.token0PriceUsd,
      tvl.token1PriceUsd,
      tvl.tvlUsd,
      tvl.updatedAt,
    );
  }

  getAll(chainId: number): PoolTvl[] {
    const rows = this.db.instance.prepare(
      "SELECT * FROM pool_tvl WHERE chain_id = ?",
    ).all(chainId) as any[];
    return rows.map(this.toPoolTvl);
  }

  getByPool(chainId: number, poolAddress: string): PoolTvl | undefined {
    const row = this.db.instance.prepare(
      "SELECT * FROM pool_tvl WHERE chain_id = ? AND pool_address = ?",
    ).get(chainId, poolAddress.toLowerCase()) as any;
    return row ? this.toPoolTvl(row) : undefined;
  }

  private toPoolTvl(row: any): PoolTvl {
    return {
      chainId: row.chain_id,
      poolAddress: row.pool_address,
      reserve0Raw: row.reserve0_raw,
      reserve1Raw: row.reserve1_raw,
      token0PriceUsd: row.token0_price_usd,
      token1PriceUsd: row.token1_price_usd,
      tvlUsd: row.tvl_usd,
      updatedAt: row.updated_at,
    };
  }
}
