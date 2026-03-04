/**
 * Deploy new sv2wCTC-Loop vault + fixed StrategyWCTCLoop strategy.
 * Fixes: oracle-price-aware borrow calculation.
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

function loadArtifact(pkg: string, name: string, fileName?: string) {
  const file = fileName || name;
  const p = path.join(__dirname, `../../${pkg}/out/${file}.sol/${name}.json`);
  const artifact = JSON.parse(fs.readFileSync(p, "utf8"));
  const bytecode = artifact.bytecode?.object ?? artifact.bytecode;
  return { abi: artifact.abi as Abi, bytecode: bytecode as `0x${string}` };
}

function loadAbi(pkg: string, name: string): Abi {
  return loadArtifact(pkg, name).abi;
}

const PRIVATE_KEY = process.env.DEPLOYER_PRIVATE_KEY || process.env.ADMIN_PRIVATE_KEY;
if (!PRIVATE_KEY) { console.error("Set DEPLOYER_PRIVATE_KEY in .env"); process.exit(1); }

const account = privateKeyToAccount(PRIVATE_KEY as `0x${string}`);
const publicClient = createPublicClient({ chain: creditcoinTestnet as any, transport: http() });
const walletClient = createWalletClient({ account, chain: creditcoinTestnet as any, transport: http() });

const ZERO = "0x0000000000000000000000000000000000000000" as Address;

async function deploy(pkg: string, name: string, args: any[] = [], gas = 10_000_000n) {
  const { abi, bytecode } = loadArtifact(pkg, name);
  const hash = await walletClient.deployContract({ abi, bytecode, args, gas });
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  if (receipt.status !== "success") throw new Error(`Deploy ${name} failed`);
  console.log(`  ${name}: ${receipt.contractAddress}`);
  return { address: receipt.contractAddress! as Address, abi };
}

async function send(address: Address, abi: Abi, fn: string, args: any[] = [], gas = 5_000_000n): Promise<Hash> {
  const hash = await walletClient.writeContract({ address, abi, functionName: fn, args, gas });
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  if (receipt.status !== "success") throw new Error(`TX ${fn} failed`);
  return hash;
}

async function main() {
  const deployDir = path.join(__dirname, "../../../deployments/creditcoin-testnet");
  const morphoAddrs = JSON.parse(fs.readFileSync(path.join(deployDir, "morpho.json"), "utf8"));
  const liquityAddrs = JSON.parse(fs.readFileSync(path.join(deployDir, "liquity.json"), "utf8"));
  const yieldAddrs = JSON.parse(fs.readFileSync(path.join(deployDir, "yield.json"), "utf8"));
  const integrationAddrs = JSON.parse(fs.readFileSync(path.join(deployDir, "integration.json"), "utf8"));

  const WCTC = liquityAddrs.tokens.wCTC as Address;
  const SBUSD = liquityAddrs.tokens.sbUSD as Address;
  const MORPHO = morphoAddrs.core.morpho as Address;
  const IRM = morphoAddrs.core.adaptiveCurveIRM as Address;
  const ORACLE_WCTC = morphoAddrs.oracles.wCTC as Address;
  const ORACLE = integrationAddrs.oracle.snowballOracle as Address;

  console.log("═══ Deploy sv2wCTC-Loop v2 ═══\n");

  // 1. Deploy vault
  const vault = await deploy("yield", "SnowballYieldVaultV2", [
    WCTC, "Snowball wCTC Loop v2", "sv2wCTC-Loop2",
  ], 15_000_000n);

  // 2. Deploy strategy
  const strategy = await deploy("yield", "StrategyWCTCLoop", [
    vault.address,
    WCTC,
    WCTC,
    ZERO,             // swapRouter (unused)
    3000,             // swapFee
    account.address,  // strategist
    account.address,  // treasury
    MORPHO,
    SBUSD,
    [SBUSD, WCTC, ORACLE_WCTC, IRM, parseEther("0.77")],
  ], 15_000_000n);

  // 3. Set strategy on vault
  await send(vault.address, vault.abi, "setStrategy", [strategy.address]);
  console.log("  Strategy set on vault\n");

  // 4. Seed deposit
  const erc20Abi = loadAbi("liquity", "MockWCTC");
  const oracleAbi = loadAbi("integration", "SnowballOracle");
  const MAX = parseEther("999999999");

  await send(WCTC, erc20Abi, "approve", [vault.address, MAX]);
  // Refresh oracle
  await send(ORACLE, oracleAbi, "updatePrice", [WCTC, parseEther("0.2")]);
  await send(ORACLE, oracleAbi, "updatePrice", [SBUSD, parseEther("1")]);

  try {
    await send(vault.address, vault.abi, "deposit", [parseEther("5000"), account.address], 10_000_000n);
    console.log("  Deposited 5K wCTC → sv2wCTC-Loop2");
  } catch (e: any) {
    console.log(`  Deposit: ${e.message?.slice(0, 200)}`);
  }

  // 5. Update deployment file
  yieldAddrs.vaults["sv2wCTC-Loop2"] = {
    vault: vault.address,
    strategy: strategy.address,
    want: "wCTC",
    protocol: "Morpho Blue (Leverage v2)",
  };
  fs.writeFileSync(path.join(deployDir, "yield.json"), JSON.stringify(yieldAddrs, null, 2));
  console.log("  yield.json updated");

  // 6. Add to keeper
  const KEEPER = yieldAddrs.keeper as Address;
  if (KEEPER) {
    const keeperAbi = loadAbi("yield", "SnowballKeeper");
    try {
      await send(KEEPER, keeperAbi, "addStrategy", [strategy.address]);
      console.log("  Strategy added to keeper");
    } catch (e: any) {
      console.log(`  Keeper add: ${e.message?.slice(0, 80)}`);
    }
  }

  // Final check
  const totalAssets = await publicClient.readContract({
    address: vault.address, abi: vault.abi, functionName: "totalAssets", args: [],
  });
  console.log(`\n  sv2wCTC-Loop2 totalAssets: ${formatEther(totalAssets as bigint)} wCTC`);
  console.log("\n═══ Done ═══");
}

main()
  .then(() => process.exit(0))
  .catch((err) => { console.error("FAILED:", err.message || err); process.exit(1); });
