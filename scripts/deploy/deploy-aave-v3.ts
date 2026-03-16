/**
 * Deploy Aave V3 for Snowball Protocol on Creditcoin Testnet
 *
 * Phases:
 *   1. Core Infrastructure  — PoolAddressesProviderRegistry, PoolAddressesProvider,
 *                             ACLManager, Pool proxy, PoolConfigurator proxy
 *   2. Oracle               — AaveOracleAdapterFactory → per-asset adapters, AaveOracle
 *   3. Interest Rate        — DefaultReserveInterestRateStrategy (volatile + stable)
 *   4. Token Implementations — AToken, StableDebtToken, VariableDebtToken
 *   5. Reserve Configuration — initReserves, configureReserveAsCollateral,
 *                              setReserveFactor, setReserveBorrowing
 *   6. ACL Setup            — POOL_ADMIN, EMERGENCY_ADMIN, RISK_ADMIN
 *   7. Periphery            — AaveProtocolDataProvider, UiPoolDataProviderV3
 *
 * Usage:
 *   npx tsx scripts/deploy/deploy-aave-v3.ts
 *
 * Prerequisites:
 *   - scripts/simulation-accounts.json  (deployer private key)
 *   - packages/aave/out/               (Foundry build output)
 *   - packages/integration/out/        (Foundry build output)
 *   - SnowballOracle already deployed; set SNOWBALL_ORACLE below.
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

// ─── Chain ────────────────────────────────────────────────────────────────────
const creditcoinTestnet = {
  id: 102031,
  name: "Creditcoin Testnet" as const,
  nativeCurrency: { name: "CTC", symbol: "tCTC", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://rpc.cc3-testnet.creditcoin.network" as const] },
  },
  testnet: true,
} as const;

// ─── Accounts ─────────────────────────────────────────────────────────────────
const accounts = JSON.parse(
  fs.readFileSync(
    path.join(__dirname, "../simulation-accounts.json"),
    "utf8",
  ),
);
const PK = accounts.deployer.privateKey as `0x${string}`;
const account = privateKeyToAccount(PK);

const publicClient = createPublicClient({
  chain: creditcoinTestnet as any,
  transport: http(),
});
const walletClient = createWalletClient({
  account,
  chain: creditcoinTestnet as any,
  transport: http(),
});

// ─── Protocol Addresses ───────────────────────────────────────────────────────
// Tokens — SSOT from packages/core/src/config/addresses.ts
const TOKENS = {
  wCTC:   "0xca69344e2917f026ef4a5ace5d7b122343fc8528" as Address,
  lstCTC: "0xa768d376272f9216c8c4aa3063391bdafbcad4c2" as Address,
  sbUSD:  "0x8aefed3e2e9a886bdd72ec9cebe27d7aabced2a5" as Address,
  USDC:   "0x60e204104cfe1a93f630ea5ebc0a895cc80ebed9" as Address,
} as const;

// SnowballOracle: deploy separately before running this script.
// Set SNOWBALL_ORACLE to the deployed address, or pass via env:
//   SNOWBALL_ORACLE=0x... npx tsx scripts/deploy/deploy-aave-v3.ts
const SNOWBALL_ORACLE = (process.env.SNOWBALL_ORACLE ??
  "0x0000000000000000000000000000000000000000") as Address;

// Treasury — receives reserve factor fees.  Set to deployer for testnet.
// Override via TREASURY env var for production.
const TREASURY = (process.env.TREASURY ?? account.address) as Address;

// Incentives controller — not used on testnet; pass zero address.
const ZERO = "0x0000000000000000000000000000000000000000" as Address;
const INCENTIVES_CONTROLLER = ZERO;

// Max acceptable oracle price age (seconds).  1 hour for testnet.
const MAX_PRICE_AGE = 3600n;

// ─── Artifact Loaders ─────────────────────────────────────────────────────────
const AAVE_OUT = path.join(__dirname, "../../packages/aave/out");
const INTEGRATION_OUT = path.join(__dirname, "../../packages/integration/out");

/**
 * Load a Foundry artifact from packages/aave/out/<ContractName>.sol/<ContractName>.json
 */
function loadAaveArtifact(
  contractName: string,
): { abi: Abi; bytecode: `0x${string}` } {
  const p = path.join(AAVE_OUT, `${contractName}.sol`, `${contractName}.json`);
  if (!fs.existsSync(p)) throw new Error(`Aave artifact not found: ${p}`);
  const data = JSON.parse(fs.readFileSync(p, "utf8"));
  return {
    abi: data.abi,
    bytecode: (data.bytecode?.object ?? data.bytecode) as `0x${string}`,
  };
}

/**
 * Load a Foundry artifact from packages/integration/out/<ContractName>.sol/<ContractName>.json
 */
function loadIntegrationArtifact(
  contractName: string,
): { abi: Abi; bytecode: `0x${string}` } {
  const p = path.join(
    INTEGRATION_OUT,
    `${contractName}.sol`,
    `${contractName}.json`,
  );
  if (!fs.existsSync(p))
    throw new Error(`Integration artifact not found: ${p}`);
  const data = JSON.parse(fs.readFileSync(p, "utf8"));
  return {
    abi: data.abi,
    bytecode: (data.bytecode?.object ?? data.bytecode) as `0x${string}`,
  };
}

// ─── Deploy / TX Helpers ──────────────────────────────────────────────────────
async function deploy(
  name: string,
  abi: Abi,
  bytecode: `0x${string}`,
  args: unknown[] = [],
  gas = 10_000_000n,
): Promise<Address> {
  console.log(`  Deploying ${name}...`);
  const hash = await walletClient.deployContract({ abi, bytecode, args, gas });
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  if (receipt.status !== "success")
    throw new Error(`Deploy ${name} failed (tx: ${hash})`);
  const addr = receipt.contractAddress!;
  console.log(`  ${name}: ${addr}`);
  return addr;
}

async function send(
  address: Address,
  abi: Abi,
  functionName: string,
  args: unknown[] = [],
  gas = 5_000_000n,
) {
  const hash = await walletClient.writeContract({
    address,
    abi,
    functionName,
    args,
    gas,
  });
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  if (receipt.status !== "success")
    throw new Error(`TX ${functionName} failed (tx: ${hash})`);
  return receipt;
}

// ─── Ray Math ─────────────────────────────────────────────────────────────────
// 1 ray = 1e27 (Aave's internal precision unit for rates)
const RAY = 10n ** 27n;

/** Convert a percentage (e.g. 65 for 65%) to ray units. */
function pctToRay(pct: number): bigint {
  // pct / 100 * 1e27
  return (BigInt(Math.round(pct * 100)) * RAY) / 10_000n;
}

// ─── Bps Helper ───────────────────────────────────────────────────────────────
/** Convert a percentage (e.g. 65 for 65%) to basis-point units used by
 *  PoolConfigurator (10 000 = 100%).
 */
function pctToBps(pct: number): bigint {
  return BigInt(Math.round(pct * 100));
}

/** Liquidation bonus: Aave stores it as 100% + bonus%.
 *  e.g. 10% bonus → 11000 bps (110%).
 */
function liqBonusBps(bonusPct: number): bigint {
  return BigInt(10_000 + Math.round(bonusPct * 100));
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log("════════════════════════════════════════════════════════");
  console.log("  AAVE V3 DEPLOYMENT — Snowball / Creditcoin Testnet");
  console.log("════════════════════════════════════════════════════════");
  console.log(`  Deployer:        ${account.address}`);
  console.log(`  SnowballOracle:  ${SNOWBALL_ORACLE}`);
  console.log(`  Treasury:        ${TREASURY}`);

  if (SNOWBALL_ORACLE === ZERO) {
    console.warn(
      "\n  WARNING: SNOWBALL_ORACLE is zero address.\n" +
        "  Set the SNOWBALL_ORACLE env variable to the deployed SnowballOracle address\n" +
        "  before running this script in production.\n",
    );
  }

  const balance = await publicClient.getBalance({ address: account.address });
  console.log(`  Balance:         ${formatEther(balance)} CTC\n`);

  // ─── Load Artifacts ────────────────────────────────────────────────────────
  const registryArt   = loadAaveArtifact("PoolAddressesProviderRegistry");
  const providerArt   = loadAaveArtifact("PoolAddressesProvider");
  const aclArt        = loadAaveArtifact("ACLManager");
  const poolArt       = loadAaveArtifact("Pool");
  const configuratorArt = loadAaveArtifact("PoolConfigurator");
  const aaveOracleArt = loadAaveArtifact("AaveOracle");
  const rateStratArt  = loadAaveArtifact("DefaultReserveInterestRateStrategy");
  const aTokenArt     = loadAaveArtifact("AToken");
  const stableDebtArt = loadAaveArtifact("StableDebtToken");
  const varDebtArt    = loadAaveArtifact("VariableDebtToken");
  const dataProviderArt = loadAaveArtifact("AaveProtocolDataProvider");
  const uiDataProviderArt = loadAaveArtifact("UiPoolDataProviderV3");
  const adapterFactoryArt = loadIntegrationArtifact("AaveOracleAdapterFactory");

  // ═══════════════════════════════════════════════════════════════════════════
  // PHASE 1 — Core Infrastructure
  // ═══════════════════════════════════════════════════════════════════════════
  console.log("\n═══ Phase 1: Core Infrastructure ═══");

  // 1. PoolAddressesProviderRegistry
  const registry = await deploy(
    "PoolAddressesProviderRegistry",
    registryArt.abi,
    registryArt.bytecode,
    [account.address], // owner
  );

  // 2. PoolAddressesProvider (market ID = "Snowball")
  const provider = await deploy(
    "PoolAddressesProvider",
    providerArt.abi,
    providerArt.bytecode,
    ["Snowball", account.address], // marketId, owner
  );

  // Register provider in registry with ID 1
  console.log("  Registering PoolAddressesProvider in registry...");
  await send(registry, registryArt.abi, "registerAddressesProvider", [
    provider,
    1n, // market ID
  ]);

  // 3. ACLManager — requires ACL admin to be set on provider first
  console.log("  Setting ACL admin on provider...");
  await send(provider, providerArt.abi, "setACLAdmin", [account.address]);

  const aclManager = await deploy(
    "ACLManager",
    aclArt.abi,
    aclArt.bytecode,
    [provider], // IPoolAddressesProvider
  );

  console.log("  Setting ACLManager on provider...");
  await send(provider, providerArt.abi, "setACLManager", [aclManager]);

  // 4. Pool implementation → proxy via provider
  const poolImpl = await deploy(
    "Pool (implementation)",
    poolArt.abi,
    poolArt.bytecode,
    [provider], // IPoolAddressesProvider (immutable)
  );

  console.log("  Setting Pool implementation (creates proxy)...");
  await send(provider, providerArt.abi, "setPoolImpl", [poolImpl]);

  const pool = (await publicClient.readContract({
    address: provider,
    abi: providerArt.abi,
    functionName: "getPool",
  })) as Address;
  console.log(`  Pool proxy: ${pool}`);

  // 5. PoolConfigurator implementation → proxy via provider
  const configuratorImpl = await deploy(
    "PoolConfigurator (implementation)",
    configuratorArt.abi,
    configuratorArt.bytecode,
    [], // no constructor args (VersionedInitializable)
  );

  console.log("  Setting PoolConfigurator implementation (creates proxy)...");
  await send(provider, providerArt.abi, "setPoolConfiguratorImpl", [
    configuratorImpl,
  ]);

  const configurator = (await publicClient.readContract({
    address: provider,
    abi: providerArt.abi,
    functionName: "getPoolConfigurator",
  })) as Address;
  console.log(`  PoolConfigurator proxy: ${configurator}`);

  // ═══════════════════════════════════════════════════════════════════════════
  // PHASE 2 — Oracle
  // ═══════════════════════════════════════════════════════════════════════════
  console.log("\n═══ Phase 2: Oracle ═══");

  // 6. Deploy AaveOracleAdapterFactory, then adapters for each asset
  const adapterFactory = await deploy(
    "AaveOracleAdapterFactory",
    adapterFactoryArt.abi,
    adapterFactoryArt.bytecode,
    [],
  );

  // Deploy one adapter per asset via the factory.
  // AaveOracleAdapterFactory.deployAdapter(snowballOracle, asset, maxPriceAge)
  // returns the adapter address via the transaction return value; we capture it
  // from the emitted AdapterDeployed event.
  async function deployAdapter(
    assetName: string,
    assetAddress: Address,
  ): Promise<Address> {
    console.log(`  Deploying adapter for ${assetName}...`);
    const hash = await walletClient.writeContract({
      address: adapterFactory,
      abi: adapterFactoryArt.abi,
      functionName: "deployAdapter",
      args: [SNOWBALL_ORACLE, assetAddress, MAX_PRICE_AGE],
      gas: 3_000_000n,
    });
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    if (receipt.status !== "success")
      throw new Error(`deployAdapter(${assetName}) failed`);

    // Parse AdapterDeployed(adapter, snowballOracle, asset, maxPriceAge)
    // topic0 = keccak256("AdapterDeployed(address,address,address,uint256)")
    const ADAPTER_DEPLOYED_TOPIC =
      "0xa84204fcd33362d80055d1272b4bb0da3d388db349e7e5635f5cb3a1f56d4591" as `0x${string}`;
    const log = receipt.logs.find(
      (l) => l.topics[0] === ADAPTER_DEPLOYED_TOPIC,
    );
    if (!log) throw new Error(`AdapterDeployed event not found for ${assetName}`);
    // topic1 = adapter address (indexed)
    const adapterAddr = ("0x" +
      log.topics[1]!.slice(26)) as Address;
    console.log(`  ${assetName} adapter: ${adapterAddr}`);
    return adapterAddr;
  }

  const adapterWCTC   = await deployAdapter("wCTC",   TOKENS.wCTC);
  const adapterLstCTC = await deployAdapter("lstCTC", TOKENS.lstCTC);
  const adapterSbUSD  = await deployAdapter("sbUSD",  TOKENS.sbUSD);
  const adapterUSDC   = await deployAdapter("USDC",   TOKENS.USDC);

  // 7. AaveOracle
  //   constructor(provider, assets[], sources[], fallbackOracle, baseCurrency, baseCurrencyUnit)
  //   baseCurrency = USD → address(0), baseCurrencyUnit = 1e8
  const aaveOracle = await deploy(
    "AaveOracle",
    aaveOracleArt.abi,
    aaveOracleArt.bytecode,
    [
      provider,
      [TOKENS.wCTC, TOKENS.lstCTC, TOKENS.sbUSD, TOKENS.USDC], // assets
      [adapterWCTC, adapterLstCTC, adapterSbUSD, adapterUSDC],  // sources
      ZERO,            // fallback oracle (none)
      ZERO,            // baseCurrency = USD (address(0) convention)
      100_000_000n,    // baseCurrencyUnit = 1e8
    ],
  );

  // 8. Set oracle in provider
  console.log("  Setting AaveOracle on provider...");
  await send(provider, providerArt.abi, "setPriceOracle", [aaveOracle]);

  // ═══════════════════════════════════════════════════════════════════════════
  // PHASE 3 — Interest Rate Strategies
  // ═══════════════════════════════════════════════════════════════════════════
  console.log("\n═══ Phase 3: Interest Rate Strategies ═══");

  // DefaultReserveInterestRateStrategy constructor args (all in ray):
  //   provider, optimalUsageRatio, baseVariableBorrowRate,
  //   variableRateSlope1, variableRateSlope2,
  //   stableRateSlope1, stableRateSlope2,
  //   baseStableRateOffset, stableRateExcessOffset,
  //   optimalStableToTotalDebtRatio

  // Volatile strategy (wCTC, lstCTC):
  //   optimalUsage=65%, baseRate=0%, slope1=7%, slope2=300%
  //   stable slopes match variable; baseStableOffset=2%, excessOffset=5%
  //   optimalStableToTotalDebt=20%
  const rateStratVolatile = await deploy(
    "DefaultReserveInterestRateStrategy (volatile)",
    rateStratArt.abi,
    rateStratArt.bytecode,
    [
      provider,
      pctToRay(65),   // optimalUsageRatio
      pctToRay(0),    // baseVariableBorrowRate
      pctToRay(7),    // variableRateSlope1
      pctToRay(300),  // variableRateSlope2
      pctToRay(7),    // stableRateSlope1
      pctToRay(300),  // stableRateSlope2
      pctToRay(2),    // baseStableRateOffset
      pctToRay(5),    // stableRateExcessOffset
      pctToRay(20),   // optimalStableToTotalDebtRatio
    ],
  );

  // Stablecoin strategy (sbUSD, USDC):
  //   optimalUsage=90%, baseRate=0%, slope1=4%, slope2=60%
  //   stable slopes match variable; baseStableOffset=1%, excessOffset=2%
  //   optimalStableToTotalDebt=20%
  const rateStratStable = await deploy(
    "DefaultReserveInterestRateStrategy (stablecoin)",
    rateStratArt.abi,
    rateStratArt.bytecode,
    [
      provider,
      pctToRay(90),   // optimalUsageRatio
      pctToRay(0),    // baseVariableBorrowRate
      pctToRay(4),    // variableRateSlope1
      pctToRay(60),   // variableRateSlope2
      pctToRay(4),    // stableRateSlope1
      pctToRay(60),   // stableRateSlope2
      pctToRay(1),    // baseStableRateOffset
      pctToRay(2),    // stableRateExcessOffset
      pctToRay(20),   // optimalStableToTotalDebtRatio
    ],
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // PHASE 4 — Token Implementations
  // ═══════════════════════════════════════════════════════════════════════════
  console.log("\n═══ Phase 4: Token Implementations ═══");

  // AToken, StableDebtToken, VariableDebtToken each take the Pool proxy as
  // their constructor argument (IPool).
  const aTokenImpl = await deploy(
    "AToken (implementation)",
    aTokenArt.abi,
    aTokenArt.bytecode,
    [pool],
  );

  const stableDebtImpl = await deploy(
    "StableDebtToken (implementation)",
    stableDebtArt.abi,
    stableDebtArt.bytecode,
    [pool],
  );

  const variableDebtImpl = await deploy(
    "VariableDebtToken (implementation)",
    varDebtArt.abi,
    varDebtArt.bytecode,
    [pool],
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // PHASE 5 — Reserve Configuration
  // ═══════════════════════════════════════════════════════════════════════════
  console.log("\n═══ Phase 5: Reserve Configuration ═══");

  // Before calling initReserves the deployer must be POOL_ADMIN so that
  // PoolConfigurator's onlyPoolAdmin modifier passes.
  // We set that up first (ACL phase could also come before, but we need it now).
  console.log("  Granting POOL_ADMIN to deployer (needed for initReserves)...");
  await send(aclManager, aclArt.abi, "addPoolAdmin", [account.address]);

  // ConfiguratorInputTypes.InitReserveInput struct fields (in order):
  //   aTokenImpl, stableDebtTokenImpl, variableDebtTokenImpl,
  //   underlyingAssetDecimals, interestRateStrategyAddress,
  //   underlyingAsset, treasury, incentivesController,
  //   aTokenName, aTokenSymbol, variableDebtTokenName, variableDebtTokenSymbol,
  //   stableDebtTokenName, stableDebtTokenSymbol, params
  const initInputs = [
    {
      aTokenImpl,
      stableDebtTokenImpl: stableDebtImpl,
      variableDebtTokenImpl: variableDebtImpl,
      underlyingAssetDecimals: 18,
      interestRateStrategyAddress: rateStratVolatile,
      underlyingAsset: TOKENS.wCTC,
      treasury: TREASURY,
      incentivesController: INCENTIVES_CONTROLLER,
      aTokenName: "Snowball Aave wCTC",
      aTokenSymbol: "sawCTC",
      variableDebtTokenName: "Snowball Variable Debt wCTC",
      variableDebtTokenSymbol: "variableDebtSawCTC",
      stableDebtTokenName: "Snowball Stable Debt wCTC",
      stableDebtTokenSymbol: "stableDebtSawCTC",
      params: "0x" as `0x${string}`,
    },
    {
      aTokenImpl,
      stableDebtTokenImpl: stableDebtImpl,
      variableDebtTokenImpl: variableDebtImpl,
      underlyingAssetDecimals: 18,
      interestRateStrategyAddress: rateStratVolatile,
      underlyingAsset: TOKENS.lstCTC,
      treasury: TREASURY,
      incentivesController: INCENTIVES_CONTROLLER,
      aTokenName: "Snowball Aave lstCTC",
      aTokenSymbol: "salistCTC",
      variableDebtTokenName: "Snowball Variable Debt lstCTC",
      variableDebtTokenSymbol: "variableDebtSalistCTC",
      stableDebtTokenName: "Snowball Stable Debt lstCTC",
      stableDebtTokenSymbol: "stableDebtSalistCTC",
      params: "0x" as `0x${string}`,
    },
    {
      aTokenImpl,
      stableDebtTokenImpl: stableDebtImpl,
      variableDebtTokenImpl: variableDebtImpl,
      underlyingAssetDecimals: 18,
      interestRateStrategyAddress: rateStratStable,
      underlyingAsset: TOKENS.sbUSD,
      treasury: TREASURY,
      incentivesController: INCENTIVES_CONTROLLER,
      aTokenName: "Snowball Aave sbUSD",
      aTokenSymbol: "sasbUSD",
      variableDebtTokenName: "Snowball Variable Debt sbUSD",
      variableDebtTokenSymbol: "variableDebtSasbUSD",
      stableDebtTokenName: "Snowball Stable Debt sbUSD",
      stableDebtTokenSymbol: "stableDebtSasbUSD",
      params: "0x" as `0x${string}`,
    },
    {
      aTokenImpl,
      stableDebtTokenImpl: stableDebtImpl,
      variableDebtTokenImpl: variableDebtImpl,
      underlyingAssetDecimals: 18,
      interestRateStrategyAddress: rateStratStable,
      underlyingAsset: TOKENS.USDC,
      treasury: TREASURY,
      incentivesController: INCENTIVES_CONTROLLER,
      aTokenName: "Snowball Aave USDC",
      aTokenSymbol: "saUSDC",
      variableDebtTokenName: "Snowball Variable Debt USDC",
      variableDebtTokenSymbol: "variableDebtSaUSDC",
      stableDebtTokenName: "Snowball Stable Debt USDC",
      stableDebtTokenSymbol: "stableDebtSaUSDC",
      params: "0x" as `0x${string}`,
    },
  ];

  console.log("  Initialising reserves (all 4 in one call)...");
  await send(
    configurator,
    configuratorArt.abi,
    "initReserves",
    [initInputs],
    8_000_000n,
  );

  // Enable borrowing on all reserves.
  const allAssets = [TOKENS.wCTC, TOKENS.lstCTC, TOKENS.sbUSD, TOKENS.USDC];
  for (const asset of allAssets) {
    await send(configurator, configuratorArt.abi, "setReserveBorrowing", [
      asset,
      true,
    ]);
  }

  // configureReserveAsCollateral(asset, ltv_bps, liquidationThreshold_bps, liquidationBonus_bps)
  // LTV / threshold in bps (100% = 10 000), bonus as 100%+bonus in bps.
  const collateralConfigs: Array<{
    asset: Address;
    ltv: number;          // %
    threshold: number;    // %
    bonus: number;        // % bonus on top of 100%
    reserveFactor: number; // %
    label: string;
  }> = [
    { asset: TOKENS.wCTC,   ltv: 65, threshold: 75, bonus: 10, reserveFactor: 10, label: "wCTC"   },
    { asset: TOKENS.lstCTC, ltv: 70, threshold: 80, bonus: 8,  reserveFactor: 10, label: "lstCTC" },
    { asset: TOKENS.sbUSD,  ltv: 80, threshold: 85, bonus: 5,  reserveFactor: 10, label: "sbUSD"  },
    { asset: TOKENS.USDC,   ltv: 80, threshold: 85, bonus: 5,  reserveFactor: 10, label: "USDC"   },
  ];

  for (const cfg of collateralConfigs) {
    console.log(`  Configuring collateral params for ${cfg.label}...`);
    await send(
      configurator,
      configuratorArt.abi,
      "configureReserveAsCollateral",
      [
        cfg.asset,
        pctToBps(cfg.ltv),            // ltv
        pctToBps(cfg.threshold),      // liquidationThreshold
        liqBonusBps(cfg.bonus),       // liquidationBonus (100% + bonus%)
      ],
    );

    console.log(`  Setting reserve factor for ${cfg.label}...`);
    await send(configurator, configuratorArt.abi, "setReserveFactor", [
      cfg.asset,
      pctToBps(cfg.reserveFactor),
    ]);
  }

  // Enable flash loans on all reserves
  for (const asset of allAssets) {
    await send(configurator, configuratorArt.abi, "setReserveFlashLoaning", [
      asset,
      true,
    ]);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PHASE 6 — ACL Setup
  // ═══════════════════════════════════════════════════════════════════════════
  console.log("\n═══ Phase 6: ACL Setup ═══");

  // POOL_ADMIN was already granted above; confirm and also add EMERGENCY_ADMIN
  // and RISK_ADMIN roles to the deployer for testnet convenience.
  console.log("  Granting EMERGENCY_ADMIN to deployer...");
  await send(aclManager, aclArt.abi, "addEmergencyAdmin", [account.address]);

  console.log("  Granting RISK_ADMIN to deployer...");
  await send(aclManager, aclArt.abi, "addRiskAdmin", [account.address]);

  // Verify roles
  const isPoolAdmin = (await publicClient.readContract({
    address: aclManager,
    abi: aclArt.abi,
    functionName: "isPoolAdmin",
    args: [account.address],
  })) as boolean;
  const isEmergency = (await publicClient.readContract({
    address: aclManager,
    abi: aclArt.abi,
    functionName: "isEmergencyAdmin",
    args: [account.address],
  })) as boolean;
  const isRisk = (await publicClient.readContract({
    address: aclManager,
    abi: aclArt.abi,
    functionName: "isRiskAdmin",
    args: [account.address],
  })) as boolean;
  console.log(
    `  Role check — POOL_ADMIN: ${isPoolAdmin}, EMERGENCY_ADMIN: ${isEmergency}, RISK_ADMIN: ${isRisk}`,
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // PHASE 7 — Periphery
  // ═══════════════════════════════════════════════════════════════════════════
  console.log("\n═══ Phase 7: Periphery ═══");

  // AaveProtocolDataProvider(IPoolAddressesProvider)
  const dataProvider = await deploy(
    "AaveProtocolDataProvider",
    dataProviderArt.abi,
    dataProviderArt.bytecode,
    [provider],
  );

  // Register data provider on PoolAddressesProvider
  console.log("  Registering data provider on PoolAddressesProvider...");
  await send(provider, providerArt.abi, "setPoolDataProvider", [dataProvider]);

  // UiPoolDataProviderV3 takes two IEACAggregatorProxy price feed addresses:
  //   networkBaseTokenPriceInUsdProxyAggregator  — CTC/USD price for gas
  //   marketReferenceCurrencyPriceInUsdProxyAggregator — USD/USD = 1
  // We reuse the wCTC adapter for the network base token and the sbUSD adapter
  // (pegged to $1) as the market reference currency feed.
  const uiDataProvider = await deploy(
    "UiPoolDataProviderV3",
    uiDataProviderArt.abi,
    uiDataProviderArt.bytecode,
    [
      adapterWCTC,   // networkBaseTokenPriceInUsdProxyAggregator (CTC/USD)
      adapterSbUSD,  // marketReferenceCurrencyPriceInUsdProxyAggregator (USD/USD ≈ $1)
    ],
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // OUTPUT
  // ═══════════════════════════════════════════════════════════════════════════
  const deployment = {
    network: { name: "Creditcoin Testnet", chainId: 102031 },
    core: {
      poolAddressesProviderRegistry: registry,
      poolAddressesProvider: provider,
      aclManager,
      pool,
      poolImpl,
      poolConfigurator: configurator,
      poolConfiguratorImpl: configuratorImpl,
    },
    oracle: {
      snowballOracle: SNOWBALL_ORACLE,
      adapterFactory,
      adapters: {
        wCTC:   adapterWCTC,
        lstCTC: adapterLstCTC,
        sbUSD:  adapterSbUSD,
        USDC:   adapterUSDC,
      },
      aaveOracle,
    },
    interestRateStrategies: {
      volatile:   rateStratVolatile,
      stablecoin: rateStratStable,
    },
    tokenImplementations: {
      aToken:           aTokenImpl,
      stableDebtToken:  stableDebtImpl,
      variableDebtToken: variableDebtImpl,
    },
    periphery: {
      dataProvider,
      uiDataProvider,
    },
    treasury: TREASURY,
    tokens: TOKENS,
  };

  // Save to deployments/creditcoin-testnet/aave-v3.json
  const deployDir = path.join(
    __dirname,
    "../../deployments/creditcoin-testnet",
  );
  fs.mkdirSync(deployDir, { recursive: true });
  const outFile = path.join(deployDir, "aave-v3.json");
  fs.writeFileSync(outFile, JSON.stringify(deployment, null, 2) + "\n");

  console.log("\n════════════════════════════════════════════════════════");
  console.log("  AAVE V3 DEPLOYMENT COMPLETE");
  console.log("════════════════════════════════════════════════════════");
  console.log(`  PoolAddressesProviderRegistry: ${registry}`);
  console.log(`  PoolAddressesProvider:         ${provider}`);
  console.log(`  ACLManager:                    ${aclManager}`);
  console.log(`  Pool (proxy):                  ${pool}`);
  console.log(`  PoolConfigurator (proxy):      ${configurator}`);
  console.log(`  AaveOracle:                    ${aaveOracle}`);
  console.log(`  RateStrategy (volatile):       ${rateStratVolatile}`);
  console.log(`  RateStrategy (stablecoin):     ${rateStratStable}`);
  console.log(`  AToken impl:                   ${aTokenImpl}`);
  console.log(`  StableDebtToken impl:          ${stableDebtImpl}`);
  console.log(`  VariableDebtToken impl:        ${variableDebtImpl}`);
  console.log(`  AaveProtocolDataProvider:      ${dataProvider}`);
  console.log(`  UiPoolDataProviderV3:          ${uiDataProvider}`);
  console.log(`\n  Deployment saved to: ${outFile}`);
  console.log("\n  Update packages/core/src/config/addresses.ts AAVE section!");
}

main().catch((err) => {
  console.error("\nDEPLOYMENT FAILED:", err);
  process.exit(1);
});
