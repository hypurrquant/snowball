import { type Address } from "viem";
import { getClients } from "./walletHelper";
import { monitorLogger } from "./logger";

/**
 * In-memory store of user server wallet registrations.
 * In production, this would be backed by a database.
 *
 * The "server wallet" concept with Privy:
 * - Users register their wallet + strategy settings via the frontend
 * - The agent backend (with its own admin wallet) executes transactions
 *   on behalf of users who have granted on-chain approvals
 * - This store tracks which users have opted-in and their preferences
 */
interface ServerWalletRecord {
  userAddress: string;
  serverWalletAddress: string; // The agent's admin wallet that acts on behalf of user
  strategy: string;
  minCR: number;
  autoRebalance: boolean;
  autoRateAdjust: boolean;
  active: boolean;
  createdAt: string;
}

const serverWallets = new Map<string, ServerWalletRecord>();

function getAgentWalletAddress(): string {
  const { walletClient } = getClients();
  return walletClient.account!.address;
}

/**
 * Create (register) a server wallet entry for a user.
 * The "server wallet" is actually the agent's admin wallet that will
 * execute transactions on behalf of the user.
 */
export function createServerWallet(params: {
  userAddress: string;
  strategy: string;
  minCR: number;
  autoRebalance: boolean;
  autoRateAdjust: boolean;
}): ServerWalletRecord {
  const key = params.userAddress.toLowerCase();
  const agentAddress = getAgentWalletAddress();

  const record: ServerWalletRecord = {
    userAddress: params.userAddress,
    serverWalletAddress: agentAddress,
    strategy: params.strategy,
    minCR: params.minCR,
    autoRebalance: params.autoRebalance ?? true,
    autoRateAdjust: params.autoRateAdjust ?? true,
    active: true,
    createdAt: new Date().toISOString(),
  };

  serverWallets.set(key, record);
  monitorLogger.info({ userAddress: params.userAddress, strategy: params.strategy }, "Server wallet created");
  return record;
}

/**
 * Get server wallet info for a user.
 */
export function getServerWallet(userAddress: string): ServerWalletRecord | null {
  const record = serverWallets.get(userAddress.toLowerCase());
  if (!record || !record.active) return null;
  return record;
}

/**
 * Deactivate (soft-delete) a user's server wallet registration.
 */
export function deactivateServerWallet(userAddress: string): boolean {
  const key = userAddress.toLowerCase();
  const record = serverWallets.get(key);
  if (!record) return false;

  record.active = false;
  serverWallets.set(key, record);
  monitorLogger.info({ userAddress }, "Server wallet deactivated");
  return true;
}

/**
 * Execute a transaction on behalf of a user using the agent's admin wallet.
 * The user must have previously approved the necessary token allowances
 * to the relevant contracts (BorrowerOperations, etc.).
 */
export async function executeForUser(
  target: Address,
  calldata: `0x${string}`,
  gas?: bigint,
): Promise<{ txHash: string; success: boolean }> {
  const { walletClient, publicClient } = getClients();

  try {
    // Simulate first
    await publicClient.call({
      to: target,
      data: calldata,
      account: walletClient.account!,
    });

    // Execute
    const hash = await (walletClient as any).sendTransaction({
      to: target,
      data: calldata,
      gas: gas ?? 500_000n,
    });

    const receipt = await publicClient.waitForTransactionReceipt({ hash });

    monitorLogger.info(
      { target, txHash: hash, status: receipt.status },
      `executeForUser ${receipt.status === "success" ? "succeeded" : "reverted"}`,
    );

    return {
      txHash: hash,
      success: receipt.status === "success",
    };
  } catch (err: any) {
    monitorLogger.error(
      { target, error: err.message },
      "executeForUser failed",
    );
    throw err;
  }
}

/**
 * Check if a user has an active server wallet registration.
 */
export function isUserRegistered(userAddress: string): boolean {
  const record = serverWallets.get(userAddress.toLowerCase());
  return !!record?.active;
}

/**
 * Get all active registered users (for monitor polling).
 */
export function getActiveUsers(): ServerWalletRecord[] {
  return Array.from(serverWallets.values()).filter((r) => r.active);
}
