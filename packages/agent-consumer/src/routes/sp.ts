import { Router, type Request, type Response, type NextFunction } from "express";
import { parseAbi, type Address } from "viem";
import { callCDPProvider } from "../a2aClient";
import { getClients } from "../walletHelper";
import { SbUSDTokenABI } from "@snowball/shared";
import {
  validateAddress,
  validateBranchIndex,
  validatePositiveBigInt,
} from "@snowball/shared";

const asyncHandler = (fn: Function) => (req: Request, res: Response, next: NextFunction) =>
  Promise.resolve(fn(req, res, next)).catch(next);

export const spRouter = Router();

/**
 * @openapi
 * /api/sp/deposit:
 *   post:
 *     tags: [Stability Pool]
 *     summary: Deposit sbUSD to stability pool
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [branchIndex, amount, userAddress]
 *             properties:
 *               branchIndex: { type: number, enum: [0, 1] }
 *               amount: { type: string }
 *               userAddress: { type: string }
 *               submit: { type: boolean }
 *     responses:
 *       200:
 *         description: Unsigned TX or submission result
 */
spRouter.post("/deposit", asyncHandler(async (req: Request, res: Response) => {
  const { branchIndex: rawBranch, amount: rawAmount, userAddress: rawAddr } = req.body;
  const branchIndex = validateBranchIndex(rawBranch);
  const amount = validatePositiveBigInt(rawAmount, "amount");
  const userAddress = validateAddress(rawAddr, "userAddress");

  const txData = await callCDPProvider("sp.deposit", { branchIndex, amount }) as any;

  if (req.body.submit) {
    const { walletClient, publicClient } = getClients();
    const { getAddresses } = await import("../addresses");
    const addresses = getAddresses();
    const branchData = branchIndex === 1 ? addresses.branches.lstCTC : addresses.branches.wCTC;

    // Approve sbUSD for stability pool
    const approveTx = await (walletClient as any).writeContract({
      address: addresses.tokens.sbUSD as Address,
      abi: parseAbi(SbUSDTokenABI as unknown as string[]),
      functionName: "approve",
      args: [branchData.stabilityPool as Address, BigInt(amount)],
    });
    await publicClient.waitForTransactionReceipt({ hash: approveTx });

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
  }

  res.json({ unsignedTx: txData });
}));

/**
 * @openapi
 * /api/sp/withdraw:
 *   post:
 *     tags: [Stability Pool]
 *     summary: Withdraw from stability pool
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [branchIndex, amount, userAddress]
 *             properties:
 *               branchIndex: { type: number }
 *               amount: { type: string }
 *               userAddress: { type: string }
 *               submit: { type: boolean }
 *     responses:
 *       200:
 *         description: Unsigned TX or submission result
 */
spRouter.post("/withdraw", asyncHandler(async (req: Request, res: Response) => {
  const { branchIndex: rawBranch, amount: rawAmount, userAddress: rawAddr } = req.body;
  const branchIndex = validateBranchIndex(rawBranch);
  const amount = validatePositiveBigInt(rawAmount, "amount");
  const userAddress = validateAddress(rawAddr, "userAddress");

  const txData = await callCDPProvider("sp.withdraw", { branchIndex, amount }) as any;

  if (req.body.submit) {
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
  }

  res.json({ unsignedTx: txData });
}));

/**
 * @openapi
 * /api/sp/claim:
 *   post:
 *     tags: [Stability Pool]
 *     summary: Claim stability pool rewards
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [branchIndex, userAddress]
 *             properties:
 *               branchIndex: { type: number }
 *               userAddress: { type: string }
 *               submit: { type: boolean }
 *     responses:
 *       200:
 *         description: Unsigned TX or submission result
 */
spRouter.post("/claim", asyncHandler(async (req: Request, res: Response) => {
  const { branchIndex: rawBranch, userAddress: rawAddr } = req.body;
  const branchIndex = validateBranchIndex(rawBranch);
  const userAddress = validateAddress(rawAddr, "userAddress");

  const txData = await callCDPProvider("sp.claim", { branchIndex }) as any;

  if (req.body.submit) {
    const { walletClient, publicClient } = getClients();

    const hash = await (walletClient as any).sendTransaction({
      to: txData.to as Address,
      data: txData.data as `0x${string}`,
      value: BigInt(txData.value || "0"),
      gas: 300_000n,
    });
    const receipt = await publicClient.waitForTransactionReceipt({ hash });

    return res.json({
      txHash: hash,
      status: receipt.status === "success" ? "success" : "failed",
      blockNumber: Number(receipt.blockNumber),
    });
  }

  res.json({ unsignedTx: txData });
}));
