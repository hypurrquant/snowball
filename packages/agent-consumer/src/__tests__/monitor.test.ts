import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock chainReader
const mockGetUserPositions = vi.fn();
const mockGetMarkets = vi.fn();

vi.mock("../chainReader", () => ({
  getUserPositions: (...args: any[]) => mockGetUserPositions(...args),
  getMarkets: (...args: any[]) => mockGetMarkets(...args),
  getProtocolStats: vi.fn(),
  getUserBalance: vi.fn(),
  getUserSPDeposits: vi.fn(),
  getAgentList: vi.fn(),
}));

vi.mock("../a2aClient", () => ({
  callCDPProvider: vi.fn().mockResolvedValue({
    to: "0x" + "a".repeat(40),
    data: "0x1234",
    value: "0",
    gasLimit: "400000",
    chainId: 102031,
  }),
}));

// Mock the events module to prevent import issues
vi.mock("../routes/events", () => ({
  pushMonitorEvent: vi.fn(),
  getSSEConnectionCount: vi.fn().mockReturnValue(0),
  eventsRouter: { get: vi.fn() },
}));

import { PositionMonitor } from "../monitor";

describe("PositionMonitor", () => {
  let monitor: PositionMonitor;

  beforeEach(() => {
    vi.clearAllMocks();
    monitor = new PositionMonitor(60_000); // long interval, we'll manually trigger
  });

  it("addPosition and getPositionCount", () => {
    expect(monitor.getPositionCount()).toBe(0);
    monitor.addPosition("0xABC123def456789012345678901234567890abcd", "conservative", "agent-1");
    expect(monitor.getPositionCount()).toBe(1);
  });

  it("removePosition", () => {
    monitor.addPosition("0xABC123def456789012345678901234567890abcd", "conservative", "agent-1");
    monitor.removePosition("0xABC123def456789012345678901234567890abcd");
    expect(monitor.getPositionCount()).toBe(0);
  });

  it("getEvents returns empty initially", () => {
    expect(monitor.getEvents()).toEqual([]);
  });

  it("getEvents filters by agentId", () => {
    monitor.addPosition("0xABC123def456789012345678901234567890abcd", "conservative", "agent-1");
    expect(monitor.getEvents("agent-1")).toEqual([]);
    expect(monitor.getEvents("agent-2")).toEqual([]);
  });

  it("start and stop", () => {
    monitor.start();
    monitor.start(); // double start should be safe
    monitor.stop();
    monitor.stop(); // double stop should be safe
  });

  it("poll generates events for monitored positions", async () => {
    mockGetUserPositions.mockResolvedValue([
      {
        troveId: 1,
        branch: 0,
        collateralSymbol: "wCTC",
        collateral: "10000000000000000000",
        collateralUSD: "50000.00",
        debt: "25000000000000000000000",
        cr: "250.00", // Above conservative minCR * 1.2 = 240%
        interestRate: "5.00",
        liquidationPrice: "2750.0000",
        agentManaged: true,
        agentStrategy: "conservative",
        status: "active",
      },
    ]);
    mockGetMarkets.mockResolvedValue([
      { branch: 0, collateralSymbol: "wCTC", avgInterestRate: "5.00" },
      { branch: 1, collateralSymbol: "lstCTC", avgInterestRate: "4.50" },
    ]);

    monitor.addPosition("0xABC123def456789012345678901234567890abcd", "conservative", "agent-1");

    // Trigger poll manually via private method (use any)
    await (monitor as any).poll();

    const events = monitor.getEvents();
    expect(events.length).toBe(1);
    expect(events[0].level).toBe("OK");
    expect(events[0].cr).toBe("250.00");
    expect(events[0].collateralSymbol).toBe("wCTC");
    expect(events[0].redemptionRisk).toBe("low");
  });

  it("poll generates DANGER event when CR is below threshold", async () => {
    mockGetUserPositions.mockResolvedValue([
      {
        troveId: 1,
        branch: 0,
        collateralSymbol: "wCTC",
        collateral: "1000000000000000000",
        collateralUSD: "5000.00",
        debt: "5000000000000000000000",
        cr: "100.00", // Below 200 * 1.1 = 220
        interestRate: "5.00",
        liquidationPrice: "5500.0000",
        agentManaged: true,
        agentStrategy: "conservative",
        status: "active",
      },
    ]);
    mockGetMarkets.mockResolvedValue([
      { branch: 0, collateralSymbol: "wCTC", avgInterestRate: "5.00" },
    ]);

    monitor.addPosition("0xABC123def456789012345678901234567890abcd", "conservative", "agent-1");
    await (monitor as any).poll();

    const events = monitor.getEvents();
    expect(events.length).toBe(1);
    expect(events[0].level).toBe("DANGER");
    expect(events[0].details).toContain("danger threshold");
  });

  it("poll generates WARNING event for medium CR", async () => {
    mockGetUserPositions.mockResolvedValue([
      {
        troveId: 1,
        branch: 0,
        collateralSymbol: "wCTC",
        collateral: "1000000000000000000",
        collateralUSD: "5000.00",
        debt: "2200000000000000000000",
        cr: "227.27", // Below 200 * 1.2 = 240 but above 200 * 1.1 = 220
        interestRate: "5.00",
        liquidationPrice: "2420.0000",
        agentManaged: true,
        agentStrategy: "conservative",
        status: "active",
      },
    ]);
    mockGetMarkets.mockResolvedValue([
      { branch: 0, collateralSymbol: "wCTC", avgInterestRate: "5.00" },
    ]);

    monitor.addPosition("0xABC123def456789012345678901234567890abcd", "conservative", "agent-1");
    await (monitor as any).poll();

    const events = monitor.getEvents();
    expect(events.length).toBe(1);
    expect(events[0].level).toBe("WARNING");
    expect(events[0].action).toBeDefined();
  });

  it("poll detects high redemption risk", async () => {
    mockGetUserPositions.mockResolvedValue([
      {
        troveId: 1,
        branch: 0,
        collateralSymbol: "wCTC",
        collateral: "10000000000000000000",
        collateralUSD: "50000.00",
        debt: "25000000000000000000000",
        cr: "200.00",
        interestRate: "1.00", // Way below 5.00 * 0.7 = 3.5
        liquidationPrice: "2750.0000",
        agentManaged: true,
        agentStrategy: "conservative",
        status: "active",
      },
    ]);
    mockGetMarkets.mockResolvedValue([
      { branch: 0, collateralSymbol: "wCTC", avgInterestRate: "5.00" },
    ]);

    monitor.addPosition("0xABC123def456789012345678901234567890abcd", "conservative", "agent-1");
    await (monitor as any).poll();

    const events = monitor.getEvents();
    expect(events.length).toBe(1);
    expect(events[0].redemptionRisk).toBe("high");
    expect(events[0].details).toContain("REDEMPTION HIGH RISK");
  });

  it("poll detects medium redemption risk", async () => {
    mockGetUserPositions.mockResolvedValue([
      {
        troveId: 1,
        branch: 0,
        collateralSymbol: "wCTC",
        collateral: "10000000000000000000",
        collateralUSD: "50000.00",
        debt: "25000000000000000000000",
        cr: "200.00",
        interestRate: "4.00", // Below 5.00 * 0.9 = 4.5 but above 5.00 * 0.7 = 3.5
        liquidationPrice: "2750.0000",
        agentManaged: true,
        agentStrategy: "conservative",
        status: "active",
      },
    ]);
    mockGetMarkets.mockResolvedValue([
      { branch: 0, collateralSymbol: "wCTC", avgInterestRate: "5.00" },
    ]);

    monitor.addPosition("0xABC123def456789012345678901234567890abcd", "conservative", "agent-1");
    await (monitor as any).poll();

    const events = monitor.getEvents();
    expect(events.length).toBe(1);
    expect(events[0].redemptionRisk).toBe("medium");
  });

  it("handles errors during poll gracefully", async () => {
    mockGetUserPositions.mockRejectedValue(new Error("RPC timeout"));
    mockGetMarkets.mockResolvedValue([]);

    monitor.addPosition("0xABC123def456789012345678901234567890abcd", "conservative", "agent-1");
    await (monitor as any).poll();

    // Should not throw, events should be empty (error was caught)
    expect(monitor.getEvents()).toEqual([]);
  });
});
