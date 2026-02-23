import { type Address, encodeFunctionData, parseAbi } from "viem";
import { getClients } from "./walletHelper";
import { monitorLogger } from "./logger";
import { SmartAccountABI } from "@snowball/shared";

/**
 * In-memory store of user server wallet registrations.
 * In production, this would be backed by a database.
 *
 * SmartAccount-based delegation:
 * - Users deploy a SmartAccount on-chain and authorize the agent wallet
 * - The agent backend calls SmartAccount.execute(target, calldata) so that
 *   msg.sender = SmartAccount (which is the trove owner), passing BorrowerOperations checks
 * - This store tracks which users have opted-in and their preferences
 */
interface ServerWalletRecord {
  userAddress: string;
  serverWalletAddress: string; // The agent's admin wallet
  smartAccountAddress: string; // User's SmartAccount (trove owner)
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
 */
export function createServerWallet(params: {
  userAddress: string;
  smartAccountAddress?: string;
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
    smartAccountAddress: params.smartAccountAddress || "",
    strategy: params.strategy,
    minCR: params.minCR,
    autoRebalance: params.autoRebalance ?? true,
    autoRateAdjust: params.autoRateAdjust ?? true,
    active: true,
    createdAt: new Date().toISOString(),
  };

  serverWallets.set(key, record);
  monitorLogger.info(
    { userAddress: params.userAddress, strategy: params.strategy, smartAccount: params.smartAccountAddress },
    "Server wallet created (SmartAccount)",
  );
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
 * Execute a transaction via SmartAccount.execute().
 * agent → SmartAccount.execute(target, calldata) → target receives msg.sender = SmartAccount
 */
export async function executeViaSmartAccount(
  smartAccountAddress: Address,
  target: Address,
  calldata: `0x${string}`,
  gas?: bigint,
): Promise<{ txHash: string; success: boolean }> {
  const { walletClient, publicClient } = getClients();

  const smartAccountAbi = parseAbi(SmartAccountABI as unknown as string[]);

  // Encode SmartAccount.execute(target, calldata)
  const outerCalldata = encodeFunctionData({
    abi: smartAccountAbi,
    functionName: "execute",
    args: [target, calldata],
  });

  try {
    // Simulate
    await publicClient.call({
      to: smartAccountAddress,
      data: outerCalldata,
      account: walletClient.account!,
    });

    // Execute
    const hash = await (walletClient as any).sendTransaction({
      to: smartAccountAddress,
      data: outerCalldata,
      gas: gas ?? 800_000n,
    });

    const receipt = await publicClient.waitForTransactionReceipt({ hash });

    monitorLogger.info(
      { smartAccount: smartAccountAddress, target, txHash: hash, status: receipt.status },
      `executeViaSmartAccount ${receipt.status === "success" ? "succeeded" : "reverted"}`,
    );

    return {
      txHash: hash,
      success: receipt.status === "success",
    };
  } catch (err: any) {
    monitorLogger.error(
      { smartAccount: smartAccountAddress, target, error: err.message },
      "executeViaSmartAccount failed",
    );
    throw err;
  }
}

/**
 * Legacy executeForUser — now routes through SmartAccount if available.
 */
export async function executeForUser(
  target: Address,
  calldata: `0x${string}`,
  gas?: bigint,
  userAddress?: string,
): Promise<{ txHash: string; success: boolean }> {
  // If user has a SmartAccount, route through it
  if (userAddress) {
    const record = getServerWallet(userAddress);
    if (record?.smartAccountAddress) {
      return executeViaSmartAccount(
        record.smartAccountAddress as Address,
        target,
        calldata,
        gas,
      );
    }
  }

  // Fallback: direct execution (for backwards compatibility)
  const { walletClient, publicClient } = getClients();

  try {
    await publicClient.call({
      to: target,
      data: calldata,
      account: walletClient.account!,
    });

    const hash = await (walletClient as any).sendTransaction({
      to: target,
      data: calldata,
      gas: gas ?? 500_000n,
    });

    const receipt = await publicClient.waitForTransactionReceipt({ hash });

    monitorLogger.info(
      { target, txHash: hash, status: receipt.status },
      `executeForUser (direct) ${receipt.status === "success" ? "succeeded" : "reverted"}`,
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
 * Get SmartAccount address for a registered user.
 */
export function getSmartAccountAddress(userAddress: string): string | null {
  const record = serverWallets.get(userAddress.toLowerCase());
  if (!record?.active) return null;
  return record.smartAccountAddress || null;
}

/**
 * Get all active registered users (for monitor polling).
 */
export function getActiveUsers(): ServerWalletRecord[] {
  return Array.from(serverWallets.values()).filter((r) => r.active);
}
