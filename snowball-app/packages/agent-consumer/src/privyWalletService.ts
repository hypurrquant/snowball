import { PrivyClient } from "@privy-io/node";
import { createViemAccount } from "@privy-io/node/viem";
import {
  createWalletClient,
  createPublicClient,
  http,
  type Address,
  type WalletClient,
} from "viem";
import { creditcoinTestnet } from "@snowball/shared";
import { monitorLogger } from "./logger";

// ── Singleton Privy client ──────────────────────────────────

let _privyClient: PrivyClient | null = null;

function getPrivyClient(): PrivyClient {
  if (!_privyClient) {
    const appId = process.env.PRIVY_APP_ID;
    const appSecret = process.env.PRIVY_APP_SECRET;
    if (!appId || !appSecret) {
      throw new Error("PRIVY_APP_ID and PRIVY_APP_SECRET must be set");
    }
    _privyClient = new PrivyClient({ appId, appSecret });
  }
  return _privyClient;
}

// ── Public helpers ──────────────────────────────────────────

/**
 * Check whether Privy env vars are configured.
 */
export function isPrivyConfigured(): boolean {
  return !!(process.env.PRIVY_APP_ID && process.env.PRIVY_APP_SECRET);
}

/**
 * Create a new Ethereum server wallet via Privy SDK.
 * Returns the wallet ID (for future signing) and the on-chain address.
 */
export async function createWalletForUser(): Promise<{
  walletId: string;
  address: Address;
}> {
  const privy = getPrivyClient();
  const wallet = await privy.wallets().create({ chain_type: "ethereum" });

  monitorLogger.info(
    { walletId: wallet.id, address: wallet.address },
    "Privy server wallet created",
  );

  return { walletId: wallet.id, address: wallet.address as Address };
}

/**
 * Build a viem WalletClient backed by a Privy server wallet.
 */
export async function getViemClientForWallet(
  walletId: string,
  address: Address,
): Promise<{ walletClient: WalletClient; publicClient: ReturnType<typeof createPublicClient> }> {
  const privy = getPrivyClient();

  const account = createViemAccount(privy, {
    walletId,
    address,
  });

  const walletClient = createWalletClient({
    account,
    chain: creditcoinTestnet,
    transport: http(),
  });

  const publicClient = createPublicClient({
    chain: creditcoinTestnet,
    transport: http(),
  });

  return { walletClient, publicClient };
}

/**
 * Simulate → send a transaction using a Privy server wallet.
 */
export async function executeAsWallet(
  walletId: string,
  address: Address,
  target: Address,
  calldata: `0x${string}`,
  gas?: bigint,
): Promise<{ txHash: string; success: boolean }> {
  const { walletClient, publicClient } = await getViemClientForWallet(walletId, address);

  // Simulate
  await publicClient.call({
    to: target,
    data: calldata,
    account: walletClient.account!,
  });

  // Send
  const hash = await (walletClient as any).sendTransaction({
    to: target,
    data: calldata,
    gas: gas ?? 500_000n,
  });

  const receipt = await publicClient.waitForTransactionReceipt({ hash });

  monitorLogger.info(
    { walletId, target, txHash: hash, status: receipt.status },
    `executeAsWallet ${receipt.status === "success" ? "succeeded" : "reverted"}`,
  );

  return { txHash: hash, success: receipt.status === "success" };
}
