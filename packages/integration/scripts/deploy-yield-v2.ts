/**
 * Snowball Yield V2 — Deploy Vaults + Strategies + Keeper
 *
 * Reads existing deployment addresses from deployments/creditcoin-testnet/*.json
 * and deploys 5 Vault+Strategy pairs + SnowballKeeper.
 *
 * Usage: npx tsx scripts/deploy-yield-v2.ts
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

// ─── Artifact loader (multi-package) ───
function loadArtifact(pkg: string, contractName: string, fileName?: string): { abi: Abi; bytecode: `0x${string}` } {
  const file = fileName || contractName;
  const p = path.join(__dirname, `../../${pkg}/out/${file}.sol/${contractName}.json`);
  if (fs.existsSync(p)) {
    const artifact = JSON.parse(fs.readFileSync(p, "utf8"));
    const bytecode = artifact.bytecode?.object ?? artifact.bytecode;
    return { abi: artifact.abi, bytecode: bytecode as `0x${string}` };
  }
  throw new Error(`Artifact not found: ${pkg}/out/${file}.sol/${contractName}.json`);
}

// ─── Clients ───
const PRIVATE_KEY = process.env.DEPLOYER_PRIVATE_KEY || process.env.ADMIN_PRIVATE_KEY;
if (!PRIVATE_KEY) { console.error("Set DEPLOYER_PRIVATE_KEY in .env"); process.exit(1); }

const account = privateKeyToAccount(PRIVATE_KEY as `0x${string}`);
const publicClient = createPublicClient({ chain: creditcoinTestnet as any, transport: http() });
const walletClient = createWalletClient({ account, chain: creditcoinTestnet as any, transport: http() });

async function deploy(pkg: string, name: string, args: any[] = [], fileName?: string, gas = 10_000_000n): Promise<{ address: Address; abi: Abi }> {
  const { abi, bytecode } = loadArtifact(pkg, name, fileName);
  const hash = await walletClient.deployContract({ abi, bytecode, args, gas });
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  if (receipt.status !== "success") throw new Error(`Deploy ${name} failed`);
  console.log(`  ${name}: ${receipt.contractAddress}`);
  return { address: receipt.contractAddress!, abi };
}

async function send(address: Address, abi: Abi, fn: string, args: any[] = []): Promise<Hash> {
  const hash = await walletClient.writeContract({ address, abi, functionName: fn, args, gas: 5_000_000n });
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  if (receipt.status !== "success") throw new Error(`TX ${fn} failed`);
  return hash;
}

// ─── Main ───
async function main() {
  const balance = await publicClient.getBalance({ address: account.address });
  console.log(`Deployer: ${account.address}`);
  console.log(`Balance: ${formatEther(balance)} tCTC\n`);

  // Load existing deployment addresses
  const deployDir = path.join(__dirname, "../../../deployments/creditcoin-testnet");
  const liquityAddrs = JSON.parse(fs.readFileSync(path.join(deployDir, "liquity.json"), "utf8"));
  const morphoAddrs = JSON.parse(fs.readFileSync(path.join(deployDir, "morpho.json"), "utf8"));
  const integrationAddrs = JSON.parse(fs.readFileSync(path.join(deployDir, "integration.json"), "utf8"));

  const SBUSD = liquityAddrs.tokens.sbUSD as Address;
  const WCTC = liquityAddrs.tokens.wCTC as Address;
  const USDC = morphoAddrs.tokens.mockUSDC as Address;
  const MORPHO = morphoAddrs.core.morpho as Address;
  const IRM = morphoAddrs.core.adaptiveCurveIRM as Address;
  const ORACLE_WCTC = morphoAddrs.oracles.wCTC as Address;
  const ORACLE_SBUSD = morphoAddrs.oracles.sbUSD as Address;
  const SP_WCTC = liquityAddrs.branches.wCTC.stabilityPool as Address;
  const ROUTER = integrationAddrs.router.address as Address;

  const SWAP_FEE = 3000; // 0.3%
  const KEEPER_INTERVAL = 4 * 3600; // 4 hours
  const deployer = account.address;

  console.log("═══ Loaded addresses ═══");
  console.log(`  sbUSD: ${SBUSD}`);
  console.log(`  wCTC: ${WCTC}`);
  console.log(`  USDC: ${USDC}`);
  console.log(`  Morpho: ${MORPHO}`);
  console.log(`  StabilityPool (wCTC): ${SP_WCTC}`);
  console.log(`  Router: ${ROUTER}`);

  // MarketParams structs (tuple encoding for constructor args)
  const mpWCTC_sbUSD = [SBUSD, WCTC, ORACLE_WCTC, IRM, parseEther("0.77")];
  const mpSbUSD_USDC = [USDC, SBUSD, ORACLE_SBUSD, IRM, parseEther("0.86")];

  // ═══════════════════════════════════════════════════════════════
  // 1. sv2SbUSD-SP: sbUSD → Liquity Stability Pool
  // ═══════════════════════════════════════════════════════════════
  console.log("\n═══ 1. sv2SbUSD-SP (Stability Pool) ═══");
  const vaultSbUSDSP = await deploy("yield", "SnowballYieldVaultV2", [SBUSD, "Snowball sbUSD StabilityPool V2", "sv2SbUSD-SP"]);
  const stratSbUSDSP = await deploy("yield", "StrategySbUSDStabilityPool", [
    vaultSbUSDSP.address, SBUSD, WCTC, ROUTER, SWAP_FEE, deployer, deployer, SP_WCTC,
  ]);
  await send(vaultSbUSDSP.address, vaultSbUSDSP.abi, "setStrategy", [stratSbUSDSP.address]);
  console.log("  Strategy linked ✓");

  // ═══════════════════════════════════════════════════════════════
  // 2. sv2SbUSD-M: sbUSD → Morpho Blue
  // ═══════════════════════════════════════════════════════════════
  console.log("\n═══ 2. sv2SbUSD-M (Morpho) ═══");
  const vaultSbUSDM = await deploy("yield", "SnowballYieldVaultV2", [SBUSD, "Snowball sbUSD Morpho V2", "sv2SbUSD-M"]);
  const stratSbUSDM = await deploy("yield", "StrategySbUSDMorpho", [
    vaultSbUSDM.address, SBUSD, WCTC, ROUTER, SWAP_FEE, deployer, deployer, MORPHO, mpWCTC_sbUSD,
  ]);
  await send(vaultSbUSDM.address, vaultSbUSDM.abi, "setStrategy", [stratSbUSDM.address]);
  console.log("  Strategy linked ✓");

  // ═══════════════════════════════════════════════════════════════
  // 3. sv2USDC-M: USDC → Morpho Blue
  // ═══════════════════════════════════════════════════════════════
  console.log("\n═══ 3. sv2USDC-M (Morpho) ═══");
  const vaultUSDCM = await deploy("yield", "SnowballYieldVaultV2", [USDC, "Snowball USDC Morpho V2", "sv2USDC-M"]);
  const stratUSDCM = await deploy("yield", "StrategyUSDCMorpho", [
    vaultUSDCM.address, USDC, WCTC, ROUTER, SWAP_FEE, deployer, deployer, MORPHO, mpSbUSD_USDC,
  ]);
  await send(vaultUSDCM.address, vaultUSDCM.abi, "setStrategy", [stratUSDCM.address]);
  console.log("  Strategy linked ✓");

  // ═══════════════════════════════════════════════════════════════
  // 4. sv2wCTC-M: wCTC → Morpho Blue
  // ═══════════════════════════════════════════════════════════════
  console.log("\n═══ 4. sv2wCTC-M (Morpho) ═══");
  const vaultWCTCM = await deploy("yield", "SnowballYieldVaultV2", [WCTC, "Snowball wCTC Morpho V2", "sv2wCTC-M"]);
  const stratWCTCM = await deploy("yield", "StrategyWCTCMorpho", [
    vaultWCTCM.address, WCTC, WCTC, ROUTER, SWAP_FEE, deployer, deployer, MORPHO, mpWCTC_sbUSD,
  ]);
  await send(vaultWCTCM.address, vaultWCTCM.abi, "setStrategy", [stratWCTCM.address]);
  console.log("  Strategy linked ✓");

  // ═══════════════════════════════════════════════════════════════
  // 5. sv2wCTC-Loop: wCTC → Leveraged Loop
  // ═══════════════════════════════════════════════════════════════
  console.log("\n═══ 5. sv2wCTC-Loop (Leverage) ═══");
  const vaultWCTCLoop = await deploy("yield", "SnowballYieldVaultV2", [WCTC, "Snowball wCTC Loop V2", "sv2wCTC-Loop"]);
  const stratWCTCLoop = await deploy("yield", "StrategyWCTCLoop", [
    vaultWCTCLoop.address, WCTC, WCTC, ROUTER, SWAP_FEE, deployer, deployer, MORPHO, SBUSD, mpWCTC_sbUSD,
  ]);
  await send(vaultWCTCLoop.address, vaultWCTCLoop.abi, "setStrategy", [stratWCTCLoop.address]);
  console.log("  Strategy linked ✓");

  // ═══════════════════════════════════════════════════════════════
  // 6. SnowballKeeper
  // ═══════════════════════════════════════════════════════════════
  console.log("\n═══ 6. SnowballKeeper ═══");
  const keeper = await deploy("yield", "SnowballKeeper", [KEEPER_INTERVAL]);

  const allStrategies = [stratSbUSDSP, stratSbUSDM, stratUSDCM, stratWCTCM, stratWCTCLoop];
  for (const strat of allStrategies) {
    await send(keeper.address, keeper.abi, "addStrategy", [strat.address]);
  }
  console.log(`  ${allStrategies.length} strategies registered ✓`);

  // ═══════════════════════════════════════════════════════════════
  // Save deployment addresses
  // ═══════════════════════════════════════════════════════════════
  const yieldAddrs = {
    network: { name: "Creditcoin Testnet", chainId: 102031 },
    vaults: {
      "sv2SbUSD-SP": { vault: vaultSbUSDSP.address, strategy: stratSbUSDSP.address, want: "sbUSD", protocol: "Liquity StabilityPool" },
      "sv2SbUSD-M":  { vault: vaultSbUSDM.address, strategy: stratSbUSDM.address, want: "sbUSD", protocol: "Morpho Blue" },
      "sv2USDC-M":   { vault: vaultUSDCM.address, strategy: stratUSDCM.address, want: "USDC", protocol: "Morpho Blue" },
      "sv2wCTC-M":   { vault: vaultWCTCM.address, strategy: stratWCTCM.address, want: "wCTC", protocol: "Morpho Blue" },
      "sv2wCTC-Loop": { vault: vaultWCTCLoop.address, strategy: stratWCTCLoop.address, want: "wCTC", protocol: "Morpho Blue (Leverage)" },
    },
    keeper: {
      address: keeper.address,
      harvestInterval: KEEPER_INTERVAL,
      strategies: allStrategies.map(s => s.address),
    },
  };

  fs.writeFileSync(path.join(deployDir, "yield.json"), JSON.stringify(yieldAddrs, null, 2));

  console.log("\n════════════════════════════════════════════");
  console.log("  YIELD V2 DEPLOYMENT COMPLETE");
  console.log("════════════════════════════════════════════");
  console.log(`  sv2SbUSD-SP:   ${vaultSbUSDSP.address}`);
  console.log(`  sv2SbUSD-M:    ${vaultSbUSDM.address}`);
  console.log(`  sv2USDC-M:     ${vaultUSDCM.address}`);
  console.log(`  sv2wCTC-M:     ${vaultWCTCM.address}`);
  console.log(`  sv2wCTC-Loop:  ${vaultWCTCLoop.address}`);
  console.log(`  Keeper:        ${keeper.address}`);
  console.log(`\n  Saved to: ${deployDir}/yield.json`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => { console.error("\nDEPLOYMENT FAILED:", err.message || err); process.exit(1); });
