/**
 * Snowball Protocol — Liquidity Seeding Script
 *
 * Seeds the protocol with initial liquidity:
 *   1. Open troves (wCTC + lstCTC) to mint sbUSD
 *   2. Supply sbUSD to Morpho markets (lending liquidity)
 *   3. Deposit into Yield V2 vaults
 *
 * Usage: npx tsx scripts/seed-liquidity.ts
 */
import {
  createPublicClient,
  createWalletClient,
  http,
  parseEther,
  formatEther,
  type Address,
  type Abi,
  type Hash,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import * as fs from "fs";
import * as path from "path";
import * as dotenv from "dotenv";

dotenv.config({ path: path.join(__dirname, "../../../.env") });

// ─── Chain config ───
const creditcoinTestnet = {
  id: 102031,
  name: "Creditcoin Testnet" as const,
  nativeCurrency: { name: "CTC", symbol: "tCTC", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://rpc.cc3-testnet.creditcoin.network" as const] },
  },
  testnet: true,
} as const;

function loadArtifact(pkg: string, contractName: string, fileName?: string): { abi: Abi; bytecode: `0x${string}` } {
  const file = fileName || contractName;
  const p = path.join(__dirname, `../../${pkg}/out/${file}.sol/${contractName}.json`);
  const artifact = JSON.parse(fs.readFileSync(p, "utf8"));
  const bytecode = artifact.bytecode?.object ?? artifact.bytecode;
  return { abi: artifact.abi, bytecode: bytecode as `0x${string}` };
}

function loadAbi(pkg: string, contractName: string, fileName?: string): Abi {
  return loadArtifact(pkg, contractName, fileName).abi;
}

const PRIVATE_KEY = process.env.DEPLOYER_PRIVATE_KEY || process.env.ADMIN_PRIVATE_KEY;
if (!PRIVATE_KEY) { console.error("Set DEPLOYER_PRIVATE_KEY in .env"); process.exit(1); }

const account = privateKeyToAccount(PRIVATE_KEY as `0x${string}`);
const publicClient = createPublicClient({ chain: creditcoinTestnet as any, transport: http() });
const walletClient = createWalletClient({ account, chain: creditcoinTestnet as any, transport: http() });

const ZERO = "0x0000000000000000000000000000000000000000" as Address;

async function send(address: Address, abi: Abi, fn: string, args: any[] = [], gas = 5_000_000n): Promise<Hash> {
  const hash = await walletClient.writeContract({ address, abi, functionName: fn, args, gas });
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  if (receipt.status !== "success") throw new Error(`TX ${fn} failed`);
  return hash;
}

async function readContract(address: Address, abi: Abi, fn: string, args: any[] = []): Promise<any> {
  return await publicClient.readContract({ address, abi, functionName: fn, args });
}

// ─── Main ───
async function main() {
  const balance = await publicClient.getBalance({ address: account.address });
  console.log(`Deployer: ${account.address}`);
  console.log(`Balance: ${formatEther(balance)} tCTC\n`);

  // Load deployment addresses
  const deployDir = path.join(__dirname, "../../../deployments/creditcoin-testnet");
  const liquityAddrs = JSON.parse(fs.readFileSync(path.join(deployDir, "liquity.json"), "utf8"));
  const morphoAddrs = JSON.parse(fs.readFileSync(path.join(deployDir, "morpho.json"), "utf8"));
  const yieldAddrs = JSON.parse(fs.readFileSync(path.join(deployDir, "yield.json"), "utf8"));

  // Addresses
  const WCTC = liquityAddrs.tokens.wCTC as Address;
  const LSTCTC = liquityAddrs.tokens.lstCTC as Address;
  const SBUSD = liquityAddrs.tokens.sbUSD as Address;
  const USDC = morphoAddrs.tokens.mockUSDC as Address;
  const MORPHO = morphoAddrs.core.morpho as Address;
  const IRM = morphoAddrs.core.adaptiveCurveIRM as Address;
  const ORACLE_WCTC = morphoAddrs.oracles.wCTC as Address;
  const ORACLE_LSTCTC = morphoAddrs.oracles.lstCTC as Address;
  const ORACLE_SBUSD = morphoAddrs.oracles.sbUSD as Address;

  const BO_WCTC = liquityAddrs.branches.wCTC.borrowerOperations as Address;
  const BO_LSTCTC = liquityAddrs.branches.lstCTC.borrowerOperations as Address;
  const SP_WCTC = liquityAddrs.branches.wCTC.stabilityPool as Address;

  const integrationAddrs = JSON.parse(fs.readFileSync(path.join(deployDir, "integration.json"), "utf8"));
  const ORACLE = integrationAddrs.oracle.snowballOracle as Address;

  // Load ABIs
  const erc20Abi = loadAbi("liquity", "MockWCTC");
  const boAbi = loadAbi("liquity", "BorrowerOperations");
  const morphoAbi = loadAbi("morpho", "Morpho");
  const vaultAbi = loadAbi("yield", "SnowballYieldVaultV2");
  const oracleAbi = loadAbi("integration", "SnowballOracle");

  // ═══════════════════════════════════════════════════════════════
  // STEP 0: Refresh oracle prices (prevent stale price revert)
  // ═══════════════════════════════════════════════════════════════
  console.log("═══ Step 0: Refresh Oracle Prices ═══");
  await send(ORACLE, oracleAbi, "updatePrice", [WCTC, parseEther("0.2")]);
  await send(ORACLE, oracleAbi, "updatePrice", [LSTCTC, parseEther("0.2")]);
  await send(ORACLE, oracleAbi, "updatePrice", [SBUSD, parseEther("1")]);
  console.log("  Prices refreshed: wCTC=$0.20, lstCTC=$0.20, sbUSD=$1.00");

  // ═══════════════════════════════════════════════════════════════
  // STEP 1: Approve tokens for BorrowerOperations
  // ═══════════════════════════════════════════════════════════════
  console.log("\n═══ Step 1: Token Approvals ═══");
  const MAX = parseEther("999999999");
  await send(WCTC, erc20Abi, "approve", [BO_WCTC, MAX]);
  console.log("  wCTC → BorrowerOps(wCTC) approved");
  await send(LSTCTC, erc20Abi, "approve", [BO_LSTCTC, MAX]);
  console.log("  lstCTC → BorrowerOps(lstCTC) approved");

  // ═══════════════════════════════════════════════════════════════
  // STEP 2: Open troves to mint sbUSD
  //         Oracle price + openTrove must happen within maxPriceAge (120s)
  //         so we refresh price immediately before each trove open.
  // ═══════════════════════════════════════════════════════════════
  console.log("\n═══ Step 2: Open Troves ═══");

  const INTEREST_RATE = parseEther("0.05"); // 5%
  const MAX_UPFRONT_FEE = parseEther("1000");

  // wCTC trove: 100K wCTC collateral, borrow 9K sbUSD
  // 100K wCTC * $0.20 = $20,000 value, MCR 110% → max borrow $18,181
  const WCTC_COLL = parseEther("100000");
  const WCTC_DEBT = parseEther("9000");

  try {
    // Refresh price IMMEDIATELY before openTrove
    await send(ORACLE, oracleAbi, "updatePrice", [WCTC, parseEther("0.2")]);
    await send(ORACLE, oracleAbi, "updatePrice", [SBUSD, parseEther("1")]);
    const troveId0 = await send(BO_WCTC, boAbi, "openTrove", [
      account.address, 0n, WCTC_COLL, WCTC_DEBT,
      0n, 0n, INTEREST_RATE, MAX_UPFRONT_FEE,
      ZERO, ZERO, ZERO,
    ], 10_000_000n);
    console.log(`  wCTC Trove opened: 100K wCTC → 9K sbUSD`);
  } catch (e: any) {
    console.log(`  wCTC Trove: ${e.message?.slice(0, 120)}`);
  }

  // lstCTC trove: 100K lstCTC, borrow 8K sbUSD (MCR 120%)
  const LSTCTC_COLL = parseEther("100000");
  const LSTCTC_DEBT = parseEther("8000");

  try {
    await send(ORACLE, oracleAbi, "updatePrice", [LSTCTC, parseEther("0.2")]);
    await send(ORACLE, oracleAbi, "updatePrice", [SBUSD, parseEther("1")]);
    const troveId1 = await send(BO_LSTCTC, boAbi, "openTrove", [
      account.address, 0n, LSTCTC_COLL, LSTCTC_DEBT,
      0n, 0n, INTEREST_RATE, MAX_UPFRONT_FEE,
      ZERO, ZERO, ZERO,
    ], 10_000_000n);
    console.log(`  lstCTC Trove opened: 100K lstCTC → 8K sbUSD`);
  } catch (e: any) {
    console.log(`  lstCTC Trove: ${e.message?.slice(0, 120)}`);
  }

  // Check sbUSD balance
  const sbUSDBalance = await readContract(SBUSD, erc20Abi, "balanceOf", [account.address]);
  console.log(`  sbUSD balance: ${formatEther(sbUSDBalance as bigint)}`);

  // ═══════════════════════════════════════════════════════════════
  // STEP 3: Supply to Morpho markets (lending liquidity)
  // ═══════════════════════════════════════════════════════════════
  console.log("\n═══ Step 3: Morpho Market Seeding ═══");

  // Approve sbUSD and USDC for Morpho
  await send(SBUSD, erc20Abi, "approve", [MORPHO, MAX]);
  await send(USDC, erc20Abi, "approve", [MORPHO, MAX]);
  console.log("  Tokens approved for Morpho");

  // Refresh oracle before Morpho operations
  await send(ORACLE, oracleAbi, "updatePrice", [WCTC, parseEther("0.2")]);
  await send(ORACLE, oracleAbi, "updatePrice", [LSTCTC, parseEther("0.2")]);
  await send(ORACLE, oracleAbi, "updatePrice", [SBUSD, parseEther("1")]);

  // Supply 5000 sbUSD to wCTC/sbUSD market (as lender)
  const SBUSD_SUPPLY = parseEther("5000");
  const mpWCTC = [SBUSD, WCTC, ORACLE_WCTC, IRM, parseEther("0.77")];
  try {
    await send(MORPHO, morphoAbi, "supply", [mpWCTC, SBUSD_SUPPLY, 0n, account.address, "0x"], 10_000_000n);
    console.log(`  Supplied 5K sbUSD to wCTC/sbUSD market`);
  } catch (e: any) {
    console.log(`  wCTC/sbUSD supply: ${e.message?.slice(0, 80)}`);
  }

  // Supply 5000 sbUSD to lstCTC/sbUSD market
  const mpLstCTC = [SBUSD, LSTCTC, ORACLE_LSTCTC, IRM, parseEther("0.80")];
  try {
    await send(MORPHO, morphoAbi, "supply", [mpLstCTC, SBUSD_SUPPLY, 0n, account.address, "0x"], 10_000_000n);
    console.log(`  Supplied 5K sbUSD to lstCTC/sbUSD market`);
  } catch (e: any) {
    console.log(`  lstCTC/sbUSD supply: ${e.message?.slice(0, 80)}`);
  }

  // Mint and supply USDC to sbUSD/USDC market
  try {
    const usdcMockAbi = loadAbi("morpho", "ERC20Mock");
    await send(USDC, usdcMockAbi, "mint", [account.address, parseEther("100000")]);
    console.log("  Minted 100K USDC");
  } catch (e: any) {
    console.log(`  USDC mint: ${e.message?.slice(0, 80)}`);
  }

  const USDC_SUPPLY = parseEther("10000");
  const mpUSDC = [USDC, SBUSD, ORACLE_SBUSD, IRM, parseEther("0.86")];
  try {
    await send(MORPHO, morphoAbi, "supply", [mpUSDC, USDC_SUPPLY, 0n, account.address, "0x"], 10_000_000n);
    console.log(`  Supplied 10K USDC to sbUSD/USDC market`);
  } catch (e: any) {
    console.log(`  sbUSD/USDC supply: ${e.message?.slice(0, 80)}`);
  }

  // ═══════════════════════════════════════════════════════════════
  // STEP 4: Seed Yield V2 Vaults
  // ═══════════════════════════════════════════════════════════════
  console.log("\n═══ Step 4: Yield V2 Vault Deposits ═══");

  const VAULT_SBUSD_SP = yieldAddrs.vaults["sv2SbUSD-SP"].vault as Address;
  const VAULT_SBUSD_M = yieldAddrs.vaults["sv2SbUSD-M"].vault as Address;
  const VAULT_WCTC_M = yieldAddrs.vaults["sv2wCTC-M"].vault as Address;

  // Approve vaults
  await send(SBUSD, erc20Abi, "approve", [VAULT_SBUSD_SP, MAX]);
  await send(SBUSD, erc20Abi, "approve", [VAULT_SBUSD_M, MAX]);
  await send(WCTC, erc20Abi, "approve", [VAULT_WCTC_M, MAX]);

  // Deposit 500 sbUSD into StabilityPool vault
  const SBUSD_VAULT_AMOUNT = parseEther("500");
  try {
    await send(VAULT_SBUSD_SP, vaultAbi, "deposit", [SBUSD_VAULT_AMOUNT, account.address], 10_000_000n);
    console.log(`  Deposited 500 sbUSD → sv2SbUSD-SP`);
  } catch (e: any) {
    console.log(`  sv2SbUSD-SP deposit: ${e.message?.slice(0, 80)}`);
  }

  // Deposit 500 sbUSD into Morpho vault
  try {
    await send(VAULT_SBUSD_M, vaultAbi, "deposit", [SBUSD_VAULT_AMOUNT, account.address], 10_000_000n);
    console.log(`  Deposited 500 sbUSD → sv2SbUSD-M`);
  } catch (e: any) {
    console.log(`  sv2SbUSD-M deposit: ${e.message?.slice(0, 80)}`);
  }

  // Deposit 5000 wCTC into Morpho vault
  const WCTC_VAULT_AMOUNT = parseEther("5000");
  try {
    await send(VAULT_WCTC_M, vaultAbi, "deposit", [WCTC_VAULT_AMOUNT, account.address], 10_000_000n);
    console.log(`  Deposited 5K wCTC → sv2wCTC-M`);
  } catch (e: any) {
    console.log(`  sv2wCTC-M deposit: ${e.message?.slice(0, 80)}`);
  }

  // ═══════════════════════════════════════════════════════════════
  // Summary
  // ═══════════════════════════════════════════════════════════════
  console.log("\n════════════════════════════════════════════");
  console.log("  LIQUIDITY SEEDING COMPLETE");
  console.log("════════════════════════════════════════════");

  // Final balances
  const finalSbUSD = await readContract(SBUSD, erc20Abi, "balanceOf", [account.address]);
  const finalWCTC = await readContract(WCTC, erc20Abi, "balanceOf", [account.address]);
  const finalLstCTC = await readContract(LSTCTC, erc20Abi, "balanceOf", [account.address]);
  console.log(`  Remaining sbUSD:  ${formatEther(finalSbUSD as bigint)}`);
  console.log(`  Remaining wCTC:   ${formatEther(finalWCTC as bigint)}`);
  console.log(`  Remaining lstCTC: ${formatEther(finalLstCTC as bigint)}`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => { console.error("\nSEEDING FAILED:", err.message || err); process.exit(1); });
