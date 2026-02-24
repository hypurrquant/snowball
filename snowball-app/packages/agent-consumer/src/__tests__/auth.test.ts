import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import request from "supertest";

vi.mock("../chainReader", () => ({
  getProtocolStats: vi.fn().mockResolvedValue({
    totalCollateralUSD: "1000",
    totalBorrowedUSD: "500",
    sbUSDPrice: "1.00",
    activeAgents: 0,
  }),
  getMarkets: vi.fn().mockResolvedValue([]),
  getUserPositions: vi.fn().mockResolvedValue([]),
  getUserBalance: vi.fn(),
  getUserSPDeposits: vi.fn(),
  getAgentList: vi.fn().mockResolvedValue([]),
}));

vi.mock("../a2aClient", () => ({
  callCDPProvider: vi.fn().mockResolvedValue({
    to: "0x" + "a".repeat(40),
    data: "0x1234",
    value: "0",
    gasLimit: "500000",
    chainId: 102031,
  }),
}));

const validAddress = "0x" + "f".repeat(40);

describe("Auth Middleware", () => {
  describe("with AUTH_DISABLED=true (default test)", () => {
    let app: any;

    beforeEach(async () => {
      // AUTH_DISABLED=true is set in vitest.config.ts env
      const mod = await import("../index");
      app = mod.default;
    });

    it("allows public routes without auth", async () => {
      const res = await request(app).get("/api/protocol/stats");
      expect(res.status).toBe(200);
    });

    it("allows protected routes when AUTH_DISABLED", async () => {
      const res = await request(app)
        .post("/api/agent/execute")
        .send({
          userAddress: validAddress,
          action: "openTrove",
          params: {
            branch: 0,
            collateralAmount: "10000000000000000000",
            debtAmount: "5000000000000000000000",
            interestRate: "50000000000000000",
          },
        });
      expect(res.status).toBe(200);
    });

    it("allows agent list (public route)", async () => {
      const res = await request(app).get("/api/agents");
      expect(res.status).toBe(200);
    });
  });

  describe("with AUTH_DISABLED=false", () => {
    let app: any;
    const origAuthDisabled = process.env.AUTH_DISABLED;
    const origApiKeys = process.env.API_KEYS;

    beforeEach(async () => {
      // Need to re-import with different env
      process.env.AUTH_DISABLED = "false";
      process.env.API_KEYS = "test-key-1,test-key-2";
      // Clear module cache to pick up new env
      vi.resetModules();
      vi.mock("../chainReader", () => ({
        getProtocolStats: vi.fn().mockResolvedValue({
          totalCollateralUSD: "1000",
          totalBorrowedUSD: "500",
          sbUSDPrice: "1.00",
          activeAgents: 0,
        }),
        getMarkets: vi.fn().mockResolvedValue([]),
        getUserPositions: vi.fn().mockResolvedValue([]),
        getUserBalance: vi.fn(),
        getUserSPDeposits: vi.fn(),
        getAgentList: vi.fn().mockResolvedValue([]),
      }));
      vi.mock("../a2aClient", () => ({
        callCDPProvider: vi.fn().mockResolvedValue({
          to: "0x" + "a".repeat(40),
          data: "0x1234",
          value: "0",
          gasLimit: "500000",
          chainId: 102031,
        }),
      }));
      const mod = await import("../index");
      app = mod.default;
    });

    afterEach(() => {
      process.env.AUTH_DISABLED = origAuthDisabled;
      process.env.API_KEYS = origApiKeys;
    });

    it("allows public routes without auth", async () => {
      const res = await request(app).get("/api/protocol/stats");
      expect(res.status).toBe(200);
    });

    it("rejects protected routes without credentials", async () => {
      const res = await request(app)
        .post("/api/agent/execute")
        .send({
          userAddress: validAddress,
          action: "openTrove",
          params: { branch: 0, collateralAmount: "1", debtAmount: "1", interestRate: "1" },
        });
      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe("UNAUTHORIZED");
    });

    it("allows protected routes with valid API key", async () => {
      const res = await request(app)
        .post("/api/agent/execute")
        .set("X-API-Key", "test-key-1")
        .send({
          userAddress: validAddress,
          action: "openTrove",
          params: {
            branch: 0,
            collateralAmount: "10000000000000000000",
            debtAmount: "5000000000000000000000",
            interestRate: "50000000000000000",
          },
        });
      expect(res.status).toBe(200);
    });

    it("rejects protected routes with invalid API key", async () => {
      const res = await request(app)
        .post("/api/agent/execute")
        .set("X-API-Key", "bad-key")
        .send({
          userAddress: validAddress,
          action: "openTrove",
          params: { branch: 0, collateralAmount: "1", debtAmount: "1", interestRate: "1" },
        });
      expect(res.status).toBe(401);
    });

    it("allows health endpoint (public)", async () => {
      const res = await request(app).get("/api/health");
      expect(res.status).toBe(200);
    });

    it("allows /api/docs (public)", async () => {
      const res = await request(app).get("/api/docs.json");
      expect(res.status).toBe(200);
    });
  });
});
