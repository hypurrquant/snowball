import { getUserPositions, getMarkets } from "./chainReader";
import { callCDPProvider } from "./a2aClient";
import { STRATEGIES, BorrowerOperationsABI } from "@snowball/shared";
import { monitorLogger } from "./logger";
import { pushMonitorEvent } from "./routes/events";
import { executeForUser, isUserRegistered } from "./privyHelper";
import { getAddresses } from "./addresses";
import { encodeFunctionData, parseAbi, type Address } from "viem";
import type { MarketData } from "@snowball/shared";

export interface MonitorEvent {
  timestamp: number;
  address: string;
  agentId: string;
  level: "OK" | "WARNING" | "DANGER";
  cr: string;
  branch: number;
  collateralSymbol: string;
  troveId: number;
  details: string;
  action?: string;
  redemptionRisk?: "low" | "medium" | "high";
}

interface MonitoredPosition {
  strategy: string;
  agentId: string;
}

export class PositionMonitor {
  private positions: Map<string, MonitoredPosition> = new Map();
  private events: MonitorEvent[] = [];
  private intervalId: NodeJS.Timeout | null = null;
  private maxEvents = 1000;
  private pollIntervalMs: number;
  private autoRebalance: boolean;

  constructor(pollIntervalMs = 30_000) {
    this.pollIntervalMs = pollIntervalMs;
    this.autoRebalance = process.env.AUTO_REBALANCE === "true";
  }

  start() {
    if (this.intervalId) return;
    monitorLogger.info({ intervalMs: this.pollIntervalMs, autoRebalance: this.autoRebalance }, "Monitor started");
    this.intervalId = setInterval(() => this.poll(), this.pollIntervalMs);
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      monitorLogger.info("Monitor stopped");
    }
  }

  addPosition(address: string, strategy: string, agentId: string) {
    this.positions.set(address.toLowerCase(), { strategy, agentId });
    monitorLogger.info({ address, strategy, agentId }, "Added position");
  }

  removePosition(address: string) {
    this.positions.delete(address.toLowerCase());
    monitorLogger.info({ address }, "Removed position");
  }

  getEvents(agentId?: string, limit = 50): MonitorEvent[] {
    let filtered = this.events;
    if (agentId) {
      filtered = filtered.filter((e) => e.agentId === agentId);
    }
    return filtered.slice(-limit);
  }

  getPositionCount(): number {
    return this.positions.size;
  }

  private computeRecommendedAction(
    pos: { cr: string; collateral: string; debt: string; branch: number },
    strat: { minCR: number },
  ): string {
    const cr = parseFloat(pos.cr);
    const targetCR = strat.minCR * 1.3;
    const currentDebt = parseFloat(pos.debt) / 1e18;
    const neededCollValueUSD = (targetCR / 100) * currentDebt;
    return `Recommend increasing CR to ${targetCR.toFixed(0)}% — add collateral worth ~$${neededCollValueUSD.toFixed(2)} USD`;
  }

  private async executeRebalance(
    address: string,
    pos: { troveId: number; branch: number; collateral: string; debt: string; cr: string; interestRate: string },
    strat: { minCR: number },
  ): Promise<string> {
    try {
      const targetCR = strat.minCR * 1.3; // safety buffer
      const currentCR = parseFloat(pos.cr);
      if (currentCR >= targetCR) return "No rebalance needed";

      const collWei = BigInt(pos.collateral);
      const ratio = targetCR / currentCR;
      const addCollWei = BigInt(Math.floor(Number(collWei) * (ratio - 1)));
      if (addCollWei <= 0n) return "No rebalance needed";

      // Try direct execution via agent wallet (user registered via Privy)
      try {
        if (isUserRegistered(address)) {
          const addresses = getAddresses();
          const branchData = pos.branch === 1 ? addresses.branches.lstCTC : addresses.branches.wCTC;
          const boAddress = branchData.borrowerOperations as Address;

          const boAbi = parseAbi(BorrowerOperationsABI as unknown as string[]);
          const calldata = encodeFunctionData({
            abi: boAbi,
            functionName: "addColl",
            args: [BigInt(pos.troveId), addCollWei],
          });

          const result = await executeForUser(boAddress, calldata);
          monitorLogger.info(
            { address, troveId: pos.troveId, txHash: result.txHash },
            "Auto-rebalance via agent wallet",
          );
          return `Auto-rebalance: added ${addCollWei.toString()} collateral (tx: ${result.txHash})`;
        }
      } catch (execErr: any) {
        monitorLogger.warn({ address, error: execErr.message }, "Agent wallet rebalance failed, falling back to A2A");
      }

      // Fallback: build unsigned TX via A2A (CDP provider)
      await callCDPProvider("cdp.adjustTrove", {
        branchIndex: pos.branch,
        troveId: String(pos.troveId),
        collChange: addCollWei.toString(),
        isCollIncrease: true,
        debtChange: "0",
        isDebtIncrease: false,
        maxUpfrontFee: "0",
      });

      monitorLogger.info({ address, troveId: pos.troveId, addColl: addCollWei.toString() }, "Auto-rebalance TX built");
      return `Auto-rebalance: add ${addCollWei.toString()} collateral (TX built, target CR ${targetCR.toFixed(0)}%)`;
    } catch (err: any) {
      monitorLogger.error({ address, troveId: pos.troveId, error: err.message }, "Auto-rebalance failed");
      return `Auto-rebalance failed: ${err.message}`;
    }
  }

  private async checkRedemptionRisk(
    pos: { interestRate: string; troveId: number; branch: number },
    markets: MarketData[],
  ): Promise<{ risk: "low" | "medium" | "high"; avgRate: number }> {
    const market = markets.find((m) => m.branch === pos.branch);
    const avgRate = market ? parseFloat(market.avgInterestRate) : 5.0;
    const posRate = parseFloat(pos.interestRate);

    if (posRate < avgRate * 0.7) return { risk: "high", avgRate };
    if (posRate < avgRate * 0.9) return { risk: "medium", avgRate };
    return { risk: "low", avgRate };
  }

  private async poll() {
    // Fetch markets once per poll cycle for redemption checks
    let markets: MarketData[] = [];
    try {
      markets = await getMarkets();
    } catch {
      // proceed without market data
    }

    for (const [address, { strategy, agentId }] of this.positions) {
      try {
        const positions = await getUserPositions(address);

        if (positions.length === 0) continue;

        const strat = STRATEGIES[strategy as keyof typeof STRATEGIES] ?? STRATEGIES.conservative;
        const minCR = strat.minCR;

        for (const pos of positions) {
          const cr = parseFloat(pos.cr);
          let level: MonitorEvent["level"];
          let details: string;
          let action: string | undefined;
          let redemptionRisk: "low" | "medium" | "high" = "low";

          // Check CR health
          if (cr < minCR * 1.1) {
            level = "DANGER";
            details = `CR ${pos.cr}% is below danger threshold (${(minCR * 1.1).toFixed(0)}%). Immediate action needed.`;
            if (this.autoRebalance) {
              action = await this.executeRebalance(address, pos, strat);
            }
          } else if (cr < minCR * 1.2) {
            level = "WARNING";
            details = `CR ${pos.cr}% approaching warning zone (threshold: ${(minCR * 1.2).toFixed(0)}%).`;
            action = this.computeRecommendedAction(pos, strat);
          } else {
            level = "OK";
            details = `CR ${pos.cr}% is healthy.`;
          }

          // Check redemption risk
          if (markets.length > 0) {
            const redemptionCheck = await this.checkRedemptionRisk(pos, markets);
            redemptionRisk = redemptionCheck.risk;

            if (redemptionRisk === "high") {
              details += ` REDEMPTION HIGH RISK: interest rate ${pos.interestRate}% is far below market avg ${redemptionCheck.avgRate.toFixed(2)}%.`;
              if (level === "OK") level = "WARNING";

              // Auto-adjust interest rate if autoRebalance enabled
              if (this.autoRebalance) {
                try {
                  const newRate = Math.round(redemptionCheck.avgRate * 1e16); // convert % to wei

                  // Try direct execution via agent wallet
                  let directSuccess = false;
                  try {
                    if (isUserRegistered(address)) {
                      const addresses = getAddresses();
                      const branchData = pos.branch === 1 ? addresses.branches.lstCTC : addresses.branches.wCTC;
                      const boAddress = branchData.borrowerOperations as Address;

                      const boAbi = parseAbi(BorrowerOperationsABI as unknown as string[]);
                      const calldata = encodeFunctionData({
                        abi: boAbi,
                        functionName: "adjustTroveInterestRate",
                        args: [BigInt(pos.troveId), BigInt(newRate), 0n, 0n, BigInt(Math.round(redemptionCheck.avgRate * 1e18))],
                      });

                      const result = await executeForUser(boAddress, calldata);
                      directSuccess = result.success;
                      action = (action ? action + " | " : "") + `Auto-adjusted rate to ${redemptionCheck.avgRate.toFixed(2)}% (tx: ${result.txHash})`;
                    }
                  } catch (execErr: any) {
                    monitorLogger.warn({ troveId: pos.troveId, error: execErr.message }, "Agent wallet rate adjust failed");
                  }

                  // Fallback to A2A
                  if (!directSuccess) {
                    await callCDPProvider("cdp.adjustTroveInterestRate", {
                      branchIndex: pos.branch,
                      troveId: String(pos.troveId),
                      newInterestRate: String(newRate),
                      maxUpfrontFee: "0",
                    });
                    action = (action ? action + " | " : "") + `Auto-adjusted interest rate to ${redemptionCheck.avgRate.toFixed(2)}%`;
                  }
                } catch (err: any) {
                  monitorLogger.error({ troveId: pos.troveId, error: err.message }, "Auto interest rate adjust failed");
                }
              }
            } else if (redemptionRisk === "medium") {
              details += ` Redemption risk medium: interest rate ${pos.interestRate}% below market avg ${redemptionCheck.avgRate.toFixed(2)}%.`;
            }
          }

          const event: MonitorEvent = {
            timestamp: Date.now(),
            address,
            agentId,
            level,
            cr: pos.cr,
            branch: pos.branch,
            collateralSymbol: pos.collateralSymbol,
            troveId: pos.troveId,
            details,
            action,
            redemptionRisk,
          };

          this.events.push(event);

          // Push to SSE clients
          pushMonitorEvent(event);

          // Log
          monitorLogger.info(
            { level, symbol: pos.collateralSymbol, troveId: pos.troveId, cr: pos.cr, redemptionRisk },
            `${level}: ${pos.collateralSymbol} Trove #${pos.troveId} CR=${pos.cr}%`,
          );

          // Trim events
          if (this.events.length > this.maxEvents) {
            this.events = this.events.slice(-this.maxEvents);
          }
        }
      } catch (err: any) {
        monitorLogger.error({ address, error: err.message }, `Error polling ${address}`);
      }
    }
  }
}
