import { Injectable, ConflictException } from "@nestjs/common";
import { AgentRuntime } from "@snowball/agent-runtime";
import type { AgentManifest, RunResult } from "@snowball/agent-runtime";
import * as fs from "fs";
import * as path from "path";

@Injectable()
export class AgentService {
  private runtime = new AgentRuntime();
  private runHistory: RunResult[] = [];
  private activeRuns = new Set<string>(); // "user:manifestId"

  private manifests: Map<string, AgentManifest> = new Map();
  private startTime = Date.now();
  private lastRunTime: number | null = null;

  constructor() {
    this.loadManifests();
  }

  private loadManifests(): void {
    // Resolve agent-runtime package root via require.resolve, then find manifests/
    let manifestDir: string;
    try {
      const runtimeEntry = require.resolve("@snowball/agent-runtime");
      manifestDir = path.resolve(path.dirname(runtimeEntry), "../../manifests");
    } catch {
      // Fallback: relative from project root
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
      console.warn("[AgentService] Failed to load manifests from", manifestDir);
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

    this.activeRuns.add(lockKey);
    try {
      const manifest = this.manifests.get(manifestId);
      if (!manifest) {
        throw new Error(`Manifest not found: ${manifestId}`);
      }

      // Not used by runtime directly, but available if needed
      const manifestFile = `${manifestId.replace(/[^a-zA-Z0-9-]/g, "_")}.json`;
      try {
        const runtimeEntry = require.resolve("@snowball/agent-runtime");
        process.env.MANIFEST_PATH = path.resolve(path.dirname(runtimeEntry), "../../manifests", manifestFile);
      } catch {
        // skip if resolution fails
      }

      const result = await this.runtime.run(manifest, user, troveId);
      this.runHistory.unshift(result);
      this.lastRunTime = Date.now();

      // Keep last 100 runs
      if (this.runHistory.length > 100) {
        this.runHistory = this.runHistory.slice(0, 100);
      }

      return result;
    } finally {
      this.activeRuns.delete(lockKey);
    }
  }

  getRuns(user?: string, limit = 20): RunResult[] {
    let results = this.runHistory;
    if (user) {
      results = results.filter((r) => r.user.toLowerCase() === user.toLowerCase());
    }
    return results.slice(0, limit);
  }

  getRun(runId: string): RunResult | undefined {
    return this.runHistory.find((r) => r.runId === runId);
  }

  getStatus() {
    return {
      uptime: Date.now() - this.startTime,
      lastRun: this.lastRunTime,
      registeredAgents: this.manifests.size,
      totalRuns: this.runHistory.length,
    };
  }
}
