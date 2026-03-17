/**
 * Deploy Uniswap V3 (Factory, SwapRouter, NPM, QuoterV2)
 * + Create & Initialize 4 pools
 *
 * Usage: npx tsx scripts/deploy-uniswap-v3.ts
 */
import {
  createPublicClient,
  createWalletClient,
  http,
  type Address,
  type Abi,
  encodeFunctionData,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import * as fs from "fs";
import * as path from "path";
import { sortTokens } from "@snowball/core";

// ─── Chain ───
const creditcoinTestnet = {
  id: 102031,
  name: "Creditcoin Testnet" as const,
  nativeCurrency: { name: "CTC", symbol: "tCTC", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://rpc.cc3-testnet.creditcoin.network" as const] },
  },
  testnet: true,
} as const;

// ─── Accounts ───
const accounts = JSON.parse(
  fs.readFileSync(path.join(__dirname, "../simulation-accounts.json"), "utf8")
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

// ─── SSOT Token addresses (from addresses.ts) ───
const TOKENS = {
  wCTC: "0xdb5c8e9d0827c474342bea03e0e35a60d621afea" as Address,
  lstCTC: "0x47ad69498520edb2e1e9464fedf5309504e26207" as Address,
  sbUSD: "0x5772f9415b75ecca00e7667e0c7d730db3b29fbd" as Address,
  USDC: "0x3e31b08651644b9e6535f5bf0c7a9e7e6ad92e02" as Address,
};

// Use wCTC as WETH9 equivalent.
// PRODUCTION NOTE: TOKENS.wCTC must be the address of a deployed WCTC contract
// (packages/shared/contracts/WCTC.sol) that implements the full IWETH9 interface
// (deposit() / withdraw()).  The current MockWCTC does NOT implement those
// functions and will cause SwapRouter.unwrapWETH9() and PeripheryPayments to
// fail at runtime.  Deploy WCTC via WCTCDeployer (packages/shared/contracts/
// WCTCDeployer.sol) and update TOKENS.wCTC before running this script against
// a production or long-lived testnet environment.
const WETH9 = TOKENS.wCTC;

// ─── Artifact loader ───
function loadArtifact(pkgPath: string, contractName: string): { abi: Abi; bytecode: `0x${string}` } {
  const p = path.join(__dirname, `../../node_modules/${pkgPath}`);
  const data = JSON.parse(fs.readFileSync(p, "utf8"));
  return { abi: data.abi, bytecode: data.bytecode as `0x${string}` };
}

// ─── Deploy helper ───
async function deploy(
  name: string,
  abi: Abi,
  bytecode: `0x${string}`,
  args: any[] = [],
  gas = 10_000_000n,
): Promise<Address> {
  console.log(`  Deploying ${name}...`);
  const hash = await walletClient.deployContract({ abi, bytecode, args, gas });
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  if (receipt.status !== "success") throw new Error(`Deploy ${name} failed`);
  console.log(`  ${name}: ${receipt.contractAddress}`);
  return receipt.contractAddress!;
}

// ─── TX helper ───
async function send(address: Address, abi: Abi, fn: string, args: any[] = []) {
  const hash = await walletClient.writeContract({
    address, abi, functionName: fn, args, gas: 5_000_000n,
  });
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  if (receipt.status !== "success") throw new Error(`TX ${fn} failed`);
  return receipt;
}

async function main() {
  console.log(`Deployer: ${account.address}`);
  const balance = await publicClient.getBalance({ address: account.address });
  console.log(`Balance: ${Number(balance) / 1e18} CTC\n`);

  // ═══ Load artifacts ═══
  const factoryArt = loadArtifact(
    "@uniswap/v3-core/artifacts/contracts/UniswapV3Factory.sol/UniswapV3Factory.json",
    "UniswapV3Factory",
  );
  const routerArt = loadArtifact(
    "@uniswap/v3-periphery/artifacts/contracts/SwapRouter.sol/SwapRouter.json",
    "SwapRouter",
  );
  const npmArt = loadArtifact(
    "@uniswap/v3-periphery/artifacts/contracts/NonfungiblePositionManager.sol/NonfungiblePositionManager.json",
    "NonfungiblePositionManager",
  );
  const quoterArt = loadArtifact(
    "@uniswap/v3-periphery/artifacts/contracts/lens/QuoterV2.sol/QuoterV2.json",
    "QuoterV2",
  );

  // ═══ PHASE 1: Deploy Core ═══
  console.log("═══ Phase 1: Deploy Uniswap V3 Core ═══");
  const factory = await deploy("UniswapV3Factory", factoryArt.abi, factoryArt.bytecode);

  // Enable fee tiers
  console.log("  Enabling fee tiers...");
  await send(factory, factoryArt.abi, "enableFeeAmount", [100, 1]);     // 0.01% - tick spacing 1
  // 500/10 and 3000/60 and 10000/200 are enabled by default in UniswapV3Factory constructor
  console.log("  Fee tier 100 (0.01%) enabled");

  // ═══ PHASE 2: Deploy Periphery ═══
  console.log("\n═══ Phase 2: Deploy Periphery ═══");
  const swapRouter = await deploy(
    "SwapRouter", routerArt.abi, routerArt.bytecode,
    [factory, WETH9],
  );

  // NonfungiblePositionManager needs: factory, WETH9, tokenDescriptor
  // We pass zero address for tokenDescriptor (not needed for functionality)
  const ZERO = "0x0000000000000000000000000000000000000000" as Address;
  const npm = await deploy(
    "NonfungiblePositionManager", npmArt.abi, npmArt.bytecode,
    [factory, WETH9, ZERO],
  );

  const quoterV2 = await deploy(
    "QuoterV2", quoterArt.abi, quoterArt.bytecode,
    [factory, WETH9],
  );

  // ═══ PHASE 3: Create & Initialize Pools ═══
  console.log("\n═══ Phase 3: Create & Initialize Pools ═══");

  // Pool configs: [name, tokenA, tokenB, fee, sqrtPriceX96]
  // sqrtPriceX96 = sqrt(price) * 2^96 where price = token1/token0
  // token0 < token1 (sorted by address)
  const Q96 = 2n ** 96n;

  // Helper: compute sqrtPriceX96 from price ratio (integer math approximation)
  function sqrtPriceX96(priceNum: bigint, priceDen: bigint): bigint {
    // sqrt(num/den) * 2^96 = sqrt(num * 2^192 / den)
    const scaled = (priceNum * (2n ** 192n)) / priceDen;
    return sqrt(scaled);
  }

  function sqrt(x: bigint): bigint {
    if (x === 0n) return 0n;
    let z = x;
    let y = (z + 1n) / 2n;
    while (y < z) {
      z = y;
      y = (z + x / z) / 2n;
    }
    return z;
  }

  const pools = [
    {
      name: "wCTC/USDC",
      tokenA: TOKENS.wCTC,
      tokenB: TOKENS.USDC,
      fee: 3000,
      // wCTC=$2.50, USDC=$1.00
      priceAinB: [250n, 100n] as [bigint, bigint], // 1 wCTC = 2.50 USDC
    },
    {
      name: "wCTC/sbUSD",
      tokenA: TOKENS.wCTC,
      tokenB: TOKENS.sbUSD,
      fee: 3000,
      // wCTC=$2.50, sbUSD=$1.00
      priceAinB: [250n, 100n] as [bigint, bigint],
    },
    {
      name: "sbUSD/USDC",
      tokenA: TOKENS.sbUSD,
      tokenB: TOKENS.USDC,
      fee: 500,
      // Both $1.00
      priceAinB: [100n, 100n] as [bigint, bigint],
    },
    {
      name: "lstCTC/wCTC",
      tokenA: TOKENS.lstCTC,
      tokenB: TOKENS.wCTC,
      fee: 3000,
      // lstCTC=$2.60, wCTC=$2.50 → 1 lstCTC = 1.04 wCTC
      priceAinB: [104n, 100n] as [bigint, bigint],
    },
  ];

  for (const pool of pools) {
    console.log(`\n  Creating ${pool.name} (fee=${pool.fee})...`);

    const [token0, token1] = sortTokens(pool.tokenA, pool.tokenB);
    const aIsToken0 = pool.tokenA.toLowerCase() === token0.toLowerCase();

    // price in pool terms = token1/token0
    // If A is token0: price = B_per_A = priceAinB[0]/priceAinB[1] → but we need token1/token0
    //   token1 = B, token0 = A → price = priceAinB (B per A)
    // If A is token1: price = token1/token0 = A_per_B = priceAinB[1]/priceAinB[0]
    let priceNum: bigint, priceDen: bigint;
    if (aIsToken0) {
      // token0=A, token1=B → price = B per A = priceAinB
      priceNum = pool.priceAinB[0];
      priceDen = pool.priceAinB[1];
    } else {
      // token0=B, token1=A → price = A per B = 1/priceAinB
      priceNum = pool.priceAinB[1];
      priceDen = pool.priceAinB[0];
    }

    const sqrtPrice = sqrtPriceX96(priceNum, priceDen);
    console.log(`  token0=${token0}`);
    console.log(`  token1=${token1}`);
    console.log(`  sqrtPriceX96=${sqrtPrice}`);

    // createAndInitializePoolIfNecessary on NPM
    await send(npm, npmArt.abi, "createAndInitializePoolIfNecessary", [
      token0, token1, pool.fee, sqrtPrice,
    ]);
    console.log(`  ${pool.name} created & initialized`);

    // Verify
    const poolAddr = await publicClient.readContract({
      address: factory,
      abi: factoryArt.abi,
      functionName: "getPool",
      args: [token0, token1, pool.fee],
    }) as Address;
    console.log(`  Pool address: ${poolAddr}`);

    // Read pool state
    const slot0 = await publicClient.readContract({
      address: poolAddr,
      abi: [{ type: "function", name: "slot0", inputs: [], outputs: [
        { name: "sqrtPriceX96", type: "uint160" },
        { name: "tick", type: "int24" },
        { name: "observationIndex", type: "uint16" },
        { name: "observationCardinality", type: "uint16" },
        { name: "observationCardinalityNext", type: "uint16" },
        { name: "feeProtocol", type: "uint8" },
        { name: "unlocked", type: "bool" },
      ], stateMutability: "view" }],
      functionName: "slot0",
    }) as any;
    console.log(`  sqrtPriceX96=${slot0[0]}, tick=${slot0[1]}`);

    const tickSpacing = await publicClient.readContract({
      address: poolAddr,
      abi: [{ type: "function", name: "tickSpacing", inputs: [], outputs: [{ type: "int24" }], stateMutability: "view" }],
      functionName: "tickSpacing",
    });
    console.log(`  tickSpacing=${tickSpacing}`);
  }

  // ═══ PHASE 4: Save deployment ═══
  console.log("\n═══ Phase 4: Save Deployment ═══");

  // Read back all pool addresses
  const poolAddresses: Record<string, Address> = {};
  for (const pool of pools) {
    const [token0, token1] = sortTokens(pool.tokenA, pool.tokenB);
    const addr = await publicClient.readContract({
      address: factory,
      abi: factoryArt.abi,
      functionName: "getPool",
      args: [token0, token1, pool.fee],
    }) as Address;
    poolAddresses[pool.name] = addr;
  }

  const deployment = {
    network: { name: "Creditcoin Testnet", chainId: 102031 },
    core: {
      factory,
      swapRouter,
      nonfungiblePositionManager: npm,
      quoterV2,
    },
    pools: poolAddresses,
    tokens: TOKENS,
  };

  const deployDir = path.join(__dirname, "../../deployments/creditcoin-testnet");
  fs.mkdirSync(deployDir, { recursive: true });
  fs.writeFileSync(
    path.join(deployDir, "uniswap-v3.json"),
    JSON.stringify(deployment, null, 2) + "\n",
  );

  console.log("\n════════════════════════════════════════════");
  console.log("  UNISWAP V3 DEPLOYMENT COMPLETE");
  console.log("════════════════════════════════════════════");
  console.log(`  Factory:    ${factory}`);
  console.log(`  SwapRouter: ${swapRouter}`);
  console.log(`  NPM:        ${npm}`);
  console.log(`  QuoterV2:   ${quoterV2}`);
  console.log(`  Pools:`);
  for (const [name, addr] of Object.entries(poolAddresses)) {
    console.log(`    ${name}: ${addr}`);
  }
  console.log(`\n  Update addresses.ts with these values!`);
}

main().catch((err) => {
  console.error("\nDEPLOYMENT FAILED:", err);
  process.exit(1);
});
