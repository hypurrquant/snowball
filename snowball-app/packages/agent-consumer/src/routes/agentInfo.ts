import { Router, type Request, type Response, type NextFunction } from "express";
import { createPublicClient, http, parseAbi, type Address } from "viem";
import { creditcoinTestnet, ReputationRegistryABI } from "@snowball/shared";
import { getAgentList } from "../chainReader";
import { getAddresses } from "../addresses";

const asyncHandler = (fn: Function) => (req: Request, res: Response, next: NextFunction) =>
  Promise.resolve(fn(req, res, next)).catch(next);

const client = createPublicClient({
  chain: creditcoinTestnet,
  transport: http(),
});

export const agentInfoRouter = Router();

/**
 * @openapi
 * /api/agents:
 *   get:
 *     tags: [Agents]
 *     summary: List all registered agents
 *     responses:
 *       200:
 *         description: Array of agent info
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/AgentInfo'
 */
agentInfoRouter.get("/", asyncHandler(async (_req: Request, res: Response) => {
  const agents = await getAgentList();
  res.json(agents);
}));

/**
 * @openapi
 * /api/agents/{id}/reputation:
 *   get:
 *     tags: [Agents]
 *     summary: Get agent reputation score
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Agent reputation data
 */
agentInfoRouter.get("/:id/reputation", asyncHandler(async (req: Request, res: Response) => {
  const agentId = parseInt(req.params.id);
  const addresses = getAddresses();

  // Try fetching real reputation from ReputationRegistry
  if (addresses.erc8004) {
    try {
      const repAbi = parseAbi(ReputationRegistryABI as unknown as string[]);
      const [reputation, successRate] = await client.multicall({
        contracts: [
          {
            address: addresses.erc8004.reputationRegistry as Address,
            abi: repAbi,
            functionName: "getReputation",
            args: [BigInt(agentId), "overall"],
          },
          {
            address: addresses.erc8004.reputationRegistry as Address,
            abi: repAbi,
            functionName: "getSuccessRate",
            args: [BigInt(agentId), "overall"],
          },
        ],
      });

      if (reputation.status === "success" && reputation.result) {
        const rep = reputation.result as any;
        const totalInteractions = Number(rep.totalInteractions ?? rep[0] ?? 0);
        const score = Number(rep.reputationScore ?? rep[2] ?? 0) / (10 ** Number(rep.decimals ?? rep[3] ?? 2));
        const rate = successRate.status === "success" ? Number(successRate.result) / 100 : 0;

        return res.json({
          agentId,
          score,
          totalReviews: totalInteractions,
          successRate: rate,
          source: "on-chain",
        });
      }
    } catch {
      // Fall through to monitor-based stats
    }
  }

  // Compute from monitor events if available
  const monitor = req.app.locals.monitor;
  if (monitor) {
    const events = monitor.getEvents(String(agentId));
    const total = events.length;
    const ok = events.filter((e: any) => e.level === "OK").length;
    const rate = total > 0 ? ((ok / total) * 100) : 0;

    return res.json({
      agentId,
      score: total > 0 ? parseFloat((rate / 20).toFixed(1)) : 0, // 0-5 scale
      totalReviews: total,
      successRate: parseFloat(rate.toFixed(1)),
      source: "monitor",
    });
  }

  // No data available
  res.json({
    agentId,
    score: 0,
    totalReviews: 0,
    successRate: 0,
    source: "none",
  });
}));

/**
 * @openapi
 * /api/agents/{id}/history:
 *   get:
 *     tags: [Agents]
 *     summary: Get agent monitoring history
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema: { type: integer }
 *       - name: limit
 *         in: query
 *         schema: { type: integer, default: 20, maximum: 100 }
 *     responses:
 *       200:
 *         description: Agent event history
 */
agentInfoRouter.get("/:id/history", asyncHandler(async (req: Request, res: Response) => {
  const agentId = parseInt(req.params.id);
  const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
  const monitor = req.app.locals.monitor;

  if (monitor) {
    const events = monitor.getEvents(String(agentId), limit);
    return res.json({ agentId, history: events });
  }

  // No monitor — return empty
  res.json({ agentId, history: [] });
}));
