/**
 * Seed Round 2: Fill remaining gaps from first seed run.
 *   - lstCTC trove (oracle freshness fix)
 *   - lstCTC/sbUSD Morpho supply
 *   - wCTC vault deposit
 */
import {
  createPublicClient, createWalletClient, http, parseEther, formatEther,
  type Address, type Abi, type Hash,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import * as fs from "fs";
import * as path from "path";
import * as dotenv from "dotenv";

dotenv.config({ path: path.join(__dirname, "../../../.env") });

const creditcoinTestnet = {
  id: 102031, name: "Creditcoin Testnet" as const,
  nativeCurrency: { name: "CTC", symbol: "tCTC", decimals: 18 },
  rpcUrls: { default: { http: ["https://rpc.cc3-testnet.creditcoin.network" as const] } },
  testnet: true,
} as const;

function loadAbi(pkg: string, name: string): Abi {
  const p = path.join(__dirname, `../../${pkg}/out/${name}.sol/${name}.json`);
  return JSON.parse(fs.readFileSync(p, "utf8")).abi;
}

const PRIVATE_KEY = process.env.DEPLOYER_PRIVATE_KEY || process.env.ADMIN_PRIVATE_KEY;
if (!PRIVATE_KEY) { console.error("Set DEPLOYER_PRIVATE_KEY in .env"); process.exit(1); }

const account = privateKeyToAccount(PRIVATE_KEY as `0x${string}`);
const publicClient = createPublicClient({ chain: creditcoinTestnet as any, transport: http() });
const walletClient = createWalletClient({ account, chain: creditcoinTestnet as any, transport: http() });

const ZERO = "0x0000000000000000000000000000000000000000" as Address;
const MAX = parseEther("999999999");

async function send(address: Address, abi: Abi, fn: string, args: any[] = [], gas = 5_000_000n): Promise<Hash> {
  const hash = await walletClient.writeContract({ address, abi, functionName: fn, args, gas });
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  if (receipt.status !== "success") throw new Error(`TX ${fn} failed`);
  return hash;
}

async function main() {
  const deployDir = path.join(__dirname, "../../../deployments/creditcoin-testnet");
  const liquityAddrs = JSON.parse(fs.readFileSync(path.join(deployDir, "liquity.json"), "utf8"));
  const morphoAddrs = JSON.parse(fs.readFileSync(path.join(deployDir, "morpho.json"), "utf8"));
  const integrationAddrs = JSON.parse(fs.readFileSync(path.join(deployDir, "integration.json"), "utf8"));
  const yieldAddrs = JSON.parse(fs.readFileSync(path.join(deployDir, "yield.json"), "utf8"));

  const WCTC = liquityAddrs.tokens.wCTC as Address;
  const LSTCTC = liquityAddrs.tokens.lstCTC as Address;
  const SBUSD = liquityAddrs.tokens.sbUSD as Address;
  const MORPHO = morphoAddrs.core.morpho as Address;
  const IRM = morphoAddrs.core.adaptiveCurveIRM as Address;
  const ORACLE_LSTCTC = morphoAddrs.oracles.lstCTC as Address;
  const ORACLE = integrationAddrs.oracle.snowballOracle as Address;
  const BO_LSTCTC = liquityAddrs.branches.lstCTC.borrowerOperations as Address;
  const VAULT_WCTC_M = yieldAddrs.vaults["sv2wCTC-M"].vault as Address;

  const erc20Abi = loadAbi("liquity", "MockWCTC");
  const boAbi = loadAbi("liquity", "BorrowerOperations");
  const morphoAbi = loadAbi("morpho", "Morpho");
  const oracleAbi = loadAbi("integration", "SnowballOracle");
  const vaultAbi = loadAbi("yield", "SnowballYieldVaultV2");

  const balance = await publicClient.getBalance({ address: account.address });
  console.log(`Deployer: ${account.address}`);
  console.log(`Balance: ${formatEther(balance)} tCTC\n`);

  // ═══ 1. lstCTC Trove ═══
  console.log("═══ 1. lstCTC Trove ═══");
  // Approve lstCTC (collateral), wCTC (gas compensation = 200 WETH), and sbUSD (upfront fee)
  await send(LSTCTC, erc20Abi, "approve", [BO_LSTCTC, MAX]);
  await send(WCTC, erc20Abi, "approve", [BO_LSTCTC, MAX]);
  await send(SBUSD, erc20Abi, "approve", [BO_LSTCTC, MAX]);
  console.log("  Approved lstCTC + wCTC + sbUSD for BO_LSTCTC");
  // Refresh oracle IMMEDIATELY before openTrove
  await send(ORACLE, oracleAbi, "updatePrice", [LSTCTC, parseEther("0.2")]);
  await send(ORACLE, oracleAbi, "updatePrice", [SBUSD, parseEther("1")]);
  try {
    await send(BO_LSTCTC, boAbi, "openTrove", [
      account.address, 0n, parseEther("100000"), parseEther("8000"),
      0n, 0n, parseEther("0.05"), parseEther("1000"),
      ZERO, ZERO, ZERO,
    ], 10_000_000n);
    console.log("  lstCTC Trove opened: 100K lstCTC → 8K sbUSD");
  } catch (e: any) {
    console.log(`  lstCTC Trove: ${e.message?.slice(0, 200)}`);
  }

  // ═══ 2. Supply sbUSD to lstCTC/sbUSD Morpho market ═══
  console.log("\n═══ 2. Morpho lstCTC/sbUSD ═══");
  await send(SBUSD, erc20Abi, "approve", [MORPHO, MAX]);
  await send(ORACLE, oracleAbi, "updatePrice", [LSTCTC, parseEther("0.2")]);
  const mpLstCTC = [SBUSD, LSTCTC, ORACLE_LSTCTC, IRM, parseEther("0.80")];
  try {
    await send(MORPHO, morphoAbi, "supply", [mpLstCTC, parseEther("5000"), 0n, account.address, "0x"], 10_000_000n);
    console.log("  Supplied 5K sbUSD to lstCTC/sbUSD market");
  } catch (e: any) {
    console.log(`  lstCTC/sbUSD supply: ${e.message?.slice(0, 120)}`);
  }

  // ═══ 3. Deposit wCTC into Yield V2 vault ═══
  console.log("\n═══ 3. wCTC Vault ═══");
  await send(WCTC, erc20Abi, "approve", [VAULT_WCTC_M, MAX]);
  // Refresh oracle for Morpho (strategy deposits into Morpho)
  await send(ORACLE, oracleAbi, "updatePrice", [WCTC, parseEther("0.2")]);
  try {
    await send(VAULT_WCTC_M, vaultAbi, "deposit", [parseEther("5000"), account.address], 10_000_000n);
    console.log("  Deposited 5K wCTC → sv2wCTC-M");
  } catch (e: any) {
    console.log(`  sv2wCTC-M deposit: ${e.message?.slice(0, 120)}`);
  }

  // Final balances
  const sbUSD = await publicClient.readContract({ address: SBUSD, abi: erc20Abi, functionName: "balanceOf", args: [account.address] });
  const wctc = await publicClient.readContract({ address: WCTC, abi: erc20Abi, functionName: "balanceOf", args: [account.address] });
  const lstctc = await publicClient.readContract({ address: LSTCTC, abi: erc20Abi, functionName: "balanceOf", args: [account.address] });
  console.log(`\n═══ Final Balances ═══`);
  console.log(`  sbUSD:  ${formatEther(sbUSD as bigint)}`);
  console.log(`  wCTC:   ${formatEther(wctc as bigint)}`);
  console.log(`  lstCTC: ${formatEther(lstctc as bigint)}`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => { console.error("FAILED:", err.message || err); process.exit(1); });
