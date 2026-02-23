import { describe, it, expect, vi } from "vitest";
import request from "supertest";

vi.mock("../chainReader", () => ({
  getProtocolStats: vi.fn(),
  getMarkets: vi.fn().mockResolvedValue([]),
  getUserPositions: vi.fn().mockResolvedValue([]),
  getUserBalance: vi.fn(),
  getUserSPDeposits: vi.fn(),
  getAgentList: vi.fn(),
}));

vi.mock("../a2aClient", () => ({
  callCDPProvider: vi.fn().mockResolvedValue({}),
}));

import app from "../index";

describe("Swagger / OpenAPI", () => {
  it("GET /api/docs.json returns valid OpenAPI spec", async () => {
    const res = await request(app).get("/api/docs.json");
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("openapi", "3.0.0");
    expect(res.body).toHaveProperty("info");
    expect(res.body.info).toHaveProperty("title", "Snowball Consumer Agent API");
    expect(res.body).toHaveProperty("paths");
    expect(res.body).toHaveProperty("components");
    expect(res.body.components).toHaveProperty("schemas");
    expect(res.body.components).toHaveProperty("securitySchemes");
  });

  it("GET /api/docs returns Swagger UI HTML", async () => {
    const res = await request(app).get("/api/docs/");
    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toContain("text/html");
  });

  it("OpenAPI spec contains expected schemas", async () => {
    const res = await request(app).get("/api/docs.json");
    const schemas = res.body.components.schemas;
    expect(schemas).toHaveProperty("ProtocolStats");
    expect(schemas).toHaveProperty("MarketData");
    expect(schemas).toHaveProperty("UserPosition");
    expect(schemas).toHaveProperty("UserBalance");
    expect(schemas).toHaveProperty("AgentRecommendation");
    expect(schemas).toHaveProperty("AgentInfo");
  });

  it("OpenAPI spec contains security schemes", async () => {
    const res = await request(app).get("/api/docs.json");
    const schemes = res.body.components.securitySchemes;
    expect(schemes).toHaveProperty("ApiKey");
    expect(schemes).toHaveProperty("WalletAuth");
  });
});
