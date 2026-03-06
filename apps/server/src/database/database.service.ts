import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from "@nestjs/common";
import Database from "better-sqlite3";
import * as path from "path";

@Injectable()
export class DatabaseService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DatabaseService.name);
  private db: Database.Database;

  get instance(): Database.Database {
    return this.db;
  }

  onModuleInit() {
    const dbPath = path.resolve(process.cwd(), "data", "snowball.db");
    this.db = new Database(dbPath);
    this.db.pragma("journal_mode = WAL");
    this.db.pragma("busy_timeout = 5000");
    this.logger.log(`SQLite connected: ${dbPath}`);
    this.migrate();
  }

  onModuleDestroy() {
    this.db?.close();
    this.logger.log("SQLite connection closed");
  }

  private migrate() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS hourly_volume (
        chain_id INTEGER NOT NULL,
        pool_address TEXT NOT NULL,
        hour_bucket TEXT NOT NULL,
        volume_token0_raw TEXT NOT NULL DEFAULT '0',
        volume_token1_raw TEXT NOT NULL DEFAULT '0',
        swap_count INTEGER NOT NULL DEFAULT 0,
        last_block INTEGER NOT NULL DEFAULT 0,
        updated_at TEXT NOT NULL,
        PRIMARY KEY (chain_id, pool_address, hour_bucket)
      );

      CREATE TABLE IF NOT EXISTS volume_cursors (
        chain_id INTEGER PRIMARY KEY,
        last_processed_block INTEGER NOT NULL,
        last_processed_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS pool_tvl (
        chain_id INTEGER NOT NULL,
        pool_address TEXT NOT NULL,
        reserve0_raw TEXT NOT NULL DEFAULT '0',
        reserve1_raw TEXT NOT NULL DEFAULT '0',
        token0_price_usd REAL,
        token1_price_usd REAL,
        tvl_usd REAL NOT NULL DEFAULT 0,
        updated_at TEXT NOT NULL,
        PRIMARY KEY (chain_id, pool_address)
      );
    `);
    this.logger.log("Database migration complete");
  }
}
