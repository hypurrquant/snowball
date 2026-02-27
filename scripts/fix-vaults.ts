/**
 * Fix Yield Vaults — Redeploy strategies with correct contract interfaces
 *
 * Issue 1: StrategyWCTCMorpho uses wrong marketId (wCTC is collateral, not loanToken)
 *   → Create new Morpho market (loanToken=wCTC), deploy new vault+strategy
 *
 * Issue 2: StrategySbUSDStabilityPool has wrong function signature (provideToSP(uint256,bool) vs provideToSP(uint256))
 *   → Deploy new vault+strategy with fixed interface
 *
 * Usage: cd packages/yield && npx tsx ../../scripts/fix-vaults.ts
 */
import {
  createPublicClient,
  createWalletClient,
  http,
  parseEther,
  formatEther,
  keccak256,
  encodeAbiParameters,
  parseAbiParameters,
  type Address,
  type Abi,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import * as fs from "fs";
import * as path from "path";
import * as dotenv from "dotenv";

dotenv.config({ path: path.join(__dirname, "../.env") });

const creditcoinTestnet = {
  id: 102031,
  name: "Creditcoin Testnet" as const,
  nativeCurrency: { name: "CTC", symbol: "tCTC", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://rpc.cc3-testnet.creditcoin.network" as const] },
  },
  testnet: true,
} as const;

const PRIVATE_KEY = process.env.DEPLOYER_PRIVATE_KEY;
if (!PRIVATE_KEY) { console.error("Set DEPLOYER_PRIVATE_KEY in .env"); process.exit(1); }

const account = privateKeyToAccount(PRIVATE_KEY as `0x${string}`);
const publicClient = createPublicClient({ chain: creditcoinTestnet as any, transport: http() });
const walletClient = createWalletClient({ account, chain: creditcoinTestnet as any, transport: http() });

// ─── Addresses from deployments ───
const TOKENS = {
  wCTC: "0x8f7f60a0f615d828eafcbbf6121f73efcfb56969" as Address,
  sbUSD: "0x5772f9415b75ecca00e7667e0c7d730db3b29fbd" as Address,
  USDC: "0xbcaa46ef7a399fcdb64adf4520cdcc6d62fcaaed" as Address,
};

const MORPHO = {
  snowballLend: "0x7d604b31297b36aace73255931f65e891cf289d3" as Address,
  irm: "0x0ac487d84507b2fbe9130acc080f2b554cb3fffe" as Address,
  wCTCOracle: "0x42ca12a83c14e95f567afc940b0118166d8bd852" as Address,
};

const LIQUITY = {
  stabilityPool_wCTC: "0x91c9983499f257015597d756108efdf26746db81" as Address,
};

const DEX = {
  router: "0xd604593426538fd1fa5b2660e3e443fa1ce93411" as Address,
  poolDeployer: "0x0000000000000000000000000000000000000000" as Address, // address(0) for standard pools
};

const LLTV_77 = parseEther("0.77"); // 77% LLTV

function loadArtifact(contractName: string): { abi: Abi; bytecode: `0x${string}` } {
  // Try yield package first, then morpho
  const candidates = [
    path.join(__dirname, `../packages/yield/out/${contractName}.sol/${contractName}.json`),
    path.join(__dirname, `../packages/morpho/out/${contractName}.sol/${contractName}.json`),
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) {
      const data = JSON.parse(fs.readFileSync(p, "utf8"));
      return { abi: data.abi, bytecode: data.bytecode.object as `0x${string}` };
    }
  }
  throw new Error(`Artifact not found for ${contractName}`);
}

async function deploy(name: string, args: any[] = []): Promise<{ address: Address; abi: Abi }> {
  const { abi, bytecode } = loadArtifact(name);
  console.log(`  Deploying ${name}...`);
  const hash = await walletClient.deployContract({ abi, bytecode, args, gas: 15_000_000n });
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  if (receipt.status !== "success") throw new Error(`Deploy ${name} reverted`);
  const address = receipt.contractAddress!;
  console.log(`  ${name}: ${address} (gas: ${receipt.gasUsed})`);
  return { address, abi };
}

async function send(address: Address, abi: Abi, functionName: string, args: any[] = []) {
  const hash = await walletClient.writeContract({ address, abi, functionName, args, gas: 5_000_000n });
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  if (receipt.status !== "success") throw new Error(`TX ${functionName} failed`);
  return hash;
}

async function readContract(address: Address, abi: Abi, functionName: string, args: any[] = []) {
  return publicClient.readContract({ address, abi, functionName, args });
}

async function main() {
  console.log("=== Fix Yield Vaults ===\n");
  console.log(`Deployer: ${account.address}`);
  const balance = await publicClient.getBalance({ address: account.address });
  console.log(`Balance: ${formatEther(balance)} CTC\n`);

  const strategist = account.address;
  const treasury = account.address;

  // ══════════════════════════════════════════════════════════
  //  ISSUE 1: wCTC Morpho Vault — Create market + redeploy
  // ══════════════════════════════════════════════════════════
  console.log("═══════════════════════════════════════");
  console.log("  Issue 1: wCTC Morpho Vault Fix");
  console.log("═══════════════════════════════════════\n");

  // Step 1a: Deploy new MockOracle for reversed pair
  // For wCTC as loanToken, sbUSD as collateral:
  // Oracle returns collateral/loan price = sbUSD_price / wCTC_price
  // If wCTC = $0.20, sbUSD = $1.00: price = 1.0/0.2 = 5.0
  // Morpho oracle uses 36 decimals
  console.log("── Step 1a: Deploy MockOracle for wCTC-loan market ──");
  const oraclePrice = parseEther("5"); // sbUSD/wCTC = 5 (1 sbUSD = 5 wCTC worth)
  const reversedOracle = await deploy("MockOracle", [oraclePrice]);

  // Step 1b: Create new Morpho market (loanToken=wCTC, collateralToken=sbUSD)
  console.log("\n── Step 1b: Create Morpho market (loanToken=wCTC) ──");
  const morphoAbi = loadArtifact("SnowballLend").abi;

  // Check if LLTV is enabled
  const lltvEnabled = await readContract(MORPHO.snowballLend, morphoAbi, "isLltvEnabled", [LLTV_77]);
  console.log(`  LLTV 77% enabled: ${lltvEnabled}`);

  const marketParams = [TOKENS.wCTC, TOKENS.sbUSD, reversedOracle.address, MORPHO.irm, LLTV_77] as const;
  await send(MORPHO.snowballLend, morphoAbi, "createMarket", [marketParams]);
  console.log("  Market created ✓");

  // Calculate marketId = keccak256(abi.encode(marketParams))
  const newMarketId = keccak256(
    encodeAbiParameters(
      parseAbiParameters("address, address, address, address, uint256"),
      [TOKENS.wCTC, TOKENS.sbUSD, reversedOracle.address, MORPHO.irm, LLTV_77]
    )
  );
  console.log(`  New marketId: ${newMarketId}`);

  // Verify market exists
  const marketState = await readContract(MORPHO.snowballLend, morphoAbi, "idToMarketParams", [newMarketId]);
  console.log(`  Market verified: loanToken=${(marketState as any)[0]}`);

  // Step 1c: Deploy new vault + strategy
  console.log("\n── Step 1c: Deploy new wCTC Vault + Strategy ──");
  const newWCTCVault = await deploy("SnowballYieldVault", [TOKENS.wCTC, "Snowball wCTC-Morpho Vault", "mooWCTC-Morpho"]);
  const newWCTCStrategy = await deploy("StrategyWCTCMorpho", [
    newWCTCVault.address,
    TOKENS.wCTC,             // want
    TOKENS.wCTC,             // native
    DEX.router,
    DEX.poolDeployer,
    strategist,
    treasury,
    MORPHO.snowballLend,
    newMarketId,
  ]);

  // Set strategy on vault
  await send(newWCTCVault.address, newWCTCVault.abi, "setStrategy", [newWCTCStrategy.address]);
  console.log("  Strategy set on vault ✓");

  // ══════════════════════════════════════════════════════════
  //  ISSUE 2: sbUSD SP Vault — Redeploy with fixed interface
  // ══════════════════════════════════════════════════════════
  console.log("\n═══════════════════════════════════════");
  console.log("  Issue 2: sbUSD SP Vault Fix");
  console.log("═══════════════════════════════════════\n");

  // Deploy new vault + strategy (with fixed provideToSP(uint256) signature)
  console.log("── Step 2a: Deploy new sbUSD-SP Vault + Strategy ──");
  const newSPVault = await deploy("SnowballYieldVault", [TOKENS.sbUSD, "Snowball sbUSD-SP Vault", "mooSbUSD-SP"]);
  const newSPStrategy = await deploy("StrategySbUSDStabilityPool", [
    newSPVault.address,
    TOKENS.sbUSD,            // want
    TOKENS.wCTC,             // native
    DEX.router,
    DEX.poolDeployer,
    strategist,
    treasury,
    LIQUITY.stabilityPool_wCTC,
  ]);

  // Set strategy on vault
  await send(newSPVault.address, newSPVault.abi, "setStrategy", [newSPStrategy.address]);
  console.log("  Strategy set on vault ✓");

  // ══════════════════════════════════════════════════════════
  //  UPDATE DEPLOYMENTS
  // ══════════════════════════════════════════════════════════
  console.log("\n═══════════════════════════════════════");
  console.log("  Updating deployment files");
  console.log("═══════════════════════════════════════\n");

  // Update yield.json
  const yieldJsonPath = path.join(__dirname, "../deployments/creditcoin-testnet/yield.json");
  const yieldJson = JSON.parse(fs.readFileSync(yieldJsonPath, "utf8"));

  // Keep old vaults as deprecated
  yieldJson.deprecated_vaults = yieldJson.vaults;

  // Update vaults array
  yieldJson.vaults = [
    {
      address: newSPVault.address,
      strategy: newSPStrategy.address,
      want: TOKENS.sbUSD,
      wantSymbol: "sbUSD",
      name: "Stability Pool",
      description: "Liquity 청산 수익 자동 복리",
    },
    {
      address: yieldJson.deprecated_vaults[1].address, // sbUSD-Morpho (working, keep as-is)
      strategy: yieldJson.deprecated_vaults[1].strategy,
      want: TOKENS.sbUSD,
      wantSymbol: "sbUSD",
      name: "Morpho sbUSD",
      description: "SnowballLend sbUSD 공급 이자",
    },
    {
      address: newWCTCVault.address,
      strategy: newWCTCStrategy.address,
      want: TOKENS.wCTC,
      wantSymbol: "wCTC",
      name: "Morpho wCTC",
      description: "SnowballLend wCTC 공급 이자",
    },
    {
      address: yieldJson.deprecated_vaults[3].address, // USDC-Morpho (keep as-is, untested)
      strategy: yieldJson.deprecated_vaults[3].strategy,
      want: TOKENS.USDC,
      wantSymbol: "USDC",
      name: "Morpho USDC",
      description: "SnowballLend USDC 공급 이자",
    },
  ];

  // Add new Morpho market info
  yieldJson.config = yieldJson.config || {};
  yieldJson.config.wCTCMorphoMarket = {
    marketId: newMarketId,
    oracle: reversedOracle.address,
    loanToken: TOKENS.wCTC,
    collateralToken: TOKENS.sbUSD,
    lltv: "0.77",
  };

  fs.writeFileSync(yieldJsonPath, JSON.stringify(yieldJson, null, 2) + "\n");
  console.log("  yield.json updated ✓");

  // ══════════════════════════════════════════════════════════
  //  VERIFICATION
  // ══════════════════════════════════════════════════════════
  console.log("\n═══════════════════════════════════════");
  console.log("  Verification");
  console.log("═══════════════════════════════════════\n");

  const vaultAbi = loadArtifact("SnowballYieldVault").abi;

  // Verify wCTC vault
  const wctcWant = await readContract(newWCTCVault.address, vaultAbi, "want", []) as Address;
  const wctcStrat = await readContract(newWCTCVault.address, vaultAbi, "strategy", []) as Address;
  console.log(`wCTC Vault: ${newWCTCVault.address}`);
  console.log(`  want: ${wctcWant}`);
  console.log(`  strategy: ${wctcStrat}`);

  // Verify SP vault
  const spWant = await readContract(newSPVault.address, vaultAbi, "want", []) as Address;
  const spStrat = await readContract(newSPVault.address, vaultAbi, "strategy", []) as Address;
  console.log(`\nsbUSD-SP Vault: ${newSPVault.address}`);
  console.log(`  want: ${spWant}`);
  console.log(`  strategy: ${spStrat}`);

  console.log("\n=== Done! Both vaults redeployed with fixes ===");
  console.log("\nNew addresses for addresses.ts:");
  console.log(`  wCTC Morpho Vault: "${newWCTCVault.address}"`);
  console.log(`  wCTC Morpho Strategy: "${newWCTCStrategy.address}"`);
  console.log(`  sbUSD SP Vault: "${newSPVault.address}"`);
  console.log(`  sbUSD SP Strategy: "${newSPStrategy.address}"`);
}

main().catch((err) => {
  console.error("\nFatal error:", err.shortMessage || err.message || err);
  process.exit(1);
});
