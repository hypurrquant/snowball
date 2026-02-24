import { describe, it, expect, vi } from "vitest";
import request from "supertest";

vi.mock("../chainReader", () => ({
  getProtocolStats: vi.fn(),
  getMarkets: vi.fn().mockResolvedValue([
    {
      branch: 0,
      collateralSymbol: "wCTC",
      collateralAddress: "0x" + "1".repeat(40),
      totalCollateral: "1000000000000000000000",
      totalCollateralUSD: "5000000.00",
      currentCR: "180.00",
      mcr: "110.00",
      ccr: "150.00",
      ltv: "55.56",
      totalBorrow: "2777778000000000000000000",
      avgInterestRate: "5.00",
      spDeposits: "1000000000000000000000000",
      spAPY: "2.78",
    },
    {
      branch: 1,
      collateralSymbol: "lstCTC",
      collateralAddress: "0x" + "2".repeat(40),
      totalCollateral: "500000000000000000000",
      totalCollateralUSD: "2500000.00",
      currentCR: "200.00",
      mcr: "120.00",
      ccr: "160.00",
      ltv: "50.00",
      totalBorrow: "1250000000000000000000000",
      avgInterestRate: "4.50",
      spDeposits: "500000000000000000000000",
      spAPY: "2.25",
    },
  ]),
  getUserPositions: vi.fn().mockResolvedValue([]),
  getUserBalance: vi.fn(),
  getUserSPDeposits: vi.fn(),
  getAgentList: vi.fn(),
}));

vi.mock("../a2aClient", () => ({
  callCDPProvider: vi.fn().mockImplementation(async (method: string) => {
    if (method === "query.price") {
      return { price: "5000000000000000000000", formatted: "5000.00" };
    }
    return {
      to: "0x" + "a".repeat(40),
      data: "0x1234",
      value: "0",
      gasLimit: "500000",
      chainId: 102031,
    };
  }),
}));

import app from "../index";

const validAddress = "0x" + "f".repeat(40);

describe("Agent Routes", () => {
  it("POST /api/agent/recommend returns recommendation with dynamic rate", async () => {
    const res = await request(app)
      .post("/api/agent/recommend")
      .send({
        userAddress: validAddress,
        collateralType: "wCTC",
        amount: "10000000000000000000",
        riskLevel: "conservative",
      });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("strategy", "conservative");
    expect(res.body).toHaveProperty("recommendedCR", 200);
    expect(res.body).toHaveProperty("liquidationPrice");
    expect(res.body).toHaveProperty("reasoning");
    // Dynamic rate: conservative = avgRate + 1% = 6.00%
    const ratePct = Number(res.body.recommendedInterestRate) / 1e16;
    expect(ratePct).toBeCloseTo(6.0, 0);
    expect(res.body.reasoning).toContain("Market avg interest rate");
  });

  it("POST /api/agent/recommend moderate strategy matches market rate", async () => {
    const res = await request(app)
      .post("/api/agent/recommend")
      .send({
        userAddress: validAddress,
        collateralType: "wCTC",
        amount: "10000000000000000000",
        riskLevel: "moderate",
      });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("strategy", "moderate");
    const ratePct = Number(res.body.recommendedInterestRate) / 1e16;
    expect(ratePct).toBeCloseTo(5.0, 0);
  });

  it("POST /api/agent/recommend aggressive strategy is below market rate", async () => {
    const res = await request(app)
      .post("/api/agent/recommend")
      .send({
        userAddress: validAddress,
        collateralType: "wCTC",
        amount: "10000000000000000000",
        riskLevel: "aggressive",
      });
    expect(res.status).toBe(200);
    const ratePct = Number(res.body.recommendedInterestRate) / 1e16;
    expect(ratePct).toBeCloseTo(4.0, 0);
  });

  it("POST /api/agent/recommend rejects invalid address", async () => {
    const res = await request(app)
      .post("/api/agent/recommend")
      .send({
        userAddress: "bad-addr",
        collateralType: "wCTC",
        amount: "10000000000000000000",
      });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("POST /api/agent/recommend rejects missing amount", async () => {
    const res = await request(app)
      .post("/api/agent/recommend")
      .send({
        userAddress: validAddress,
        collateralType: "wCTC",
      });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("POST /api/agent/execute returns unsigned tx", async () => {
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
    expect(res.body).toHaveProperty("unsignedTx");
    expect(res.body.unsignedTx).toHaveProperty("to");
  });

  it("POST /api/agent/execute rejects unknown action", async () => {
    const res = await request(app)
      .post("/api/agent/execute")
      .send({
        userAddress: validAddress,
        action: "unknownAction",
        params: { branch: 0 },
      });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("POST /api/agent/execute rejects invalid branch", async () => {
    const res = await request(app)
      .post("/api/agent/execute")
      .send({
        userAddress: validAddress,
        action: "openTrove",
        params: {
          branch: 5,
          collateralAmount: "10000000000000000000",
          debtAmount: "5000000000000000000000",
        },
      });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("POST /api/agent/adjust-rate returns unsigned tx", async () => {
    const res = await request(app)
      .post("/api/agent/adjust-rate")
      .send({
        userAddress: validAddress,
        params: {
          branch: 0,
          troveId: "1",
          newInterestRate: "50000000000000000",
        },
      });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("unsignedTx");
  });

  it("POST /api/agent/adjust-rate rejects missing troveId", async () => {
    const res = await request(app)
      .post("/api/agent/adjust-rate")
      .send({
        userAddress: validAddress,
        params: {
          branch: 0,
          newInterestRate: "50000000000000000",
        },
      });
    expect(res.status).toBe(400);
  });
});
