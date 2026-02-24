import { Router, type Request, type Response, type NextFunction } from "express";
import { parseAbi, type Address } from "viem";
import {
  MockPriceFeedABI,
  MockWCTCABI,
} from "@snowball/shared";
import {
  validateRequired,
  validateBranchIndex,
  validateAddress,
  validatePositiveBigInt,
  ValidationError,
} from "@snowball/shared";
import { getAddresses } from "../addresses";
import { getClients } from "../walletHelper";

const asyncHandler = (fn: Function) => (req: Request, res: Response, next: NextFunction) =>
  Promise.resolve(fn(req, res, next)).catch(next);

export const adminRouter = Router();

/**
 * @openapi
 * /api/admin/set-price:
 *   post:
 *     tags: [Admin]
 *     summary: Set mock price feed (testnet only)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [branch, price]
 *             properties:
 *               branch: { type: number, enum: [0, 1] }
 *               price: { type: string }
 *     responses:
 *       200:
 *         description: TX hash
 */
adminRouter.post("/set-price", asyncHandler(async (req: Request, res: Response) => {
  const branch = validateBranchIndex(req.body.branch);
  validateRequired(req.body.price, "price");
  const addresses = getAddresses();
  const branchData = branch === 1 ? addresses.branches.lstCTC : addresses.branches.wCTC;

  const { walletClient } = getClients();
  const hash = await (walletClient as any).writeContract({
    address: branchData.priceFeed as Address,
    abi: parseAbi(MockPriceFeedABI as unknown as string[]),
    functionName: "setPrice",
    args: [BigInt(req.body.price)],
  });

  res.json({ txHash: hash, status: "success" });
}));

/**
 * @openapi
 * /api/admin/mint-tokens:
 *   post:
 *     tags: [Admin]
 *     summary: Mint test tokens (testnet only)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [token, to, amount]
 *             properties:
 *               token: { type: string, enum: [wCTC, lstCTC] }
 *               to: { type: string }
 *               amount: { type: string }
 *     responses:
 *       200:
 *         description: TX hash
 */
adminRouter.post("/mint-tokens", asyncHandler(async (req: Request, res: Response) => {
  const { token, to, amount } = req.body;
  validateRequired(token, "token");
  validateAddress(to, "to");
  validatePositiveBigInt(amount, "amount");
  const addresses = getAddresses();

  let tokenAddress: string;
  if (token === "wCTC") {
    tokenAddress = addresses.tokens.wCTC;
  } else if (token === "lstCTC") {
    tokenAddress = addresses.tokens.lstCTC;
  } else {
    throw new ValidationError("Invalid token. Use 'wCTC' or 'lstCTC'");
  }

  const { walletClient } = getClients();
  const hash = await (walletClient as any).writeContract({
    address: tokenAddress as Address,
    abi: parseAbi(MockWCTCABI as unknown as string[]),
    functionName: "mint",
    args: [to as Address, BigInt(amount)],
  });

  res.json({ txHash: hash, status: "success" });
}));

/**
 * @openapi
 * /api/admin/set-exchange-rate:
 *   post:
 *     tags: [Admin]
 *     summary: Set lstCTC exchange rate (testnet only)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [rate]
 *             properties:
 *               rate: { type: string }
 *     responses:
 *       200:
 *         description: TX hash
 */
adminRouter.post("/set-exchange-rate", asyncHandler(async (req: Request, res: Response) => {
  validateRequired(req.body.rate, "rate");
  const addresses = getAddresses();

  const { walletClient } = getClients();
  const hash = await (walletClient as any).writeContract({
    address: addresses.tokens.lstCTC as Address,
    abi: parseAbi(["function setExchangeRate(uint256)"]),
    functionName: "setExchangeRate",
    args: [BigInt(req.body.rate)],
  });

  res.json({ txHash: hash, status: "success" });
}));
