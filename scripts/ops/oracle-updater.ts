/**
 * Oracle Price Updater
 * Updates all 3 CreditcoinOracle contracts with fresh USD prices.
 *
 * Usage:
 *   NODE_PATH=apps/web/node_modules npx tsx scripts/ops/oracle-updater.ts
 *
 * Requires DEPLOYER_PRIVATE_KEY in .env (project root)
 */

import * as path from "path";
import * as fs from "fs";
import { createWalletClient, createPublicClient, http, type Address } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { defineChain } from "viem";
import { fetchPrices, priceToOracle } from "./price-source";

// ─── Load .env from project root ───
const envPath = path.resolve(__dirname, "../../.env");
if (fs.existsSync(envPath)) {
  const raw = fs.readFileSync(envPath, "utf8");
  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const idx = trimmed.indexOf("=");
    if (idx === -1) continue;
    const key = trimmed.slice(0, idx).trim();
    const val = trimmed.slice(idx + 1).trim().replace(/^["']|["']$/g, "");
    if (!(key in process.env)) process.env[key] = val;
  }
}

// ─── Chain ───
const creditcoinTestnet = defineChain({
  id: 102031,
  name: "Creditcoin Testnet",
  nativeCurrency: { name: "CTC", symbol: "CTC", decimals: 18 },
  rpcUrls: { default: { http: ["https://rpc.cc3-testnet.creditcoin.network"] } },
});

// ─── Oracle ABI ───
const CreditcoinOracleABI = [
  {
    type: "function",
    name: "setPrice",
    inputs: [{ name: "newPrice", type: "uint256" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "price",
    inputs: [],
    outputs: [{ type: "uint256" }],
    stateMutability: "view",
  },
] as const;

// ─── Oracle addresses (from addresses.ts LEND.oracles) ───
const ORACLES: Array<{ token: string; address: Address }> = [
  { token: "wCTC",   address: "0xbd2c8afda5fa753669c5dd03885a45a3612171af" },
  { token: "lstCTC", address: "0xa9aeac36aab8ce93fe4a3d63cf6b1d263dd2eb31" },
  { token: "sbUSD",  address: "0xf82396f39e93d77802bfecc33344faafc4df50f2" },
];

function formatPrice(raw: bigint): string {
  // Display as human-readable USD (divide by 1e36)
  const usd = Number(raw) / 1e36;
  return `$${usd.toFixed(4)}`;
}

async function main() {
  const privateKey = process.env.DEPLOYER_PRIVATE_KEY;
  if (!privateKey) {
    console.error("ERROR: DEPLOYER_PRIVATE_KEY not set in environment or .env");
    process.exit(1);
  }

  const account = privateKeyToAccount(privateKey as `0x${string}`);
  const transport = http("https://rpc.cc3-testnet.creditcoin.network");
  const pub = createPublicClient({ chain: creditcoinTestnet, transport });
  const wallet = createWalletClient({ account, chain: creditcoinTestnet, transport });

  console.log(`[oracle-updater] ${new Date().toISOString()}`);
  console.log(`Deployer: ${account.address}`);

  // Fetch prices
  console.log("\nFetching prices...");
  const prices = await fetchPrices();
  console.log(
    `  wCTC=$${prices.wCTC.toFixed(4)}  lstCTC=$${prices.lstCTC.toFixed(4)}  sbUSD=$${prices.sbUSD.toFixed(4)}  USDC=$${prices.USDC.toFixed(4)}`
  );

  const newPrices: Record<string, bigint> = {
    wCTC: priceToOracle(prices.wCTC),
    lstCTC: priceToOracle(prices.lstCTC),
    sbUSD: priceToOracle(prices.sbUSD),
    USDC: priceToOracle(prices.USDC),
  };

  let successCount = 0;
  let failCount = 0;

  console.log("\nUpdating oracles...");

  for (const oracle of ORACLES) {
    const newPrice = newPrices[oracle.token];
    try {
      // Read current price
      const oldPrice = await pub.readContract({
        address: oracle.address,
        abi: CreditcoinOracleABI,
        functionName: "price",
      });

      // Send update tx
      const hash = await wallet.writeContract({
        address: oracle.address,
        abi: CreditcoinOracleABI,
        functionName: "setPrice",
        args: [newPrice],
        gas: 200_000n,
      });

      const rx = await pub.waitForTransactionReceipt({ hash });
      if (rx.status !== "success") throw new Error("transaction reverted");

      console.log(
        `  [${oracle.token}] ${formatPrice(oldPrice)} -> ${formatPrice(newPrice)} | tx: ${hash}`
      );
      successCount++;
    } catch (err) {
      console.error(
        `  [${oracle.token}] FAILED: ${(err as Error).message}`
      );
      failCount++;
    }
  }

  console.log(
    `\nDone: ${successCount} updated, ${failCount} failed.`
  );
  process.exit(failCount === ORACLES.length ? 1 : 0);
}

main();
