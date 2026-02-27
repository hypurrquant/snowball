/**
 * Snowball Yield Vaults -- Viem-based deploy script
 * Deploys 4 Vaults + 4 Strategies on Creditcoin Testnet
 *
 * Prerequisites:
 *   - Algebra DEX deployed (swapRouter, poolDeployer)
 *   - Morpho (SnowballLend) deployed
 *   - Liquity (StabilityPool) deployed
 *   - forge build run in packages/yield
 *
 * Usage: npx tsx scripts/deploy-viem.ts
 */
import {
  createPublicClient,
  createWalletClient,
  http,
  formatEther,
  type Address,
  type Abi,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import * as fs from "fs";
import * as path from "path";
import * as dotenv from "dotenv";

dotenv.config({ path: path.join(__dirname, "../../../.env") });

// ─── Network ───
const creditcoinTestnet = {
  id: 102031,
  name: "Creditcoin Testnet" as const,
  nativeCurrency: { name: "CTC", symbol: "tCTC", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://rpc.cc3-testnet.creditcoin.network" as const] },
  },
  blockExplorers: {
    default: { name: "Blockscout", url: "https://creditcoin-testnet.blockscout.com" },
  },
  testnet: true,
} as const;

// ─── Artifact Loader ───
function loadArtifact(contractName: string): { abi: Abi; bytecode: `0x${string}` } {
  const p = path.join(__dirname, `../out/${contractName}.sol/${contractName}.json`);
  if (fs.existsSync(p)) {
    const artifact = JSON.parse(fs.readFileSync(p, "utf8"));
    const bytecode = artifact.bytecode?.object ?? artifact.bytecode;
    return { abi: artifact.abi, bytecode: bytecode as `0x${string}` };
  }
  throw new Error(`Foundry artifact not found: ${contractName} (run 'forge build' first)`);
}

// ─── Private Key ───
const PRIVATE_KEY = process.env.DEPLOYER_PRIVATE_KEY || process.env.ADMIN_PRIVATE_KEY;
if (!PRIVATE_KEY) {
  console.error("Set DEPLOYER_PRIVATE_KEY in .env");
  process.exit(1);
}

const account = privateKeyToAccount(PRIVATE_KEY as `0x${string}`);
const publicClient = createPublicClient({
  chain: creditcoinTestnet as any,
  transport: http(),
});
const walletClient = createWalletClient({
  account,
  chain: creditcoinTestnet as any,
  transport: http(),
});

// ─── Deploy Helpers ───
async function deploy(name: string, args: any[] = []): Promise<{ address: Address; abi: Abi }> {
  const { abi, bytecode } = loadArtifact(name);
  const hash = await walletClient.deployContract({ abi, bytecode, args });
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  if (receipt.status !== "success") throw new Error(`Deploy ${name} failed`);
  const address = receipt.contractAddress!;
  console.log(`  ${name}: ${address}`);
  return { address, abi };
}

async function send(address: Address, abi: Abi, functionName: string, args: any[] = []) {
  const hash = await walletClient.writeContract({ address, abi, functionName, args, gas: 3_000_000n });
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  if (receipt.status !== "success") throw new Error(`TX ${functionName} failed`);
  console.log(`  ${functionName}() ✓`);
  return hash;
}

// ─── Load Dependency Addresses ───
function loadDeployment(name: string): any {
  const p = path.join(__dirname, `../../../deployments/creditcoin-testnet/${name}.json`);
  if (!fs.existsSync(p)) throw new Error(`Deployment not found: ${p}`);
  return JSON.parse(fs.readFileSync(p, "utf8"));
}

async function main() {
  const balance = await publicClient.getBalance({ address: account.address });
  console.log(`Deploying with: ${account.address}`);
  console.log(`Balance: ${formatEther(balance)} tCTC\n`);

  // ─── Load Dependencies ───
  const algebra = loadDeployment("algebra");
  const morpho = loadDeployment("morpho");
  const liquity = loadDeployment("liquity");

  const SWAP_ROUTER = algebra.core.snowballRouter as Address;
  const POOL_DEPLOYER = algebra.core.snowballPoolDeployer as Address;
  const SNOWBALL_LEND = morpho.core.snowballLend as Address;
  const STABILITY_POOL_WCTC = liquity.branches.wCTC.stabilityPool as Address;

  // Token addresses
  const TOKENS = {
    wCTC: "0x8f7f60a0f615d828eafcbbf6121f73efcfb56969" as Address,
    sbUSD: "0x5772f9415b75ecca00e7667e0c7d730db3b29fbd" as Address,
    USDC: "0xbcaa46ef7a399fcdb64adf4520cdcc6d62fcaaed" as Address,
  };

  // Morpho Market IDs (from frontend addresses.ts)
  const MARKET_IDS = {
    "wCTC/sbUSD": "0xfb2641d76f7e8a4170560c308a158508651a22e3f40110f99008ca892767f261" as `0x${string}`,
    "lstCTC/sbUSD": "0x35cfd9e93f81434c0f3e6e688a42775e53fc442163cc960090efcc4c2ef8488e" as `0x${string}`,
    "sbUSD/USDC": "0x3df89a2c4e307c088bc4ddff74f5e0dc246404b7a1c0096771d1fa6b080fb681" as `0x${string}`,
  };

  // Deploy roles
  const STRATEGIST = account.address;
  const TREASURY = account.address;

  console.log("Dependencies loaded:");
  console.log(`  SwapRouter: ${SWAP_ROUTER}`);
  console.log(`  PoolDeployer: ${POOL_DEPLOYER}`);
  console.log(`  SnowballLend: ${SNOWBALL_LEND}`);
  console.log(`  StabilityPool (wCTC): ${STABILITY_POOL_WCTC}`);
  console.log();

  // ════════════════════════════════════════════════════════════════
  // Vault 1: sbUSD Stability Pool
  // ════════════════════════════════════════════════════════════════
  console.log("=== Vault 1: sbUSD Stability Pool ===");

  const vault1 = await deploy("SnowballYieldVault", [
    TOKENS.sbUSD,             // want
    "mooSbUSD-SP",            // name
    "mooSbUSD-SP",            // symbol
  ]);

  const strat1 = await deploy("StrategySbUSDStabilityPool", [
    vault1.address,           // vault
    TOKENS.sbUSD,             // want
    TOKENS.wCTC,              // native
    SWAP_ROUTER,              // swapRouter
    POOL_DEPLOYER,            // poolDeployer
    STRATEGIST,               // strategist
    TREASURY,                 // treasury
    STABILITY_POOL_WCTC,      // stabilityPool
  ]);

  await send(vault1.address, vault1.abi, "setStrategy", [strat1.address]);

  // ════════════════════════════════════════════════════════════════
  // Vault 2: sbUSD Morpho
  // ════════════════════════════════════════════════════════════════
  console.log("\n=== Vault 2: sbUSD Morpho ===");

  // sbUSD is the loan token in wCTC/sbUSD market, so supply to that market
  const vault2 = await deploy("SnowballYieldVault", [
    TOKENS.sbUSD,
    "mooSbUSD-Morpho",
    "mooSbUSD-Morpho",
  ]);

  const strat2 = await deploy("StrategySbUSDMorpho", [
    vault2.address,
    TOKENS.sbUSD,
    TOKENS.wCTC,
    SWAP_ROUTER,
    POOL_DEPLOYER,
    STRATEGIST,
    TREASURY,
    SNOWBALL_LEND,
    MARKET_IDS["wCTC/sbUSD"],
  ]);

  await send(vault2.address, vault2.abi, "setStrategy", [strat2.address]);

  // ════════════════════════════════════════════════════════════════
  // Vault 3: wCTC Morpho
  // ════════════════════════════════════════════════════════════════
  console.log("\n=== Vault 3: wCTC Morpho ===");

  // wCTC is the collateral in wCTC/sbUSD market — but strategy supplies as lender
  // Need a market where wCTC is the loan token. Using wCTC/sbUSD since wCTC can be supplied
  const vault3 = await deploy("SnowballYieldVault", [
    TOKENS.wCTC,
    "mooWCTC-Morpho",
    "mooWCTC-Morpho",
  ]);

  const strat3 = await deploy("StrategyWCTCMorpho", [
    vault3.address,
    TOKENS.wCTC,
    TOKENS.wCTC,               // want == native
    SWAP_ROUTER,
    POOL_DEPLOYER,
    STRATEGIST,
    TREASURY,
    SNOWBALL_LEND,
    MARKET_IDS["wCTC/sbUSD"],  // wCTC as collateral supply market
  ]);

  await send(vault3.address, vault3.abi, "setStrategy", [strat3.address]);

  // ════════════════════════════════════════════════════════════════
  // Vault 4: USDC Morpho
  // ════════════════════════════════════════════════════════════════
  console.log("\n=== Vault 4: USDC Morpho ===");

  const vault4 = await deploy("SnowballYieldVault", [
    TOKENS.USDC,
    "mooUSDC-Morpho",
    "mooUSDC-Morpho",
  ]);

  const strat4 = await deploy("StrategyUSDCMorpho", [
    vault4.address,
    TOKENS.USDC,
    TOKENS.wCTC,
    SWAP_ROUTER,
    POOL_DEPLOYER,
    STRATEGIST,
    TREASURY,
    SNOWBALL_LEND,
    MARKET_IDS["sbUSD/USDC"],  // USDC as loan token market
  ]);

  await send(vault4.address, vault4.abi, "setStrategy", [strat4.address]);

  // ════════════════════════════════════════════════════════════════
  // Save Deployment
  // ════════════════════════════════════════════════════════════════
  const addresses = {
    network: { name: "Creditcoin Testnet", chainId: 102031 },
    vaults: {
      "sbUSD-StabilityPool": {
        vault: vault1.address,
        strategy: strat1.address,
        want: TOKENS.sbUSD,
        wantSymbol: "sbUSD",
        name: "Stability Pool",
      },
      "sbUSD-Morpho": {
        vault: vault2.address,
        strategy: strat2.address,
        want: TOKENS.sbUSD,
        wantSymbol: "sbUSD",
        name: "Morpho sbUSD",
      },
      "wCTC-Morpho": {
        vault: vault3.address,
        strategy: strat3.address,
        want: TOKENS.wCTC,
        wantSymbol: "wCTC",
        name: "Morpho wCTC",
      },
      "USDC-Morpho": {
        vault: vault4.address,
        strategy: strat4.address,
        want: TOKENS.USDC,
        wantSymbol: "USDC",
        name: "Morpho USDC",
      },
    },
    config: {
      swapRouter: SWAP_ROUTER,
      poolDeployer: POOL_DEPLOYER,
      snowballLend: SNOWBALL_LEND,
      stabilityPool: STABILITY_POOL_WCTC,
      strategist: STRATEGIST,
      treasury: TREASURY,
    },
  };

  const outPath = path.join(__dirname, "../../../deployments/creditcoin-testnet/yield.json");
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(addresses, null, 2));

  console.log("\n════════════════════════════════════════");
  console.log("Snowball Yield Vaults deployment complete!");
  console.log(`Saved to: ${outPath}`);
  console.log("════════════════════════════════════════");
  console.log(JSON.stringify(addresses, null, 2));
}

main().then(() => process.exit(0)).catch((err) => {
  console.error("\nDeployment failed:", err.message || err);
  process.exit(1);
});
