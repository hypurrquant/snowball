import { Injectable, Inject, ConflictException, InternalServerErrorException, Logger } from "@nestjs/common";
import { AgentRuntime } from "@snowball/agent-runtime";
import type { AgentManifest, RunResult } from "@snowball/agent-runtime";
import { RunStoreService } from "./run-store.service";
import { randomUUID } from "crypto";
import * as fs from "fs";
import * as path from "path";

@Injectable()
export class AgentService {
  private readonly logger = new Logger(AgentService.name);
  private activeRuns = new Set<string>(); // "user:manifestId"

  private manifests: Map<string, AgentManifest> = new Map();
  private startTime = Date.now();
  private lastRunTime: number | null = null;

  constructor(
    @Inject("AGENT_RUNTIME") private readonly runtime: AgentRuntime,
    private readonly runStore: RunStoreService,
  ) {
    this.loadManifests();
  }

  private loadManifests(): void {
    let manifestDir: string;
    try {
      const runtimeEntry = require.resolve("@snowball/agent-runtime");
      manifestDir = path.resolve(path.dirname(runtimeEntry), "../manifests");
    } catch {
      manifestDir = path.resolve(__dirname, "../../../../packages/agent-runtime/manifests");
    }

    try {
      const files = fs.readdirSync(manifestDir).filter((f) => f.endsWith(".json"));
      for (const file of files) {
        const manifest: AgentManifest = JSON.parse(
          fs.readFileSync(path.join(manifestDir, file), "utf-8")
        );
        this.manifests.set(manifest.id, manifest);
      }
    } catch {
      this.logger.warn(`Failed to load manifests from ${manifestDir}`);
    }
  }

  getManifest(id: string): AgentManifest | undefined {
    return this.manifests.get(id);
  }

  getManifests(): AgentManifest[] {
    return Array.from(this.manifests.values());
  }

  async runAgent(user: `0x${string}`, manifestId: string, troveId: bigint = 0n): Promise<RunResult> {
    const lockKey = `${user.toLowerCase()}:${manifestId}`;
    if (this.activeRuns.has(lockKey)) {
      throw new ConflictException("Agent is already running for this user and manifest");
    }

    const runId = randomUUID();

    // Phase 1: pre-insert started record (E1: fail → 500, runtime not called)
    try {
      this.runStore.insertStarted(runId, user, manifestId);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(`Phase 1 DB insert failed: ${message}`);
      throw new InternalServerErrorException("Failed to initialize run record");
    }

    this.activeRuns.add(lockKey);
    try {
      const manifest = this.manifests.get(manifestId);
      if (!manifest) {
        throw new Error(`Manifest not found: ${manifestId}`);
      }

      try {
        process.env.MANIFEST_PATH = undefined;
        const runtimeEntry = require.resolve("@snowball/agent-runtime");
        const manifestFile = `${manifestId.replace(/[^a-zA-Z0-9-]/g, "_")}.json`;
        process.env.MANIFEST_PATH = path.resolve(path.dirname(runtimeEntry), "../../manifests", manifestFile);
      } catch {
        // skip if resolution fails
      }

      const result = await this.runtime.run(manifest, user, troveId, runId);

      // Phase 2: terminal update
      try {
        this.runStore.updateTerminal(runId, result);
      } catch (err) {
        // Fallback: mark as error (E2)
        const message = err instanceof Error ? err.message : String(err);
        this.logger.error(`Phase 2 terminal update failed: ${message}`);
        try {
          this.runStore.updateError(runId);
          // Fallback succeeded — return error status per E2
          this.lastRunTime = Date.now();
          return { ...result, status: "error" as const, errors: [...result.errors, `DB update failed: ${message}`] };
        } catch (fallbackErr) {
          // Fallback also failed — 500 per E2
          this.logger.error(`Phase 2 fallback also failed: ${fallbackErr instanceof Error ? fallbackErr.message : String(fallbackErr)}`);
          throw new InternalServerErrorException("Failed to persist run result");
        }
      }

      this.lastRunTime = Date.now();
      return result;
    } catch (err) {
      // Runtime error — try to update DB to error status
      try {
        this.runStore.updateError(runId);
      } catch {
        // already have started record, crash recovery will handle it
      }
      throw err;
    } finally {
      this.activeRuns.delete(lockKey);
    }
  }

  getRuns(user?: string, limit = 20): RunResult[] {
    return this.runStore.findByUser(user, limit);
  }

  getRun(runId: string): RunResult | undefined {
    return this.runStore.findById(runId);
  }

  getStatus() {
    return {
      uptime: Date.now() - this.startTime,
      lastRun: this.lastRunTime,
      registeredAgents: this.manifests.size,
      totalRuns: this.runStore.count(),
    };
  }
}
