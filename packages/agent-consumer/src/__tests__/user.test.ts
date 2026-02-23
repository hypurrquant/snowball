import { describe, it, expect, vi } from "vitest";
import request from "supertest";

vi.mock("../chainReader", () => ({
  getProtocolStats: vi.fn(),
  getMarkets: vi.fn(),
  getUserPositions: vi.fn().mockResolvedValue([
    {
      troveId: 1,
      branch: 0,
      collateralSymbol: "wCTC",
      collateral: "10000000000000000000",
      collateralUSD: "50000.00",
      debt: "25000000000000000000000",
      cr: "200.00",
      interestRate: "5.00",
      liquidationPrice: "2750.00",
      agentManaged: false,
      agentStrategy: "conservative",
      status: "active",
    },
  ]),
  getUserBalance: vi.fn().mockResolvedValue({
    nativeCTC: "1000000000000000000",
    wCTC: "5000000000000000000",
    lstCTC: "3000000000000000000",
    sbUSD: "1000000000000000000000",
  }),
  getUserSPDeposits: vi.fn().mockResolvedValue([
    { branch: 0, collateralSymbol: "wCTC", deposit: "500000000000000000000", boldGain: "0", collGain: "0" },
    { branch: 1, collateralSymbol: "lstCTC", deposit: "0", boldGain: "0", collGain: "0" },
  ]),
  getAgentList: vi.fn(),
}));

vi.mock("../a2aClient", () => ({
  callCDPProvider: vi.fn(),
}));

import app from "../index";

const validAddress = "0x" + "f".repeat(40);
const invalidAddress = "not-an-address";

describe("User Routes", () => {
  it("GET /api/user/:address/positions returns positions", async () => {
    const res = await request(app).get(`/api/user/${validAddress}/positions`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].collateralSymbol).toBe("wCTC");
  });

  it("GET /api/user/:address/positions rejects invalid address", async () => {
    const res = await request(app).get(`/api/user/${invalidAddress}/positions`);
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("GET /api/user/:address/balance returns balance", async () => {
    const res = await request(app).get(`/api/user/${validAddress}/balance`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("wCTC");
    expect(res.body).toHaveProperty("sbUSD");
  });

  it("GET /api/user/:address/sp-deposits returns SP deposits", async () => {
    const res = await request(app).get(`/api/user/${validAddress}/sp-deposits`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
    expect(res.body[0].collateralSymbol).toBe("wCTC");
  });

  it("GET /api/user/:address/trove/:id returns 404 for missing trove", async () => {
    const res = await request(app).get(`/api/user/${validAddress}/trove/999`);
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("NOT_FOUND");
  });
});
