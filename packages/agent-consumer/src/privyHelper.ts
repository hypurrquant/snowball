import { type Address } from "viem";
import { getClients } from "./walletHelper";
import { monitorLogger } from "./logger";
import {
  isPrivyConfigured,
  createWalletForUser,
  executeAsWallet,
} from "./privyWalletService";

/**
 * In-memory store of user server wallet registrations.
 * In production, this would be backed by a database.
 *
 * With Privy integration each user gets a unique server wallet
 * (the server wallet becomes the trove owner so msg.sender checks pass).
 * When Privy is not configured, falls back to the shared admin wallet.
 */
interface ServerWalletRecord {
  userAddress: string;
  serverWalletAddress: string;
  privyWalletId: string | null; // null = admin-wallet fallback
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
 *
 * - If Privy is configured → creates a per-user Privy server wallet.
 * - Otherwise → falls back to the shared admin wallet (legacy behaviour).
 */
export async function createServerWallet(params: {
  userAddress: string;
  strategy: string;
  minCR: number;
  autoRebalance: boolean;
  autoRateAdjust: boolean;
}): Promise<ServerWalletRecord> {
  const key = params.userAddress.toLowerCase();

  let serverWalletAddress: string;
  let privyWalletId: string | null = null;

  if (isPrivyConfigured()) {
    const wallet = await createWalletForUser();
    serverWalletAddress = wallet.address;
    privyWalletId = wallet.walletId;
    monitorLogger.info(
      { userAddress: params.userAddress, privyWalletId, serverWalletAddress },
      "Privy server wallet assigned to user",
    );
  } else {
    serverWalletAddress = getAgentWalletAddress();
    monitorLogger.info(
      { userAddress: params.userAddress, serverWalletAddress },
      "Privy not configured — using admin wallet fallback",
    );
  }

  const record: ServerWalletRecord = {
    userAddress: params.userAddress,
    serverWalletAddress,
    privyWalletId,
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
 * Execute a transaction on behalf of a user.
 *
 * - If the user has a Privy wallet → route through Privy SDK
 *   (msg.sender = per-user server wallet = trove owner ✅)
 * - Otherwise → use the shared admin wallet (legacy)
 */
export async function executeForUser(
  userAddress: string,
  target: Address,
  calldata: `0x${string}`,
  gas?: bigint,
): Promise<{ txHash: string; success: boolean }> {
  const record = serverWallets.get(userAddress.toLowerCase());

  // Route via Privy server wallet when available
  if (record?.privyWalletId) {
    return executeAsWallet(
      record.privyWalletId,
      record.serverWalletAddress as Address,
      target,
      calldata,
      gas,
    );
  }

  // Fallback: admin wallet
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
      `executeForUser (admin fallback) ${receipt.status === "success" ? "succeeded" : "reverted"}`,
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
