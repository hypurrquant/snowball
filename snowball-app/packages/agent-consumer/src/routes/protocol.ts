import { Router, type Request, type Response, type NextFunction } from "express";
import { getProtocolStats, getMarkets } from "../chainReader";

const asyncHandler = (fn: Function) => (req: Request, res: Response, next: NextFunction) =>
  Promise.resolve(fn(req, res, next)).catch(next);

export const protocolRouter = Router();

/**
 * @openapi
 * /api/protocol/stats:
 *   get:
 *     tags: [Protocol]
 *     summary: Get aggregated protocol statistics
 *     responses:
 *       200:
 *         description: Protocol stats
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ProtocolStats'
 */
protocolRouter.get("/stats", asyncHandler(async (_req: Request, res: Response) => {
  const stats = await getProtocolStats();
  res.json(stats);
}));

/**
 * @openapi
 * /api/protocol/markets:
 *   get:
 *     tags: [Protocol]
 *     summary: Get market data for all collateral branches
 *     responses:
 *       200:
 *         description: Array of market data
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/MarketData'
 */
protocolRouter.get("/markets", asyncHandler(async (_req: Request, res: Response) => {
  const markets = await getMarkets();
  res.json(markets);
}));
