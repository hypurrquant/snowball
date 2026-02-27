/**
 * Fix DEX Pools — Create pools with REAL tokens on existing Algebra Factory
 *
 * Problem: The original deploy created pools with mock tokens instead of real ones.
 * This script creates new pools using the actual protocol tokens.
 *
 * Usage: cd packages/algebra && npx tsx ../../scripts/fix-dex-pools.ts
 */
import {
  createPublicClient,
  createWalletClient,
  http,
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

// ─── Real token addresses ───
const REAL_TOKENS = {
  sbUSD: "0x5772f9415b75ecca00e7667e0c7d730db3b29fbd" as Address,
  wCTC: "0x8f7f60a0f615d828eafcbbf6121f73efcfb56969" as Address,
  lstCTC: "0x72968ff9203dc5f352c5e42477b84d11c8c8f153" as Address,
  USDC: "0xbcaa46ef7a399fcdb64adf4520cdcc6d62fcaaed" as Address,
};

// ─── Deployed DEX core addresses ───
const DEX_CORE = {
  factory: "0xd478a63345d7cd17881a540e15943919604691f6" as Address,
  dynamicFeePlugin: "0x5b0901f4c205fa4a92bbc3fecaef9b0b72ef4246" as Address,
};

// sqrtPriceX96 for 1:1 price ratio = 2^96
const SQRT_PRICE_1_1 = BigInt("79228162514264337593543950336");

function loadArtifact(contractName: string): { abi: Abi; bytecode: `0x${string}` } {
  const p = path.join(__dirname, `../packages/algebra/out/${contractName}.sol/${contractName}.json`);
  if (!fs.existsSync(p)) {
    throw new Error(`Artifact not found: ${p}`);
  }
  const data = JSON.parse(fs.readFileSync(p, "utf8"));
  return { abi: data.abi, bytecode: data.bytecode.object as `0x${string}` };
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

async function main() {
  console.log("=== Fix DEX Pools: Create pools with REAL tokens ===\n");
  console.log(`Deployer: ${account.address}`);
  const balance = await publicClient.getBalance({ address: account.address });
  console.log(`Balance: ${Number(balance) / 1e18} CTC\n`);

  const factoryAbi = loadArtifact("SnowballFactory").abi;
  const poolAbi = loadArtifact("SnowballPool").abi;
  const feePluginAbi = loadArtifact("DynamicFeePlugin").abi;
  const emptyData = "0x" as `0x${string}`;

  // Define pool pairs
  const pools = [
    { name: "sbUSD/USDC", token0: REAL_TOKENS.sbUSD, token1: REAL_TOKENS.USDC, minFee: 100, maxFee: 1000, window: 3600 },
    { name: "wCTC/sbUSD", token0: REAL_TOKENS.wCTC, token1: REAL_TOKENS.sbUSD, minFee: 500, maxFee: 10000, window: 1800 },
    { name: "wCTC/USDC", token0: REAL_TOKENS.wCTC, token1: REAL_TOKENS.USDC, minFee: 500, maxFee: 10000, window: 1800 },
    { name: "lstCTC/wCTC", token0: REAL_TOKENS.lstCTC, token1: REAL_TOKENS.wCTC, minFee: 100, maxFee: 1000, window: 3600 },
  ];

  const poolAddresses: Record<string, Address> = {};

  // Step 1: Create pools
  console.log("── Step 1: Create Pools ──");
  for (const pool of pools) {
    console.log(`\nCreating ${pool.name}...`);

    // Check if pool already exists
    const [t0, t1] = pool.token0.toLowerCase() < pool.token1.toLowerCase()
      ? [pool.token0, pool.token1] : [pool.token1, pool.token0];

    const existing = await readContract(DEX_CORE.factory, factoryAbi, "poolByPair", [t0, t1]) as Address;
    if (existing !== "0x0000000000000000000000000000000000000000") {
      console.log(`  Pool already exists: ${existing}`);
      poolAddresses[pool.name] = existing;
      continue;
    }

    await send(DEX_CORE.factory, factoryAbi, "createPool", [pool.token0, pool.token1, emptyData]);
    const poolAddr = await readContract(DEX_CORE.factory, factoryAbi, "poolByPair", [t0, t1]) as Address;
    console.log(`  Pool created: ${poolAddr}`);
    poolAddresses[pool.name] = poolAddr;
  }

  // Step 2: Initialize pools
  console.log("\n── Step 2: Initialize Pools ──");
  for (const pool of pools) {
    const poolAddr = poolAddresses[pool.name];
    console.log(`\nInitializing ${pool.name} (${poolAddr})...`);

    // Check if already initialized by reading sqrtPriceX96 from globalState
    try {
      const globalState = await readContract(poolAddr, poolAbi, "globalState", []) as any;
      if (globalState[0] !== 0n && globalState[0] !== BigInt(0)) {
        console.log(`  Already initialized (sqrtPriceX96: ${globalState[0]})`);
        continue;
      }
    } catch (e) {
      // globalState might not be readable before init in some implementations
    }

    await send(poolAddr, poolAbi, "initialize", [SQRT_PRICE_1_1]);
    console.log(`  ${pool.name} initialized ✓`);
  }

  // Step 3: Register pools with DynamicFeePlugin
  console.log("\n── Step 3: Register with DynamicFeePlugin ──");
  for (const pool of pools) {
    const poolAddr = poolAddresses[pool.name];
    console.log(`Registering ${pool.name} (minFee=${pool.minFee}, maxFee=${pool.maxFee}, window=${pool.window})...`);
    try {
      await send(DEX_CORE.dynamicFeePlugin, feePluginAbi, "registerPool", [poolAddr, pool.minFee, pool.maxFee, pool.window]);
      console.log(`  ${pool.name} registered ✓`);
    } catch (e: any) {
      console.log(`  ${pool.name} registration skipped (may already be registered): ${e.shortMessage || e.message}`);
    }
  }

  // Step 4: Update algebra.json
  console.log("\n── Step 4: Update algebra.json ──");
  const algebraJsonPath = path.join(__dirname, "../deployments/creditcoin-testnet/algebra.json");
  const algebraJson = JSON.parse(fs.readFileSync(algebraJsonPath, "utf8"));

  // Keep old mock pools under a different key for reference
  algebraJson.mockPools = { ...algebraJson.pools };
  algebraJson.mockTokens_deprecated = { ...algebraJson.mockTokens };

  // Update pools with real token pools
  algebraJson.pools = {
    sbUSD_USDC: poolAddresses["sbUSD/USDC"],
    wCTC_sbUSD: poolAddresses["wCTC/sbUSD"],
    wCTC_USDC: poolAddresses["wCTC/USDC"],
    lstCTC_wCTC: poolAddresses["lstCTC/wCTC"],
  };

  // Add real token references
  algebraJson.realTokens = {
    sbUSD: REAL_TOKENS.sbUSD,
    wCTC: REAL_TOKENS.wCTC,
    lstCTC: REAL_TOKENS.lstCTC,
    USDC: REAL_TOKENS.USDC,
  };

  fs.writeFileSync(algebraJsonPath, JSON.stringify(algebraJson, null, 2) + "\n");
  console.log("  algebra.json updated ✓");

  // Step 5: Verify
  console.log("\n── Step 5: Verification ──");
  for (const pool of pools) {
    const poolAddr = poolAddresses[pool.name];
    const token0 = await readContract(poolAddr, poolAbi, "token0", []) as Address;
    const token1 = await readContract(poolAddr, poolAbi, "token1", []) as Address;
    const globalState = await readContract(poolAddr, poolAbi, "globalState", []) as any;
    console.log(`${pool.name}:`);
    console.log(`  address: ${poolAddr}`);
    console.log(`  token0: ${token0}`);
    console.log(`  token1: ${token1}`);
    console.log(`  sqrtPriceX96: ${globalState[0]}`);
  }

  console.log("\n=== Done! Real-token pools created and registered ===");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
