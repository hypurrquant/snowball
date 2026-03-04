/**
 * Redeploy StrategyWCTCLoop with oracle-price-aware borrow calculation fix.
 * Then update the sv2wCTC-Loop vault to use the new strategy.
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

function loadAbi(pkg: string, name: string, fileName?: string): Abi {
  return loadArtifact(pkg, name, fileName).abi;
}

const PRIVATE_KEY = process.env.DEPLOYER_PRIVATE_KEY || process.env.ADMIN_PRIVATE_KEY;
if (!PRIVATE_KEY) { console.error("Set DEPLOYER_PRIVATE_KEY in .env"); process.exit(1); }

const account = privateKeyToAccount(PRIVATE_KEY as `0x${string}`);
const publicClient = createPublicClient({ chain: creditcoinTestnet as any, transport: http() });
const walletClient = createWalletClient({ account, chain: creditcoinTestnet as any, transport: http() });

const ZERO = "0x0000000000000000000000000000000000000000" as Address;

async function deploy(pkg: string, name: string, args: any[] = [], fileName?: string, gas = 10_000_000n) {
  const { abi, bytecode } = loadArtifact(pkg, name, fileName);
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

  const WCTC = liquityAddrs.tokens.wCTC as Address;
  const SBUSD = liquityAddrs.tokens.sbUSD as Address;
  const MORPHO = morphoAddrs.core.morpho as Address;
  const IRM = morphoAddrs.core.adaptiveCurveIRM as Address;
  const ORACLE_WCTC = morphoAddrs.oracles.wCTC as Address;
  const VAULT_LOOP = yieldAddrs.vaults["sv2wCTC-Loop"].vault as Address;

  console.log("═══ Redeploy StrategyWCTCLoop (oracle-aware fix) ═══");

  // Deploy new strategy
  const newStrategy = await deploy("yield", "StrategyWCTCLoop", [
    VAULT_LOOP,      // vault
    WCTC,            // want
    WCTC,            // native
    ZERO,            // swapRouter (unused for now)
    3000,            // swapFee
    account.address, // strategist
    account.address, // treasury
    MORPHO,          // lend (Morpho)
    SBUSD,           // sbUSD
    [SBUSD, WCTC, ORACLE_WCTC, IRM, parseEther("0.77")], // marketParams
  ], undefined, 15_000_000n);

  console.log(`\n  New StrategyWCTCLoop: ${newStrategy.address}`);

  // Retire old strategy and set new one on vault
  const vaultAbi = loadAbi("yield", "SnowballYieldVaultV2");
  const OLD_STRATEGY = yieldAddrs.vaults["sv2wCTC-Loop"].strategy as Address;

  console.log("\n  Updating vault strategy...");
  // retireStrat on old strategy first (if it has funds)
  try {
    const oldStratAbi = loadAbi("yield", "StrategyWCTCLoop");
    await send(OLD_STRATEGY, oldStratAbi, "retireStrat", [], 10_000_000n);
    console.log("  Old strategy retired");
  } catch (e: any) {
    console.log(`  Old strategy retire: ${e.message?.slice(0, 80)}`);
  }

  // Set new strategy on vault
  await send(VAULT_LOOP, vaultAbi, "setStrategy", [newStrategy.address]);
  console.log(`  Vault strategy updated to ${newStrategy.address}`);

  // Update deployment file
  yieldAddrs.vaults["sv2wCTC-Loop"].strategy = newStrategy.address;
  fs.writeFileSync(path.join(deployDir, "yield.json"), JSON.stringify(yieldAddrs, null, 2));
  console.log("  yield.json updated");

  // Update keeper if needed
  const KEEPER = yieldAddrs.keeper as Address;
  if (KEEPER) {
    const keeperAbi = loadAbi("yield", "SnowballKeeper");
    try {
      await send(KEEPER, keeperAbi, "removeStrategy", [OLD_STRATEGY]);
      console.log("  Old strategy removed from keeper");
    } catch (e: any) {
      console.log(`  Keeper remove: ${e.message?.slice(0, 80)}`);
    }
    try {
      await send(KEEPER, keeperAbi, "addStrategy", [newStrategy.address]);
      console.log("  New strategy added to keeper");
    } catch (e: any) {
      console.log(`  Keeper add: ${e.message?.slice(0, 80)}`);
    }
  }

  console.log("\n═══ Done ═══");
}

main()
  .then(() => process.exit(0))
  .catch((err) => { console.error("FAILED:", err.message || err); process.exit(1); });
