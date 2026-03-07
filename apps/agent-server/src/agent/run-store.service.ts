import { Injectable, Logger } from "@nestjs/common";
import { DatabaseService } from "../database/database.service";
import type { RunResult } from "@snowball/agent-runtime";

function bigintReplacer(_key: string, value: unknown): unknown {
  return typeof value === "bigint" ? value.toString() : value;
}

interface RunRow {
  run_id: string;
  user: string;
  manifest_id: string;
  status: string;
  result_json: string | null;
  created_at: string;
  updated_at: string;
}

@Injectable()
export class RunStoreService {
  private readonly logger = new Logger(RunStoreService.name);

  constructor(private readonly db: DatabaseService) {}

  insertStarted(runId: string, user: string, manifestId: string): void {
    this.db.instance
      .prepare(
        `INSERT INTO agent_runs (run_id, user, manifest_id, status) VALUES (?, ?, ?, 'started')`
      )
      .run(runId, user.toLowerCase(), manifestId);
  }

  updateTerminal(runId: string, result: RunResult): void {
    const json = JSON.stringify(result, bigintReplacer);
    this.db.instance
      .prepare(
        `UPDATE agent_runs SET status = ?, result_json = ?, updated_at = datetime('now') WHERE run_id = ?`
      )
      .run(result.status, json, runId);
  }

  updateError(runId: string): void {
    this.db.instance
      .prepare(
        `UPDATE agent_runs SET status = 'error', updated_at = datetime('now') WHERE run_id = ?`
      )
      .run(runId);
  }

  findByUser(user?: string, limit = 20): RunResult[] {
    let rows: RunRow[];
    if (user) {
      rows = this.db.instance
        .prepare(
          `SELECT * FROM agent_runs WHERE user = ? ORDER BY created_at DESC LIMIT ?`
        )
        .all(user.toLowerCase(), limit) as RunRow[];
    } else {
      rows = this.db.instance
        .prepare(`SELECT * FROM agent_runs ORDER BY created_at DESC LIMIT ?`)
        .all(limit) as RunRow[];
    }
    return rows.map((row) => this.rowToResult(row));
  }

  count(): number {
    const row = this.db.instance
      .prepare("SELECT COUNT(*) as count FROM agent_runs")
      .get() as { count: number };
    return row.count;
  }

  findById(runId: string): RunResult | undefined {
    const row = this.db.instance
      .prepare(`SELECT * FROM agent_runs WHERE run_id = ?`)
      .get(runId) as RunRow | undefined;
    return row ? this.rowToResult(row) : undefined;
  }

  private rowToResult(row: RunRow): RunResult {
    // started → error mapping (E4)
    const mappedStatus = row.status === "started" ? "error" : row.status;

    if (row.result_json) {
      const parsed = JSON.parse(row.result_json) as RunResult;
      return { ...parsed, status: mappedStatus as RunResult["status"] };
    }

    // For started records that never got a result (crash recovery)
    return {
      runId: row.run_id,
      status: mappedStatus as RunResult["status"],
      plan: null,
      txHashes: [],
      logs: [],
      errors: ["Run did not complete (server crash or timeout)"],
      timestamp: new Date(row.created_at).getTime(),
      user: row.user as `0x${string}`,
      manifestId: row.manifest_id,
    };
  }
}
