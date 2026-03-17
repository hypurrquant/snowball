/**
 * Aave V3 Fresh Deploy for Creditcoin Testnet
 *
 * SnowballPriceAdapter를 사용한 간소화 버전.
 * AaveOracleAdapterFactory 대신 직접 어댑터 배포.
 *
 * Usage: NODE_PATH=packages/integration/node_modules npx tsx scripts/deploy/deploy-aave-v3-fresh.ts
 */
import {
  createPublicClient, createWalletClient, http, formatEther,
  type Address, type Abi,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { defineChain } from "viem";
import * as fs from "fs";
import * as path from "path";

// ─── .env ───
function loadEnv(): Record<string, string> {
  const envPath = path.join(__dirname, "../../.env");
  if (!fs.existsSync(envPath)) throw new Error(`.env not found`);
  const env: Record<string, string> = {};
  for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const idx = t.indexOf("=");
    if (idx === -1) continue;
    env[t.slice(0, idx)] = t.slice(idx + 1);
  }
  return env;
}
const env = loadEnv();

// ─── Chain ───
const cc3 = defineChain({
  id: 102031, name: "CC3 Testnet",
  nativeCurrency: { name: "CTC", symbol: "tCTC", decimals: 18 },
  rpcUrls: { default: { http: ["https://rpc.cc3-testnet.creditcoin.network"] } },
});

const DEPLOYER_KEY = env.DEPLOYER_PRIVATE_KEY;
if (!DEPLOYER_KEY) throw new Error("DEPLOYER_PRIVATE_KEY not set in .env");
const account = privateKeyToAccount(DEPLOYER_KEY as `0x${string}`);
const transport = http("https://rpc.cc3-testnet.creditcoin.network");
const pub = createPublicClient({ chain: cc3, transport });
const wallet = createWalletClient({ account, chain: cc3, transport });

// ─── Tokens ───
const TOKENS = {
  wCTC:   "0xca69344e2917f026ef4a5ace5d7b122343fc8528" as Address,
  lstCTC: "0xa768d376272f9216c8c4aa3063391bdafbcad4c2" as Address,
  sbUSD:  "0x8aefed3e2e9a886bdd72ec9cebe27d7aabced2a5" as Address,
  USDC:   "0x60e204104cfe1a93f630ea5ebc0a895cc80ebed9" as Address,
};

const TREASURY = account.address;
const ZERO = "0x0000000000000000000000000000000000000000" as Address;

// ─── Prices (8 decimals, Aave standard) ───
const PRICES = {
  wCTC:   500_000_000n,   // $5.00
  lstCTC: 520_000_000n,   // $5.20
  sbUSD:  100_000_000n,   // $1.00
  USDC:   100_000_000n,   // $1.00
};

// ─── Artifact ───
const AAVE_OUT = path.join(__dirname, "../../packages/aave/out");

function loadArt(name: string, solFile?: string): { abi: Abi; bytecode: `0x${string}`; linkReferences?: any } {
  const sol = solFile || `${name}.sol`;
  const p = path.join(AAVE_OUT, sol, `${name}.json`);
  if (!fs.existsSync(p)) throw new Error(`Artifact not found: ${p}`);
  const a = JSON.parse(fs.readFileSync(p, "utf8"));
  const bc = a.bytecode?.object ?? a.bytecode;
  const lr = typeof a.bytecode === "object" ? a.bytecode.linkReferences : undefined;
  return { abi: a.abi, bytecode: bc as `0x${string}`, linkReferences: lr };
}

// Link libraries into bytecode by replacing placeholders with deployed addresses
function linkBytecode(bytecode: string, linkRefs: any, libraries: Record<string, Address>): `0x${string}` {
  let linked = bytecode;
  for (const [filePath, refs] of Object.entries(linkRefs)) {
    for (const [libName, positions] of Object.entries(refs as any)) {
      const addr = libraries[libName];
      if (!addr) throw new Error(`Library ${libName} not in libraries map`);
      const addrHex = addr.slice(2).toLowerCase(); // remove 0x
      for (const pos of positions as any[]) {
        const start = 2 + pos.start * 2; // account for 0x prefix, each byte = 2 hex chars
        linked = linked.slice(0, start) + addrHex + linked.slice(start + pos.length * 2);
      }
    }
  }
  return linked as `0x${string}`;
}

// Deploy a library (no constructor args, no linking)
async function deployLib(name: string, solFile?: string): Promise<Address> {
  const { abi, bytecode } = loadArt(name, solFile);
  return deploy(name, abi, bytecode);
}

// ─── Helpers ───
async function deploy(name: string, abi: Abi, bytecode: `0x${string}`, args: any[] = [], gas = 10_000_000n): Promise<Address> {
  console.log(`  Deploying ${name}...`);
  const hash = await wallet.deployContract({ abi, bytecode, args, gas });
  const rx = await pub.waitForTransactionReceipt({ hash });
  if (rx.status !== "success") throw new Error(`Deploy ${name} failed`);
  console.log(`  ${name}: ${rx.contractAddress}`);
  return rx.contractAddress!;
}

async function send(addr: Address, abi: Abi, fn: string, args: any[] = [], gas = 5_000_000n) {
  const hash = await wallet.writeContract({ address: addr, abi, functionName: fn, args, gas });
  const rx = await pub.waitForTransactionReceipt({ hash });
  if (rx.status !== "success") throw new Error(`TX ${fn} failed`);
  return rx;
}

const RAY = 10n ** 27n;
function pctToRay(pct: number): bigint {
  return (BigInt(Math.round(pct * 100)) * RAY) / 10_000n;
}
function pctToBps(pct: number): bigint {
  return BigInt(Math.round(pct * 100));
}
function liqBonusBps(bonusPct: number): bigint {
  return BigInt(10_000 + Math.round(bonusPct * 100));
}

// ─── Main ───
async function main() {
  const bal = await pub.getBalance({ address: account.address });
  console.log(`Deployer: ${account.address}`);
  console.log(`Balance:  ${formatEther(bal)} CTC\n`);

  // Load artifacts
  const registryArt    = loadArt("PoolAddressesProviderRegistry");
  const providerArt    = loadArt("PoolAddressesProvider");
  const aclArt         = loadArt("ACLManager");
  const poolArt        = loadArt("Pool");
  const configuratorArt = loadArt("PoolConfigurator");
  const aaveOracleArt  = loadArt("AaveOracle");
  const rateStratArt   = loadArt("DefaultReserveInterestRateStrategy");
  const aTokenArt      = loadArt("AToken");
  const stableDebtArt  = loadArt("StableDebtToken");
  const varDebtArt     = loadArt("VariableDebtToken");
  const dataProviderArt = loadArt("AaveProtocolDataProvider");
  const adapterArt     = loadArt("SnowballPriceAdapter");

  // ═══ Phase 0: Deploy Libraries ═══
  console.log("═══ Phase 0: Deploy Libraries (Pool needs 7, Configurator needs 1) ═══");
  const libBorrowLogic     = await deployLib("BorrowLogic");
  const libBridgeLogic     = await deployLib("BridgeLogic");
  const libEModeLogic      = await deployLib("EModeLogic");
  const libFlashLoanLogic  = await deployLib("FlashLoanLogic");
  const libLiquidationLogic = await deployLib("LiquidationLogic");
  const libPoolLogic       = await deployLib("PoolLogic");
  const libSupplyLogic     = await deployLib("SupplyLogic");
  const libConfiguratorLogic = await deployLib("ConfiguratorLogic");

  const poolLibs: Record<string, Address> = {
    BorrowLogic: libBorrowLogic,
    BridgeLogic: libBridgeLogic,
    EModeLogic: libEModeLogic,
    FlashLoanLogic: libFlashLoanLogic,
    LiquidationLogic: libLiquidationLogic,
    PoolLogic: libPoolLogic,
    SupplyLogic: libSupplyLogic,
  };
  const confLibs: Record<string, Address> = {
    ConfiguratorLogic: libConfiguratorLogic,
  };

  // ═══ Phase 1: Core ═══
  console.log("\n═══ Phase 1: Core Infrastructure ═══");
  const registry = await deploy("PoolAddressesProviderRegistry", registryArt.abi, registryArt.bytecode, [account.address]);
  const provider = await deploy("PoolAddressesProvider", providerArt.abi, providerArt.bytecode, ["Snowball", account.address]);
  await send(registry, registryArt.abi, "registerAddressesProvider", [provider, 1n]);
  await send(provider, providerArt.abi, "setACLAdmin", [account.address]);

  const aclManager = await deploy("ACLManager", aclArt.abi, aclArt.bytecode, [provider]);
  await send(provider, providerArt.abi, "setACLManager", [aclManager]);

  // Link Pool bytecode with 7 libraries
  const linkedPoolBytecode = linkBytecode(poolArt.bytecode, poolArt.linkReferences, poolLibs);
  const poolImpl = await deploy("Pool (impl)", poolArt.abi, linkedPoolBytecode, [provider]);
  await send(provider, providerArt.abi, "setPoolImpl", [poolImpl]);
  const pool = await pub.readContract({ address: provider, abi: providerArt.abi, functionName: "getPool" }) as Address;
  console.log(`  Pool proxy: ${pool}`);

  // Link PoolConfigurator bytecode with 1 library
  const linkedConfBytecode = linkBytecode(configuratorArt.bytecode, configuratorArt.linkReferences, confLibs);
  const confImpl = await deploy("PoolConfigurator (impl)", configuratorArt.abi, linkedConfBytecode, []);
  await send(provider, providerArt.abi, "setPoolConfiguratorImpl", [confImpl]);
  const configurator = await pub.readContract({ address: provider, abi: providerArt.abi, functionName: "getPoolConfigurator" }) as Address;
  console.log(`  PoolConfigurator proxy: ${configurator}`);

  // ═══ Phase 2: Oracle ═══
  console.log("\n═══ Phase 2: Oracle (SnowballPriceAdapter) ═══");
  const adapterWCTC   = await deploy("Adapter wCTC",   adapterArt.abi, adapterArt.bytecode, [PRICES.wCTC]);
  const adapterLstCTC = await deploy("Adapter lstCTC", adapterArt.abi, adapterArt.bytecode, [PRICES.lstCTC]);
  const adapterSbUSD  = await deploy("Adapter sbUSD",  adapterArt.abi, adapterArt.bytecode, [PRICES.sbUSD]);
  const adapterUSDC   = await deploy("Adapter USDC",   adapterArt.abi, adapterArt.bytecode, [PRICES.USDC]);

  const aaveOracle = await deploy("AaveOracle", aaveOracleArt.abi, aaveOracleArt.bytecode, [
    provider,
    [TOKENS.wCTC, TOKENS.lstCTC, TOKENS.sbUSD, TOKENS.USDC],
    [adapterWCTC, adapterLstCTC, adapterSbUSD, adapterUSDC],
    ZERO, ZERO, 100_000_000n,
  ]);
  await send(provider, providerArt.abi, "setPriceOracle", [aaveOracle]);

  // ═══ Phase 3: Interest Rate ═══
  console.log("\n═══ Phase 3: Interest Rate Strategies ═══");
  const rateVolatile = await deploy("RateStrategy (volatile)", rateStratArt.abi, rateStratArt.bytecode, [
    provider, pctToRay(65), pctToRay(0), pctToRay(7), pctToRay(300),
    pctToRay(7), pctToRay(300), pctToRay(2), pctToRay(5), pctToRay(20),
  ]);
  const rateStable = await deploy("RateStrategy (stable)", rateStratArt.abi, rateStratArt.bytecode, [
    provider, pctToRay(90), pctToRay(0), pctToRay(4), pctToRay(60),
    pctToRay(4), pctToRay(60), pctToRay(1), pctToRay(2), pctToRay(20),
  ]);

  // ═══ Phase 4: Token Implementations ═══
  console.log("\n═══ Phase 4: Token Implementations ═══");
  const aTokenImpl     = await deploy("AToken (impl)", aTokenArt.abi, aTokenArt.bytecode, [pool]);
  const stableDebtImpl = await deploy("StableDebtToken (impl)", stableDebtArt.abi, stableDebtArt.bytecode, [pool]);
  const varDebtImpl    = await deploy("VariableDebtToken (impl)", varDebtArt.abi, varDebtArt.bytecode, [pool]);

  // ═══ Phase 5: Reserve Configuration ═══
  console.log("\n═══ Phase 5: Reserve Configuration ═══");
  await send(aclManager, aclArt.abi, "addPoolAdmin", [account.address]);

  const reserves = [
    { asset: TOKENS.wCTC,   rate: rateVolatile, name: "wCTC",   sym: "sawCTC"   },
    { asset: TOKENS.lstCTC, rate: rateVolatile, name: "lstCTC", sym: "salistCTC" },
    { asset: TOKENS.sbUSD,  rate: rateStable,   name: "sbUSD",  sym: "sasbUSD"  },
    { asset: TOKENS.USDC,   rate: rateStable,   name: "USDC",   sym: "saUSDC"   },
  ];

  const initInputs = reserves.map(r => ({
    aTokenImpl,
    stableDebtTokenImpl: stableDebtImpl,
    variableDebtTokenImpl: varDebtImpl,
    underlyingAssetDecimals: 18,
    interestRateStrategyAddress: r.rate,
    underlyingAsset: r.asset,
    treasury: TREASURY,
    incentivesController: ZERO,
    aTokenName: `Snowball Aave ${r.name}`,
    aTokenSymbol: r.sym,
    variableDebtTokenName: `Snowball Variable Debt ${r.name}`,
    variableDebtTokenSymbol: `vDebt${r.sym}`,
    stableDebtTokenName: `Snowball Stable Debt ${r.name}`,
    stableDebtTokenSymbol: `sDebt${r.sym}`,
    params: "0x" as `0x${string}`,
  }));

  console.log("  initReserves (4 assets)...");
  await send(configurator, configuratorArt.abi, "initReserves", [initInputs], 8_000_000n);

  // Enable borrowing
  for (const r of reserves) {
    await send(configurator, configuratorArt.abi, "setReserveBorrowing", [r.asset, true]);
  }

  // Collateral config
  const collConfigs = [
    { asset: TOKENS.wCTC,   ltv: 65, threshold: 75, bonus: 10, rf: 10 },
    { asset: TOKENS.lstCTC, ltv: 70, threshold: 80, bonus: 8,  rf: 10 },
    { asset: TOKENS.sbUSD,  ltv: 80, threshold: 85, bonus: 5,  rf: 10 },
    { asset: TOKENS.USDC,   ltv: 80, threshold: 85, bonus: 5,  rf: 10 },
  ];

  for (let i = 0; i < collConfigs.length; i++) {
    const c = collConfigs[i];
    console.log(`  Configuring ${reserves[i].name}: LTV=${c.ltv}%, LT=${c.threshold}%, RF=${c.rf}%`);
    await send(configurator, configuratorArt.abi, "configureReserveAsCollateral", [
      c.asset, pctToBps(c.ltv), pctToBps(c.threshold), liqBonusBps(c.bonus),
    ]);
    await send(configurator, configuratorArt.abi, "setReserveFactor", [c.asset, pctToBps(c.rf)]);
  }

  // Flash loans
  for (const r of reserves) {
    await send(configurator, configuratorArt.abi, "setReserveFlashLoaning", [r.asset, true]);
  }

  // ═══ Phase 6: ACL ═══
  console.log("\n═══ Phase 6: ACL Setup ═══");
  await send(aclManager, aclArt.abi, "addEmergencyAdmin", [account.address]);
  await send(aclManager, aclArt.abi, "addRiskAdmin", [account.address]);

  // ═══ Phase 7: Periphery ═══
  console.log("\n═══ Phase 7: Periphery ═══");
  const dataProvider = await deploy("AaveProtocolDataProvider", dataProviderArt.abi, dataProviderArt.bytecode, [provider]);
  await send(provider, providerArt.abi, "setPoolDataProvider", [dataProvider]);

  // ═══ Output ═══
  const result = {
    core: { registry, provider, aclManager, pool, poolImpl, configurator, confImpl },
    oracle: {
      aaveOracle,
      adapters: { wCTC: adapterWCTC, lstCTC: adapterLstCTC, sbUSD: adapterSbUSD, USDC: adapterUSDC },
    },
    rates: { volatile: rateVolatile, stablecoin: rateStable },
    tokens: { aTokenImpl, stableDebtImpl, varDebtImpl },
    periphery: { dataProvider },
    treasury: TREASURY,
  };

  console.log("\n═══════════════════════════════════════════");
  console.log("  AAVE V3 DEPLOYMENT COMPLETE");
  console.log("═══════════════════════════════════════════\n");
  console.log(JSON.stringify(result, null, 2));

  const outPath = path.join(__dirname, "../../deployments/creditcoin-testnet/aave-v3.json");
  fs.writeFileSync(outPath, JSON.stringify(result, null, 2));
  console.log(`\nSaved to: ${outPath}`);
}

main().then(() => process.exit(0)).catch(e => { console.error("\nFAILED:", e.message || e); process.exit(1); });
