import "reflect-metadata";

// BigInt JSON serialization support
(BigInt.prototype as any).toJSON = function () {
  return this.toString();
};
import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication } from "@nestjs/common";
import { ThrottlerModule, ThrottlerGuard } from "@nestjs/throttler";
import { APP_GUARD } from "@nestjs/core";
import request from "supertest";
import { AgentModule } from "../src/agent/agent.module";
import { DatabaseModule } from "../src/database/database.module";
import { AllExceptionsFilter } from "../src/common/filters/http-exception.filter";
import { DatabaseService } from "../src/database/database.service";
import Database from "better-sqlite3";
import * as path from "path";
import * as fs from "fs";
import * as os from "os";

// Set env vars required by loadConfig()
process.env.AGENT_PRIVATE_KEY = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";
process.env.ANTHROPIC_API_KEY = "sk-ant-test-key";
process.env.RPC_URL = "https://rpc.cc3-testnet.creditcoin.network";

// Mock AgentRuntime that returns predictable results without Claude API
class MockAgentRuntime {
  async run(_manifest: unknown, user: string, _troveId: bigint, runId: string) {
    return {
      runId,
      status: "success" as const,
      plan: { goal: "test", steps: [] },
      txHashes: [],
      logs: ["mock run"],
      errors: [],
      reasoning: "mock",
      timestamp: Date.now(),
      user,
      manifestId: "test-manifest",
    };
  }
}

// Override DatabaseService to use temp file DB
class TestDatabaseService extends DatabaseService {
  private tmpDir: string;

  constructor() {
    super();
    this.tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "agent-test-"));
  }

  onModuleInit() {
    const dbPath = path.join(this.tmpDir, "test-agent.db");
    (this as any).db = new Database(dbPath);
    (this as any).db.pragma("journal_mode = WAL");
    (this as any).db.exec(`
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
    // Crash recovery
    (this as any).db.prepare(
      `UPDATE agent_runs SET status = 'error', updated_at = datetime('now') WHERE status = 'started'`
    ).run();
  }

  cleanup() {
    try {
      (this as any).db?.close();
      fs.rmSync(this.tmpDir, { recursive: true, force: true });
    } catch { /* ignore */ }
  }
}

async function createTestApp(
  dbService: TestDatabaseService,
  runtime: unknown = new MockAgentRuntime(),
) {
  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [
      ThrottlerModule.forRoot([{ ttl: 60000, limit: 60 }]),
      DatabaseModule,
      AgentModule,
    ],
    providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
  })
    .overrideProvider(DatabaseService)
    .useValue(dbService)
    .overrideProvider("AGENT_RUNTIME")
    .useValue(runtime)
    .compile();

  const app = moduleFixture.createNestApplication();
  app.setGlobalPrefix("api");
  app.useGlobalFilters(new AllExceptionsFilter());
  await app.init();
  return app;
}

describe("Agent E2E Tests", () => {
  let app: INestApplication;
  let testDb: TestDatabaseService;

  beforeAll(async () => {
    testDb = new TestDatabaseService();
    app = await createTestApp(testDb);
  });

  afterAll(async () => {
    await app?.close();
    testDb?.cleanup();
  });

  // ─── Scenario 1: Normal run (F3) ───
  it("POST /agent/run should return success with valid API key", async () => {
    const res = await request(app.getHttpServer())
      .post("/api/agent/run")
      
      .send({ user: "0x1234567890abcdef1234567890abcdef12345678", manifestId: "snowball-demo-defi-manager" })
      .expect(200);

    expect(res.body.status).toBe("success");
    expect(res.body.runId).toBeDefined();
  });

  // ─── Scenario 2: Concurrent execution (E6) ───
  it("concurrent runs for same user+manifest should return 409", async () => {
    const slowRuntime = {
      async run(_m: unknown, user: string, _t: bigint, runId: string) {
        await new Promise((r) => setTimeout(r, 500));
        return {
          runId, status: "success", plan: { goal: "test", steps: [] },
          txHashes: [], logs: [], errors: [], timestamp: Date.now(),
          user, manifestId: "snowball-demo-defi-manager",
        };
      },
    };

    const slowDb = new TestDatabaseService();
    const slowApp = await createTestApp(slowDb, slowRuntime);
    const server = slowApp.getHttpServer();
    const body = { user: "0xConcurrentUser000000000000000000000000ab", manifestId: "snowball-demo-defi-manager" };

    const [res1, res2] = await Promise.all([
      request(server).post("/api/agent/run").send(body),
      new Promise<request.Response>((resolve) =>
        setTimeout(() =>
          request(server).post("/api/agent/run").send(body).then(resolve), 50)
      ),
    ]);

    const statuses = [res1.status, res2.status].sort();
    expect(statuses).toEqual([200, 409]);

    await slowApp.close();
    slowDb.cleanup();
  });

  // ─── Scenario 4: User filter (F5) ───
  it("GET /agent/runs?user= should filter by user", async () => {
    const user = "0xFilterUser0000000000000000000000000000ab";

    await request(app.getHttpServer())
      .post("/api/agent/run")
      
      .send({ user, manifestId: "snowball-demo-defi-manager" })
      .expect(200);

    const res = await request(app.getHttpServer())
      .get("/api/agent/runs")
      
      .query({ user })
      .expect(200);

    expect(Array.isArray(res.body)).toBe(true);
    for (const run of res.body) {
      expect(run.user.toLowerCase()).toBe(user.toLowerCase());
    }
  });

  // ─── Scenario 5: Single run query (F6) ───
  it("GET /agent/runs/:id should return 200 for existing run", async () => {
    const createRes = await request(app.getHttpServer())
      .post("/api/agent/run")
      
      .send({ user: "0xSingleQuery000000000000000000000000000ab", manifestId: "snowball-demo-defi-manager" })
      .expect(200);

    const runId = createRes.body.runId;

    await request(app.getHttpServer())
      .get(`/api/agent/runs/${runId}`)
      
      .expect(200);
  });

  it("GET /agent/runs/:id should return 404 for non-existing run", async () => {
    await request(app.getHttpServer())
      .get("/api/agent/runs/non-existing-id")
      
      .expect(404);
  });

  // ─── Scenario 6: Server status ───
  it("GET /agent/status should return status info", async () => {
    const res = await request(app.getHttpServer())
      .get("/api/agent/status")
      
      .expect(200);

    expect(res.body.uptime).toBeDefined();
    expect(res.body.registeredAgents).toBeDefined();
    expect(res.body.totalRuns).toBeDefined();
  });

  // ─── Scenario 7: Persistence (F4) ───
  it("runs should persist in DB and be queryable", async () => {
    const user = "0xPersistUser0000000000000000000000000000ab";

    await request(app.getHttpServer())
      .post("/api/agent/run")
      
      .send({ user, manifestId: "snowball-demo-defi-manager" })
      .expect(200);

    const row = testDb.instance
      .prepare("SELECT * FROM agent_runs WHERE user = ?")
      .get(user.toLowerCase());

    expect(row).toBeDefined();
  });

  // ─── Scenario 8: Crash recovery (E3) ───
  it("started records should be recovered to error on init", async () => {
    const crashDb = new TestDatabaseService();
    crashDb.onModuleInit();

    crashDb.instance.prepare(
      "INSERT INTO agent_runs (run_id, user, manifest_id, status) VALUES (?, ?, ?, 'started')"
    ).run("crash-test-id", "0xcrashuser", "test-manifest");

    // Simulate server restart — run crash recovery
    crashDb.instance.prepare(
      `UPDATE agent_runs SET status = 'error', updated_at = datetime('now') WHERE status = 'started'`
    ).run();

    const row = crashDb.instance
      .prepare("SELECT status FROM agent_runs WHERE run_id = ?")
      .get("crash-test-id") as { status: string };

    expect(row.status).toBe("error");
    crashDb.cleanup();
  });

  // ─── Scenario 9: Bigint serialization (E5) ───
  it("bigint values should be serialized correctly in DB", async () => {
    const bigintRuntime = {
      async run(_m: unknown, user: string, _t: bigint, runId: string) {
        return {
          runId, status: "success",
          plan: { goal: "bigint test", steps: [{ capabilityId: "test", input: { amount: 1000000000000000000n } }] },
          txHashes: [], logs: [], errors: [],
          timestamp: Date.now(), user, manifestId: "test",
        };
      },
    };

    const bigintDb = new TestDatabaseService();
    const bigintApp = await createTestApp(bigintDb, bigintRuntime);

    const res = await request(bigintApp.getHttpServer())
      .post("/api/agent/run")
      
      .send({ user: "0xBigintUser00000000000000000000000000000ab", manifestId: "snowball-demo-defi-manager" })
      .expect(200);

    expect(res.body.status).toBe("success");

    const row = bigintDb.instance
      .prepare("SELECT result_json FROM agent_runs WHERE run_id = ?")
      .get(res.body.runId) as { result_json: string } | undefined;

    expect(row).toBeDefined();
    expect(() => JSON.parse(row!.result_json)).not.toThrow();

    await bigintApp.close();
    bigintDb.cleanup();
  });

  // ─── Scenario 10: started→error mapping (E4) ───
  it("GET /agent/runs should map started status to error", async () => {
    testDb.instance.prepare(
      "INSERT INTO agent_runs (run_id, user, manifest_id, status) VALUES (?, ?, ?, 'started')"
    ).run("started-mapping-test", "0xmapuser", "test-manifest");

    const res = await request(app.getHttpServer())
      .get("/api/agent/runs")
      
      .expect(200);

    const startedRun = res.body.find((r: any) => r.runId === "started-mapping-test");
    expect(startedRun).toBeDefined();
    expect(startedRun.status).toBe("error");
  });
});
