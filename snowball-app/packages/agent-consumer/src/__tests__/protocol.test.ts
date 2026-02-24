import { describe, it, expect, vi } from "vitest";
import request from "supertest";

vi.mock("../chainReader", () => ({
  getProtocolStats: vi.fn().mockResolvedValue({
    totalCollateralUSD: "10000.00",
    totalBorrowedUSD: "5000.00",
    sbUSDPrice: "1.00",
    activeAgents: 2,
  }),
  getMarkets: vi.fn().mockResolvedValue([
    {
      branch: 0,
      collateralSymbol: "wCTC",
      collateralAddress: "0x" + "1".repeat(40),
      totalCollateral: "1000000000000000000000",
      totalCollateralUSD: "5000.00",
      currentCR: "200.00",
      mcr: "110.00",
      ccr: "150.00",
      ltv: "50.00",
      totalBorrow: "2500000000000000000000",
      avgInterestRate: "5.00",
      spDeposits: "1000000000000000000000",
      spAPY: "6.50",
    },
    {
      branch: 1,
      collateralSymbol: "lstCTC",
      collateralAddress: "0x" + "2".repeat(40),
      totalCollateral: "500000000000000000000",
      totalCollateralUSD: "5000.00",
      currentCR: "200.00",
      mcr: "120.00",
      ccr: "160.00",
      ltv: "50.00",
      totalBorrow: "2500000000000000000000",
      avgInterestRate: "5.00",
      spDeposits: "500000000000000000000",
      spAPY: "6.50",
    },
  ]),
  getUserPositions: vi.fn(),
  getUserBalance: vi.fn(),
  getUserSPDeposits: vi.fn(),
  getAgentList: vi.fn(),
}));

vi.mock("../a2aClient", () => ({
  callCDPProvider: vi.fn(),
}));

import app from "../index";

describe("Protocol Routes", () => {
  it("GET /api/protocol/stats returns protocol stats", async () => {
    const res = await request(app).get("/api/protocol/stats");
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("totalCollateralUSD", "10000.00");
    expect(res.body).toHaveProperty("totalBorrowedUSD", "5000.00");
    expect(res.body).toHaveProperty("sbUSDPrice", "1.00");
    expect(res.body).toHaveProperty("activeAgents", 2);
  });

  it("GET /api/protocol/markets returns market data", async () => {
    const res = await request(app).get("/api/protocol/markets");
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
    expect(res.body[0].collateralSymbol).toBe("wCTC");
    expect(res.body[1].collateralSymbol).toBe("lstCTC");
  });
});
