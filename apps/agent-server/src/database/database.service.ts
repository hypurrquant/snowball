import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from "@nestjs/common";
import Database from "better-sqlite3";
import * as path from "path";
import * as fs from "fs";

@Injectable()
export class DatabaseService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DatabaseService.name);
  private db!: Database.Database;

  get instance(): Database.Database {
    return this.db;
  }

  onModuleInit() {
    const dataDir = path.resolve(process.cwd(), "data");
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    const dbPath = path.join(dataDir, "agent.db");
    this.db = new Database(dbPath);
    this.db.pragma("journal_mode = WAL");
    this.db.pragma("busy_timeout = 5000");
    this.logger.log(`SQLite connected: ${dbPath}`);

    this.migrate();
    this.crashRecovery();
  }

  onModuleDestroy() {
    this.db?.close();
    this.logger.log("SQLite connection closed");
  }

  private migrate() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS agent_runs (
        run_id TEXT PRIMARY KEY,
        user TEXT NOT NULL,
        manifest_id TEXT NOT NULL,
        status TEXT NOT NULL,
        result_json TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE INDEX IF NOT EXISTS idx_agent_runs_user ON agent_runs(user);
      CREATE INDEX IF NOT EXISTS idx_agent_runs_status ON agent_runs(status);
    `);
    this.logger.log("Database migration complete");
  }

  private crashRecovery() {
    const stmt = this.db.prepare(
      `UPDATE agent_runs SET status = 'error', updated_at = datetime('now') WHERE status = 'started'`
    );
    const result = stmt.run();
    if (result.changes > 0) {
      this.logger.warn(`Crash recovery: ${result.changes} started runs marked as error`);
    }
  }
}
