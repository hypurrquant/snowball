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
import { pushMonitorEvent, getSSEConnectionCount } from "../routes/events";
import type { MonitorEvent } from "../monitor";

const validAddress = "0x" + "f".repeat(40);

describe("SSE Events", () => {
  it("GET /api/events/positions/:address returns event-stream", async () => {
    const res = await request(app)
      .get(`/api/events/positions/${validAddress}`)
      .set("Accept", "text/event-stream")
      .buffer(true)
      .parse((res, callback) => {
        let data = "";
        res.on("data", (chunk: Buffer) => {
          data += chunk.toString();
          // After receiving connection event, abort
          if (data.includes("connected")) {
            res.destroy();
            callback(null, data);
          }
        });
        // Timeout fallback
        setTimeout(() => {
          res.destroy();
          callback(null, data);
        }, 2000);
      });

    expect(res.headers["content-type"]).toContain("text/event-stream");
    expect(res.body).toContain("connected");
  });

  it("getSSEConnectionCount returns number", () => {
    const count = getSSEConnectionCount();
    expect(typeof count).toBe("number");
  });

  it("pushMonitorEvent does not throw with no clients", () => {
    const event: MonitorEvent = {
      timestamp: Date.now(),
      address: "0x" + "a".repeat(40),
      agentId: "agent-1",
      level: "OK",
      cr: "200.00",
      branch: 0,
      collateralSymbol: "wCTC",
      troveId: 1,
      details: "Healthy",
    };
    expect(() => pushMonitorEvent(event)).not.toThrow();
  });
});
