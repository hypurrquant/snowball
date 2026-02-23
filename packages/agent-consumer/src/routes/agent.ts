import { Router, type Request, type Response, type NextFunction } from "express";
import { type Address } from "viem";
import { callCDPProvider } from "../a2aClient";
import { getMarkets } from "../chainReader";
import { getClients } from "../walletHelper";
import {
  createServerWallet as createSW,
  getServerWallet as getSW,
  deactivateServerWallet as deactivateSW,
} from "../privyHelper";
import {
  creditcoinTestnet,
  STRATEGIES,
  MockWCTCABI,
  WCTC_MCR,
  LSTCTC_MCR,
  MIN_DEBT,
  DECIMAL_PRECISION,
  MIN_ANNUAL_INTEREST_RATE,
  MAX_ANNUAL_INTEREST_RATE,
} from "@snowball/shared";
import type { AgentRecommendation, AgentExecuteResponse } from "@snowball/shared";
import {
  validateAddress,
  validateRequired,
  validateBranchIndex,
  validatePositiveBigInt,
  ValidationError,
} from "@snowball/shared";
import { parseAbi } from "viem";

const asyncHandler = (fn: Function) => (req: Request, res: Response, next: NextFunction) =>
  Promise.resolve(fn(req, res, next)).catch(next);

export const agentRouter = Router();

// Clamp interest rate between protocol min and max (in %)
function clampRate(ratePct: number): number {
  const minPct = Number(MIN_ANNUAL_INTEREST_RATE) / 1e16; // 0.5%
  const maxPct = Number(MAX_ANNUAL_INTEREST_RATE) / 1e16; // 25%
  return Math.max(minPct, Math.min(maxPct, ratePct));
}

/**
 * @openapi
 * /api/agent/recommend:
 *   post:
 *     tags: [Agent]
 *     summary: Get CDP recommendation based on risk level
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [userAddress, amount]
 *             properties:
 *               userAddress: { type: string, example: "0xf00f..." }
 *               collateralType: { type: string, enum: [wCTC, lstCTC] }
 *               amount: { type: string, description: "Collateral amount in wei" }
 *               riskLevel: { type: string, enum: [conservative, moderate, aggressive] }
 *     responses:
 *       200:
 *         description: Agent recommendation
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AgentRecommendation'
 *       400:
 *         description: Validation error
 */
agentRouter.post("/recommend", asyncHandler(async (req: Request, res: Response) => {
  const { userAddress, collateralType, amount, riskLevel } = req.body;
  validateAddress(userAddress, "userAddress");
  validateRequired(amount, "amount");
  validatePositiveBigInt(amount, "amount");

  const branchIndex = collateralType === "lstCTC" ? 1 : 0;
  const strategy = STRATEGIES[riskLevel as keyof typeof STRATEGIES] ?? STRATEGIES.conservative;

  // Fetch price + branch stats + markets for dynamic rate
  const [priceData, branchStats, markets] = await Promise.all([
    callCDPProvider("query.price", { branchIndex }) as Promise<{ price: string; formatted: string }>,
    callCDPProvider("query.branchStats", { branchIndex }) as Promise<{ boldDebt: string; collBalance: string; price: string }>,
    getMarkets(),
  ]);

  const price = parseFloat(priceData.formatted);
  const collAmount = parseFloat(amount) / 1e18;
  const collValueUSD = collAmount * price;

  const targetCR = strategy.minCR / 100;
  const recommendedDebtUSD = collValueUSD / targetCR;

  // Enforce minimum debt from protocol constant (200 sbUSD)
  const minDebtUSD = Number(MIN_DEBT / DECIMAL_PRECISION);
  const finalDebtUSD = Math.max(recommendedDebtUSD, minDebtUSD);
  const recommendedDebt = BigInt(Math.floor(finalDebtUSD * 1e18));

  // MCR from protocol constants
  const mcrRaw = branchIndex === 0 ? WCTC_MCR : LSTCTC_MCR;
  const mcrNum = Number(mcrRaw) / 1e18;
  const liquidationPrice = (finalDebtUSD * mcrNum) / collAmount;

  // Dynamic interest rate from market average
  const market = markets.find((m) => m.branch === branchIndex);
  const avgRate = market ? parseFloat(market.avgInterestRate) : 5.0;

  // Strategy-based rate adjustment from market average
  let dynamicRatePct: number;
  switch (riskLevel) {
    case "conservative":
      dynamicRatePct = clampRate(avgRate + 1.0); // safety margin
      break;
    case "aggressive":
      dynamicRatePct = clampRate(avgRate - 1.0); // cost optimization
      break;
    default: // moderate
      dynamicRatePct = clampRate(avgRate); // market matching
      break;
  }

  const recommendedRate = BigInt(Math.round(dynamicRatePct * 1e16)).toString(); // % to wei
  const interestRatePct = dynamicRatePct;

  // Compute estimated APY deterministically:
  const leverage = strategy.minCR / (strategy.minCR - 100);
  const lstStakingYield = collateralType === "lstCTC" ? 4.0 : 0;
  const netAPY = (lstStakingYield * leverage) - interestRatePct;

  // Redemption risk warning
  let redemptionWarning = "";
  if (dynamicRatePct < avgRate * 0.7) {
    redemptionWarning = ` WARNING: Recommended rate is below 70% of market average (${avgRate.toFixed(2)}%) — high redemption risk.`;
  }

  const recommendation: AgentRecommendation = {
    strategy: riskLevel || "conservative",
    recommendedCR: strategy.minCR,
    recommendedDebt: recommendedDebt.toString(),
    recommendedInterestRate: recommendedRate,
    estimatedAPY: netAPY.toFixed(1),
    liquidationPrice: liquidationPrice.toFixed(4),
    reasoning: `Current ${collateralType} price: $${price.toFixed(4)}. ` +
      `Market avg interest rate: ${avgRate.toFixed(2)}%. ` +
      `With ${strategy.name} strategy (CR > ${strategy.minCR}%, leverage ${leverage.toFixed(1)}x), ` +
      `recommended debt is ${finalDebtUSD.toFixed(2)} sbUSD at ${interestRatePct.toFixed(2)}% interest. ` +
      `Liquidation occurs at $${liquidationPrice.toFixed(4)} (${((1 - liquidationPrice / price) * 100).toFixed(1)}% drop needed). ` +
      `Net APY: ${netAPY.toFixed(1)}% (${lstStakingYield > 0 ? `${lstStakingYield}% staking × ${leverage.toFixed(1)}x leverage - ` : ""}${interestRatePct.toFixed(2)}% interest). ` +
      strategy.description + redemptionWarning,
  };

  res.json(recommendation);
}));

/**
 * @openapi
 * /api/agent/execute:
 *   post:
 *     tags: [Agent]
 *     summary: Execute a CDP action (openTrove, adjustTrove, closeTrove)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [userAddress, action, params]
 *             properties:
 *               userAddress: { type: string }
 *               action: { type: string, enum: [openTrove, adjustTrove, closeTrove] }
 *               params: { type: object }
 *               submit: { type: boolean, description: "If true, sign and submit TX with admin key" }
 *     responses:
 *       200:
 *         description: Transaction result
 */
agentRouter.post("/execute", asyncHandler(async (req: Request, res: Response) => {
  const { userAddress, action, params } = req.body;
  validateAddress(userAddress, "userAddress");
  validateRequired(action, "action");

  let method: string;
  let a2aParams: Record<string, unknown>;

  switch (action) {
    case "openTrove":
      validateBranchIndex(params.branch);
      validatePositiveBigInt(params.collateralAmount, "collateralAmount");
      validatePositiveBigInt(params.debtAmount, "debtAmount");
      method = "cdp.openTrove";
      a2aParams = {
        branchIndex: params.branch,
        owner: userAddress,
        collAmount: params.collateralAmount,
        debtAmount: params.debtAmount,
        interestRate: params.interestRate,
        maxUpfrontFee: params.debtAmount,
      };
      break;
    case "adjustTrove":
      validateBranchIndex(params.branch);
      method = "cdp.adjustTrove";
      a2aParams = {
        branchIndex: params.branch,
        troveId: params.troveId,
        collChange: params.collChange || "0",
        isCollIncrease: params.isCollIncrease || false,
        debtChange: params.debtChange || "0",
        isDebtIncrease: params.isDebtIncrease || false,
      };
      break;
    case "closeTrove":
      validateBranchIndex(params.branch);
      method = "cdp.closeTrove";
      a2aParams = {
        branchIndex: params.branch,
        troveId: params.troveId,
      };
      break;
    default:
      throw new ValidationError(`Unknown action: ${action}`);
  }

  const txData = await callCDPProvider(method, a2aParams) as any;

  // If submit=true, sign and send directly (testnet admin mode)
  if (req.body.submit) {
    try {
      const { walletClient, publicClient } = getClients();
      const { getAddresses } = await import("../addresses");
      const addresses = getAddresses();
      const branchData = params.branch === 1 ? addresses.branches.lstCTC : addresses.branches.wCTC;
      const collToken = params.branch === 1 ? addresses.tokens.lstCTC : addresses.tokens.wCTC;

      // For openTrove and adjustTrove with collateral increase, approve first
      if (action === "openTrove" || (action === "adjustTrove" && params.isCollIncrease)) {
        const approveAmount = action === "openTrove"
          ? BigInt(params.collateralAmount)
          : BigInt(params.collChange || "0");

        if (approveAmount > 0n) {
          const approveTx = await (walletClient as any).writeContract({
            address: collToken as Address,
            abi: parseAbi(MockWCTCABI as unknown as string[]),
            functionName: "approve",
            args: [branchData.borrowerOperations as Address, approveAmount],
          });
          await publicClient.waitForTransactionReceipt({ hash: approveTx });
        }
      }

      // Simulate first to catch revert reasons
      try {
        await publicClient.call({
          to: txData.to as Address,
          data: txData.data as `0x${string}`,
          account: walletClient.account!,
        });
      } catch (simErr: any) {
        return res.status(400).json({
          error: `Simulation failed: ${simErr.shortMessage || simErr.message}`,
          unsignedTx: txData,
        });
      }

      // Execute
      const hash = await (walletClient as any).sendTransaction({
        to: txData.to as Address,
        data: txData.data as `0x${string}`,
        value: BigInt(txData.value || "0"),
        gas: 1_000_000n,
      });
      const receipt = await publicClient.waitForTransactionReceipt({ hash });

      // If agent-managed, register with monitor
      if (params.agentManaged && req.app.locals.monitor) {
        req.app.locals.monitor.addPosition(userAddress, req.body.riskLevel || "conservative", `agent-${Date.now()}`);
      }

      return res.json({
        txHash: hash,
        status: receipt.status === "success" ? "success" : "failed",
        blockNumber: Number(receipt.blockNumber),
      });
    } catch (submitErr: any) {
      return res.status(500).json({
        error: `TX submission failed: ${submitErr.message}`,
        unsignedTx: txData,
      });
    }
  }

  // Default: return unsigned TX for frontend signing
  const response: AgentExecuteResponse = {
    txHash: "0x" + "0".repeat(64),
    troveId: params.troveId,
    status: "pending",
  };

  res.json({ ...response, unsignedTx: txData });
}));

/**
 * @openapi
 * /api/agent/adjust-rate:
 *   post:
 *     tags: [Agent]
 *     summary: Adjust trove interest rate
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [userAddress, params]
 *             properties:
 *               userAddress: { type: string }
 *               params:
 *                 type: object
 *                 required: [branch, troveId, newInterestRate]
 *                 properties:
 *                   branch: { type: number }
 *                   troveId: { type: string }
 *                   newInterestRate: { type: string, description: "New rate in wei (1e16 = 1%)" }
 *                   maxUpfrontFee: { type: string }
 *               submit: { type: boolean }
 *     responses:
 *       200:
 *         description: Unsigned TX or submitted result
 */
agentRouter.post("/adjust-rate", asyncHandler(async (req: Request, res: Response) => {
  const { userAddress, params } = req.body;
  validateAddress(userAddress, "userAddress");
  validateBranchIndex(params.branch);
  validateRequired(params.troveId, "troveId");
  validateRequired(params.newInterestRate, "newInterestRate");

  const txData = await callCDPProvider("cdp.adjustTroveInterestRate", {
    branchIndex: params.branch,
    troveId: String(params.troveId),
    newInterestRate: params.newInterestRate,
    maxUpfrontFee: params.maxUpfrontFee || "0",
  }) as any;

  if (req.body.submit) {
    try {
      const { walletClient, publicClient } = getClients();

      const hash = await (walletClient as any).sendTransaction({
        to: txData.to as Address,
        data: txData.data as `0x${string}`,
        value: BigInt(txData.value || "0"),
        gas: 500_000n,
      });
      const receipt = await publicClient.waitForTransactionReceipt({ hash });

      return res.json({
        txHash: hash,
        status: receipt.status === "success" ? "success" : "failed",
        blockNumber: Number(receipt.blockNumber),
      });
    } catch (submitErr: any) {
      return res.status(500).json({
        error: `TX submission failed: ${submitErr.message}`,
        unsignedTx: txData,
      });
    }
  }

  res.json({ unsignedTx: txData });
}));

/**
 * @openapi
 * /api/agent/settings:
 *   post:
 *     tags: [Agent]
 *     summary: Save agent settings for a user (strategy, permissions, auto flags)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [userAddress]
 *             properties:
 *               userAddress: { type: string }
 *               agentAddress: { type: string }
 *               strategy: { type: string, enum: [conservative, moderate, aggressive] }
 *               minCR: { type: number }
 *               autoRebalance: { type: boolean }
 *               autoRateAdjust: { type: boolean }
 *               branch: { type: number }
 *     responses:
 *       200:
 *         description: Settings saved and position registered with monitor
 */
agentRouter.post("/settings", asyncHandler(async (req: Request, res: Response) => {
  const {
    userAddress,
    agentAddress,
    strategy = "conservative",
    minCR,
    autoRebalance = true,
    autoRateAdjust = true,
    branch,
  } = req.body;

  validateAddress(userAddress, "userAddress");

  // Register/update position with monitor
  const monitor = req.app.locals.monitor;
  if (monitor) {
    monitor.addPosition(
      userAddress,
      strategy,
      agentAddress || `agent-${Date.now()}`,
    );
  }

  res.json({
    status: "saved",
    userAddress,
    strategy,
    minCR,
    autoRebalance,
    autoRateAdjust,
    branch,
    registeredWithMonitor: !!monitor,
  });
}));

// POST /api/agent/adjust
agentRouter.post("/adjust", asyncHandler(async (req: Request, res: Response) => {
  // Rewrite as adjustTrove and forward to execute
  req.body.action = "adjustTrove";
  const handler = agentRouter.stack.find((l: any) => l.route?.path === "/execute")?.route?.stack?.[0]?.handle;
  if (handler) return handler(req, res, () => {});
  res.status(500).json({ error: "Execute handler not found" });
}));

/**
 * @openapi
 * /api/agent/close:
 *   post:
 *     tags: [Agent]
 *     summary: Close a trove
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [userAddress, params]
 *             properties:
 *               userAddress: { type: string }
 *               params:
 *                 type: object
 *                 properties:
 *                   branch: { type: number }
 *                   troveId: { type: number }
 *     responses:
 *       200:
 *         description: Unsigned close trove TX
 */
agentRouter.post("/close", asyncHandler(async (req: Request, res: Response) => {
  const { userAddress, params } = req.body;
  validateAddress(userAddress, "userAddress");
  validateBranchIndex(params.branch);

  const txData = await callCDPProvider("cdp.closeTrove", {
    branchIndex: params.branch,
    troveId: params.troveId,
  });

  res.json({
    txHash: "0x" + "0".repeat(64),
    status: "pending",
    unsignedTx: txData,
  });
}));

// ─────────── Server Wallet (Privy) Endpoints ───────────

/**
 * @openapi
 * /api/agent/server-wallet:
 *   get:
 *     tags: [Agent]
 *     summary: Get server wallet status for a user
 *     parameters:
 *       - in: query
 *         name: userAddress
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Server wallet info or null
 */
agentRouter.get("/server-wallet", asyncHandler(async (req: Request, res: Response) => {
  const userAddress = req.query.userAddress as string;
  if (!userAddress) return res.status(400).json({ error: "userAddress required" });

  const wallet = getSW(userAddress);
  if (!wallet) return res.status(404).json(null);

  res.json(wallet);
}));

/**
 * @openapi
 * /api/agent/server-wallet:
 *   post:
 *     tags: [Agent]
 *     summary: Create/activate a server wallet for a user
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [userAddress, strategy]
 *             properties:
 *               userAddress: { type: string }
 *               strategy: { type: string, enum: [conservative, moderate, aggressive] }
 *               minCR: { type: number }
 *               autoRebalance: { type: boolean }
 *               autoRateAdjust: { type: boolean }
 *     responses:
 *       200:
 *         description: Server wallet created
 */
agentRouter.post("/server-wallet", asyncHandler(async (req: Request, res: Response) => {
  const { userAddress, strategy = "conservative", minCR = 200, autoRebalance = true, autoRateAdjust = true } = req.body;
  validateAddress(userAddress, "userAddress");

  const record = createSW({ userAddress, strategy, minCR, autoRebalance, autoRateAdjust });

  // Register with monitor
  const monitor = req.app.locals.monitor;
  if (monitor) {
    monitor.addPosition(userAddress, strategy, `privy-${Date.now()}`);
  }

  res.json(record);
}));

/**
 * @openapi
 * /api/agent/server-wallet:
 *   delete:
 *     tags: [Agent]
 *     summary: Deactivate a user's server wallet (stop agent)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [userAddress]
 *             properties:
 *               userAddress: { type: string }
 *     responses:
 *       200:
 *         description: Server wallet deactivated
 */
agentRouter.delete("/server-wallet", asyncHandler(async (req: Request, res: Response) => {
  const { userAddress } = req.body;
  validateAddress(userAddress, "userAddress");

  const success = deactivateSW(userAddress);

  // Remove from monitor
  const monitor = req.app.locals.monitor;
  if (monitor) {
    monitor.removePosition(userAddress);
  }

  res.json({ status: success ? "deactivated" : "not_found", userAddress });
}));
