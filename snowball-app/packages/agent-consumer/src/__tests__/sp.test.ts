import { describe, it, expect, vi } from "vitest";
import request from "supertest";

vi.mock("../chainReader", () => ({
  getProtocolStats: vi.fn(),
  getMarkets: vi.fn(),
  getUserPositions: vi.fn().mockResolvedValue([]),
  getUserBalance: vi.fn(),
  getUserSPDeposits: vi.fn(),
  getAgentList: vi.fn(),
}));

vi.mock("../a2aClient", () => ({
  callCDPProvider: vi.fn().mockResolvedValue({
    to: "0x" + "a".repeat(40),
    data: "0x1234",
    value: "0",
    gasLimit: "300000",
    chainId: 102031,
  }),
}));

import app from "../index";

const validAddress = "0x" + "f".repeat(40);

describe("SP Routes", () => {
  it("POST /api/sp/deposit returns unsigned tx", async () => {
    const res = await request(app)
      .post("/api/sp/deposit")
      .send({
        branchIndex: 0,
        amount: "1000000000000000000000",
        userAddress: validAddress,
      });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("unsignedTx");
  });

  it("POST /api/sp/deposit rejects invalid branch", async () => {
    const res = await request(app)
      .post("/api/sp/deposit")
      .send({
        branchIndex: 3,
        amount: "1000000000000000000000",
        userAddress: validAddress,
      });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("POST /api/sp/deposit rejects invalid address", async () => {
    const res = await request(app)
      .post("/api/sp/deposit")
      .send({
        branchIndex: 0,
        amount: "1000000000000000000000",
        userAddress: "bad",
      });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("POST /api/sp/deposit rejects zero amount", async () => {
    const res = await request(app)
      .post("/api/sp/deposit")
      .send({
        branchIndex: 0,
        amount: "0",
        userAddress: validAddress,
      });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("POST /api/sp/withdraw returns unsigned tx", async () => {
    const res = await request(app)
      .post("/api/sp/withdraw")
      .send({
        branchIndex: 1,
        amount: "500000000000000000000",
        userAddress: validAddress,
      });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("unsignedTx");
  });

  it("POST /api/sp/claim returns unsigned tx", async () => {
    const res = await request(app)
      .post("/api/sp/claim")
      .send({
        branchIndex: 0,
        userAddress: validAddress,
      });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("unsignedTx");
  });
});
