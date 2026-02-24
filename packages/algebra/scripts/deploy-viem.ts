/**
 * Snowball DEX — Viem-based deploy script
 * Deploys Algebra V4 fork (full) on Creditcoin Testnet
 *
 * IMPORTANT: Mainnet deployment requires Algebra Labs license (algebra.finance/form)
 *
 * Usage: npx tsx scripts/deploy-viem.ts
 */
import {
  createPublicClient,
  createWalletClient,
  http,
  parseEther,
  formatEther,
  getContractAddress,
  encodePacked,
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

dotenv.config({ path: path.join(__dirname, "../../.env") });
dotenv.config({ path: path.join(__dirname, "../../../.env") });

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

function loadArtifact(contractName: string): { abi: Abi; bytecode: `0x${string}` } {
  // Try multiple possible paths for artifact discovery
  const candidates = [
    path.join(__dirname, `../out/${contractName}.sol/${contractName}.json`),
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) {
      const artifact = JSON.parse(fs.readFileSync(p, "utf8"));
      const bytecode = artifact.bytecode?.object ?? artifact.bytecode;
      return { abi: artifact.abi, bytecode: bytecode as `0x${string}` };
    }
  }
  throw new Error(`Foundry artifact not found: ${contractName} (run 'forge build' first)`);
}

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

async function deploy(name: string, args: any[] = []): Promise<{ address: Address; abi: Abi }> {
  const { abi, bytecode } = loadArtifact(name);
  console.log(`  Deploying ${name} (bytecode: ${bytecode.length / 2} bytes, args: ${args.length})...`);
  try {
    const hash = await walletClient.deployContract({ abi, bytecode, args, gas: 15_000_000n });
    console.log(`  TX: ${hash}`);
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    if (receipt.status !== "success") throw new Error(`Deploy ${name} reverted (status: ${receipt.status})`);
    const address = receipt.contractAddress!;
    console.log(`  ${name}: ${address} (gas used: ${receipt.gasUsed})`);
    return { address, abi };
  } catch (err: any) {
    console.error(`  Deploy ${name} error:`, err.shortMessage || err.message || err);
    throw err;
  }
}

async function send(address: Address, abi: Abi, functionName: string, args: any[] = []) {
  const hash = await walletClient.writeContract({
    address, abi, functionName, args, gas: 5_000_000n,
  });
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  if (receipt.status !== "success") throw new Error(`TX ${functionName} failed`);
  return hash;
}

async function readContract(address: Address, abi: Abi, functionName: string, args: any[] = []) {
  return publicClient.readContract({ address, abi, functionName, args });
}

// Encoding sqrt price for 1:1 ratio: sqrt(1) * 2^96
const SQRT_PRICE_1_1 = BigInt("79228162514264337593543950336"); // 2^96

async function main() {
  const balance = await publicClient.getBalance({ address: account.address });
  console.log(`Deploying Snowball DEX with: ${account.address}`);
  console.log(`Balance: ${formatEther(balance)} tCTC\n`);

  // ─── Phase 0: Pre-compute addresses for circular dependency ───
  // Factory needs poolDeployer address in constructor, poolDeployer needs factory address.
  // We predict the poolDeployer address (deployed at nonce+1) so Factory can be deployed first.
  console.log("=== Phase 0: Pre-compute addresses ===");

  // Use pending nonce to be safe
  const currentNonce = await publicClient.getTransactionCount({
    address: account.address,
    blockTag: "pending",
  });
  console.log(`  Current nonce (pending): ${currentNonce}`);

  // nonce+0 = Factory, nonce+1 = PoolDeployer
  const predictedFactoryAddr = getContractAddress({
    from: account.address,
    nonce: BigInt(currentNonce),
  });
  const predictedPoolDeployerAddr = getContractAddress({
    from: account.address,
    nonce: BigInt(currentNonce + 1),
  });
  console.log(`  Predicted SnowballFactory:       ${predictedFactoryAddr}`);
  console.log(`  Predicted SnowballPoolDeployer:   ${predictedPoolDeployerAddr}`);

  // ─── Phase 1: SnowballFactory ───
  console.log("\n=== Phase 1: SnowballFactory ===");
  const factory = await deploy("SnowballFactory", [predictedPoolDeployerAddr]);
  if (factory.address.toLowerCase() !== predictedFactoryAddr.toLowerCase()) {
    console.warn(`  WARNING: Factory address mismatch! Got ${factory.address}, expected ${predictedFactoryAddr}`);
    console.warn("  Continuing anyway — will recompute PoolDeployer prediction...");
    // Recompute based on actual next nonce
    const newNonce = await publicClient.getTransactionCount({ address: account.address, blockTag: "pending" });
    const correctedPoolDeployerAddr = getContractAddress({ from: account.address, nonce: BigInt(newNonce) });
    console.log(`  Corrected PoolDeployer prediction: ${correctedPoolDeployerAddr}`);
  }

  // ─── Phase 2: SnowballPoolDeployer ───
  console.log("\n=== Phase 2: SnowballPoolDeployer ===");
  const poolDeployer = await deploy("SnowballPoolDeployer", [factory.address]);

  // Verify: factory.poolDeployer() should match
  const registeredDeployer = await readContract(factory.address, factory.abi, "poolDeployer");
  if ((registeredDeployer as string).toLowerCase() !== poolDeployer.address.toLowerCase()) {
    throw new Error(`Factory.poolDeployer() mismatch! Factory expects ${registeredDeployer}, actual deployer is ${poolDeployer.address}. Redeploy needed.`);
  }
  console.log("  Factory.poolDeployer() matches ✓");

  // ─── Phase 3: SnowballCommunityVault + VaultFactoryStub ───
  console.log("\n=== Phase 3: CommunityVault ===");
  const communityVault = await deploy("SnowballCommunityVault", [factory.address, account.address]);
  const vaultFactoryStub = await deploy("SnowballVaultFactoryStub", [communityVault.address]);
  await send(factory.address, factory.abi, "setVaultFactory", [vaultFactoryStub.address]);
  console.log("  VaultFactoryStub set on Factory ✓");

  // ─── Phase 4: DynamicFeePlugin (PluginFactory) ───
  console.log("\n=== Phase 4: DynamicFeePlugin ===");
  const dynamicFee = await deploy("DynamicFeePlugin", [factory.address]);
  await send(factory.address, factory.abi, "setDefaultPluginFactory", [dynamicFee.address]);
  console.log("  DynamicFeePlugin set as default plugin factory ✓");

  // ─── Phase 5: Router ───
  console.log("\n=== Phase 5: SnowballRouter ===");
  const WCTC_ADDR = "0x8f7f60a0f615d828eafcbbf6121f73efcfb56969" as Address;
  const router = await deploy("SnowballRouter", [factory.address, WCTC_ADDR, poolDeployer.address]);

  // ─── Phase 6: NonfungiblePositionManager ───
  console.log("\n=== Phase 6: NonfungiblePositionManager ===");
  // Deploy a minimal token descriptor first
  const tokenDescriptor = await deploy("NonfungibleTokenPositionDescriptor");
  const nftManager = await deploy("NonfungiblePositionManager", [
    factory.address,
    WCTC_ADDR,
    tokenDescriptor.address,
    poolDeployer.address,
  ]);

  // ─── Phase 7: QuoterV2 ───
  console.log("\n=== Phase 7: QuoterV2 ===");
  const quoter = await deploy("QuoterV2", [factory.address, WCTC_ADDR, poolDeployer.address]);

  // ─── Phase 8: Mock Tokens (testnet) ───
  console.log("\n=== Phase 8: Mock Tokens ===");
  const mockSbUSD = await deploy("MockERC20", ["Snowball USD", "sbUSD", 18]);
  const mockWCTC = await deploy("MockERC20", ["Wrapped CTC", "wCTC", 18]);
  const mockLstCTC = await deploy("MockERC20", ["Liquid Staked CTC", "lstCTC", 18]);
  const mockUSDC = await deploy("MockERC20", ["USD Coin", "USDC", 6]);

  // ─── Phase 9: Create Pools ───
  console.log("\n=== Phase 9: Create Initial Pools ===");
  const emptyData = "0x" as `0x${string}`;

  // sbUSD/USDC
  await send(factory.address, factory.abi, "createPool", [mockSbUSD.address, mockUSDC.address, emptyData]);
  const [t0_1, t1_1] = mockSbUSD.address.toLowerCase() < mockUSDC.address.toLowerCase()
    ? [mockSbUSD.address, mockUSDC.address] : [mockUSDC.address, mockSbUSD.address];
  const sbUSD_USDC = await readContract(factory.address, factory.abi, "poolByPair", [t0_1, t1_1]) as Address;
  console.log(`  sbUSD/USDC pool: ${sbUSD_USDC}`);

  // wCTC/sbUSD
  await send(factory.address, factory.abi, "createPool", [mockWCTC.address, mockSbUSD.address, emptyData]);
  const [t0_2, t1_2] = mockWCTC.address.toLowerCase() < mockSbUSD.address.toLowerCase()
    ? [mockWCTC.address, mockSbUSD.address] : [mockSbUSD.address, mockWCTC.address];
  const wCTC_sbUSD = await readContract(factory.address, factory.abi, "poolByPair", [t0_2, t1_2]) as Address;
  console.log(`  wCTC/sbUSD pool: ${wCTC_sbUSD}`);

  // wCTC/USDC
  await send(factory.address, factory.abi, "createPool", [mockWCTC.address, mockUSDC.address, emptyData]);
  const [t0_3, t1_3] = mockWCTC.address.toLowerCase() < mockUSDC.address.toLowerCase()
    ? [mockWCTC.address, mockUSDC.address] : [mockUSDC.address, mockWCTC.address];
  const wCTC_USDC = await readContract(factory.address, factory.abi, "poolByPair", [t0_3, t1_3]) as Address;
  console.log(`  wCTC/USDC pool: ${wCTC_USDC}`);

  // lstCTC/wCTC
  await send(factory.address, factory.abi, "createPool", [mockLstCTC.address, mockWCTC.address, emptyData]);
  const [t0_4, t1_4] = mockLstCTC.address.toLowerCase() < mockWCTC.address.toLowerCase()
    ? [mockLstCTC.address, mockWCTC.address] : [mockWCTC.address, mockLstCTC.address];
  const lstCTC_wCTC = await readContract(factory.address, factory.abi, "poolByPair", [t0_4, t1_4]) as Address;
  console.log(`  lstCTC/wCTC pool: ${lstCTC_wCTC}`);

  // ─── Phase 10: Initialize Pools ───
  console.log("\n=== Phase 10: Initialize Pools ===");
  const poolAbi = loadArtifact("SnowballPool").abi;

  // Initialize all pools at 1:1 price ratio
  await send(sbUSD_USDC, poolAbi, "initialize", [SQRT_PRICE_1_1]);
  console.log("  sbUSD/USDC initialized ✓");
  await send(wCTC_sbUSD, poolAbi, "initialize", [SQRT_PRICE_1_1]);
  console.log("  wCTC/sbUSD initialized ✓");
  await send(wCTC_USDC, poolAbi, "initialize", [SQRT_PRICE_1_1]);
  console.log("  wCTC/USDC initialized ✓");
  await send(lstCTC_wCTC, poolAbi, "initialize", [SQRT_PRICE_1_1]);
  console.log("  lstCTC/wCTC initialized ✓");

  // ─── Phase 11: Register pools with DynamicFeePlugin ───
  console.log("\n=== Phase 11: Register Pools with DynamicFeePlugin ===");
  // sbUSD/USDC: minFee=100 (0.01%), maxFee=1000 (0.1%), window=3600s
  await send(dynamicFee.address, dynamicFee.abi, "registerPool", [sbUSD_USDC, 100, 1000, 3600]);
  // wCTC/sbUSD: minFee=500 (0.05%), maxFee=10000 (1%), window=1800s
  await send(dynamicFee.address, dynamicFee.abi, "registerPool", [wCTC_sbUSD, 500, 10000, 1800]);
  // wCTC/USDC: minFee=500, maxFee=10000, window=1800s
  await send(dynamicFee.address, dynamicFee.abi, "registerPool", [wCTC_USDC, 500, 10000, 1800]);
  // lstCTC/wCTC: minFee=100, maxFee=1000, window=3600s
  await send(dynamicFee.address, dynamicFee.abi, "registerPool", [lstCTC_wCTC, 100, 1000, 3600]);
  console.log("  All pools registered with DynamicFeePlugin ✓");

  // ─── Phase 12: Save Addresses ───
  const addresses = {
    network: { name: "Creditcoin Testnet", chainId: 102031 },
    core: {
      snowballFactory: factory.address,
      snowballPoolDeployer: poolDeployer.address,
      snowballCommunityVault: communityVault.address,
      snowballVaultFactoryStub: vaultFactoryStub.address,
      snowballRouter: router.address,
      dynamicFeePlugin: dynamicFee.address,
      nonfungiblePositionManager: nftManager.address,
      nonfungibleTokenPositionDescriptor: tokenDescriptor.address,
      quoterV2: quoter.address,
    },
    mockTokens: {
      sbUSD: mockSbUSD.address,
      wCTC: mockWCTC.address,
      lstCTC: mockLstCTC.address,
      USDC: mockUSDC.address,
    },
    pools: {
      sbUSD_USDC,
      wCTC_sbUSD,
      wCTC_USDC,
      lstCTC_wCTC,
    },
  };

  const outPath = path.join(__dirname, "../../../deployments/creditcoin-testnet/algebra.json");
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(addresses, null, 2));

  console.log("\n=== Snowball DEX deployment complete! ===");
  console.log(`  Saved to: ${outPath}`);
  console.log(JSON.stringify(addresses, null, 2));
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("\n Deployment failed:", err.message || err);
    process.exit(1);
  });
