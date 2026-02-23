import { Router, type Request, type Response, type NextFunction } from "express";
import { getUserPositions, getUserBalance, getUserSPDeposits } from "../chainReader";
import { validateAddress, NotFoundError } from "@snowball/shared";

const asyncHandler = (fn: Function) => (req: Request, res: Response, next: NextFunction) =>
  Promise.resolve(fn(req, res, next)).catch(next);

export const userRouter = Router();

/**
 * @openapi
 * /api/user/{address}/positions:
 *   get:
 *     tags: [User]
 *     summary: Get user positions across all branches
 *     parameters:
 *       - name: address
 *         in: path
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Array of user positions
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/UserPosition'
 */
userRouter.get("/:address/positions", asyncHandler(async (req: Request, res: Response) => {
  const address = validateAddress(req.params.address);
  const positions = await getUserPositions(address);
  res.json(positions);
}));

/**
 * @openapi
 * /api/user/{address}/trove/{id}:
 *   get:
 *     tags: [User]
 *     summary: Get a specific trove by ID
 *     parameters:
 *       - name: address
 *         in: path
 *         required: true
 *         schema: { type: string }
 *       - name: id
 *         in: path
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Single user position
 *       404:
 *         description: Trove not found
 */
userRouter.get("/:address/trove/:id", asyncHandler(async (req: Request, res: Response) => {
  const address = validateAddress(req.params.address);
  const positions = await getUserPositions(address);
  const trove = positions.find((p) => p.troveId === Number(req.params.id));
  if (!trove) {
    throw new NotFoundError("Trove not found");
  }
  res.json(trove);
}));

/**
 * @openapi
 * /api/user/{address}/sp-deposits:
 *   get:
 *     tags: [User]
 *     summary: Get user stability pool deposits
 *     parameters:
 *       - name: address
 *         in: path
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Array of SP deposits
 */
userRouter.get("/:address/sp-deposits", asyncHandler(async (req: Request, res: Response) => {
  const address = validateAddress(req.params.address);
  const deposits = await getUserSPDeposits(address);
  res.json(deposits);
}));

/**
 * @openapi
 * /api/user/{address}/balance:
 *   get:
 *     tags: [User]
 *     summary: Get user token balances
 *     parameters:
 *       - name: address
 *         in: path
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: User token balances
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UserBalance'
 */
userRouter.get("/:address/balance", asyncHandler(async (req: Request, res: Response) => {
  const address = validateAddress(req.params.address);
  const balance = await getUserBalance(address);
  res.json(balance);
}));
