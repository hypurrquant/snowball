/**
 * SnowballStaker + Multicall3 배포 스크립트
 *
 * 1. Multicall3 — 범용 배치 호출 컨트랙트
 * 2. SnowballStaker — UniswapV3Staker fork (LP fee collection 지원)
 *
 * Usage: NODE_PATH=packages/integration/node_modules npx tsx scripts/deploy/deploy-staker-multicall.ts
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
import { defineChain } from "viem";
import * as fs from "fs";
import * as path from "path";

// ─── .env 로드 ───
function loadEnv(): Record<string, string> {
  const envPath = path.join(__dirname, "../../.env");
  if (!fs.existsSync(envPath)) throw new Error(`.env not found at ${envPath}`);
  const env: Record<string, string> = {};
  for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const idx = trimmed.indexOf("=");
    if (idx === -1) continue;
    env[trimmed.slice(0, idx)] = trimmed.slice(idx + 1);
  }
  return env;
}
const env = loadEnv();

// ─── Chain ───
const cc3 = defineChain({
  id: 102031,
  name: "CC3 Testnet",
  nativeCurrency: { name: "CTC", symbol: "tCTC", decimals: 18 },
  rpcUrls: { default: { http: ["https://rpc.cc3-testnet.creditcoin.network"] } },
});

// ─── Accounts ───
const DEPLOYER_KEY = env.DEPLOYER_PRIVATE_KEY;
if (!DEPLOYER_KEY) throw new Error("DEPLOYER_PRIVATE_KEY not set in .env");
const account = privateKeyToAccount(DEPLOYER_KEY as `0x${string}`);
const transport = http("https://rpc.cc3-testnet.creditcoin.network");
const pub = createPublicClient({ chain: cc3, transport });
const wallet = createWalletClient({ account, chain: cc3, transport });

// ─── Existing addresses ───
const DEX = {
  factory: "0x09616b503326dc860b3c3465525b39fe4fcdd049" as Address,
  nonfungiblePositionManager: "0xa28bfaa2e84098de8d654f690e51c265e4ae01c9" as Address,
};

// ─── Artifact loaders ───
function loadStakerArtifact(contractName: string): { abi: Abi; bytecode: `0x${string}` } {
  const p = path.join(__dirname, `../../packages/staker/out/${contractName}.sol/${contractName}.json`);
  if (!fs.existsSync(p)) throw new Error(`Artifact not found: ${p}`);
  const a = JSON.parse(fs.readFileSync(p, "utf8"));
  return { abi: a.abi, bytecode: (a.bytecode?.object ?? a.bytecode) as `0x${string}` };
}

// ─── Main ───
async function main() {
  const bal = await pub.getBalance({ address: account.address });
  console.log(`Deployer: ${account.address}`);
  console.log(`Balance:  ${formatEther(bal)} CTC\n`);

  // ═══════════════════════════════════════════════════════
  // 1. Multicall3
  // ═══════════════════════════════════════════════════════
  console.log("=== 1. Multicall3 ===");

  const mc3BytecodePath = path.join(__dirname, "../../deployments/creditcoin-testnet/multicall3-creation-bytecode.txt");
  const mc3ArtifactPath = path.join(__dirname, "../../deployments/creditcoin-testnet/multicall3-artifact.json");

  let mc3Address: Address;
  let mc3Abi: Abi;

  if (fs.existsSync(mc3BytecodePath)) {
    // Deploy from canonical creation bytecode
    const creationBytecode = fs.readFileSync(mc3BytecodePath, "utf8").trim() as `0x${string}`;
    mc3Abi = fs.existsSync(mc3ArtifactPath)
      ? JSON.parse(fs.readFileSync(mc3ArtifactPath, "utf8")).abi
      : [];

    const hash = await wallet.sendTransaction({
      data: creationBytecode,
      gas: 2_000_000n,
    });
    const rx = await pub.waitForTransactionReceipt({ hash });
    if (rx.status !== "success") throw new Error("Multicall3 deploy reverted");
    mc3Address = rx.contractAddress!;
    console.log(`  Multicall3: ${mc3Address}`);
  } else {
    throw new Error("Multicall3 creation bytecode not found. Run agent to fetch it first.");
  }

  // ═══════════════════════════════════════════════════════
  // 2. SnowballStaker
  // ═══════════════════════════════════════════════════════
  console.log("\n=== 2. SnowballStaker ===");

  const { abi: stakerAbi, bytecode: stakerBytecode } = loadStakerArtifact("SnowballStaker");

  const maxIncentiveStartLeadTime = 2592000n; // 30 days
  const maxIncentiveDuration = 63072000n;      // ~2 years (730 days)

  const stakerHash = await wallet.deployContract({
    abi: stakerAbi,
    bytecode: stakerBytecode,
    args: [
      DEX.factory,
      DEX.nonfungiblePositionManager,
      maxIncentiveStartLeadTime,
      maxIncentiveDuration,
    ],
    gas: 5_000_000n,
  });
  const stakerRx = await pub.waitForTransactionReceipt({ hash: stakerHash });
  if (stakerRx.status !== "success") throw new Error("SnowballStaker deploy reverted");
  console.log(`  SnowballStaker: ${stakerRx.contractAddress}`);

  // ═══════════════════════════════════════════════════════
  // 3. Verify
  // ═══════════════════════════════════════════════════════
  console.log("\n=== 3. Verify ===");

  const stakerAddr = stakerRx.contractAddress!;

  // Read back immutables
  const factoryResult = await pub.readContract({
    address: stakerAddr,
    abi: stakerAbi,
    functionName: "factory",
  });
  console.log(`  factory: ${factoryResult} ${factoryResult === DEX.factory ? "OK" : "MISMATCH"}`);

  const npmResult = await pub.readContract({
    address: stakerAddr,
    abi: stakerAbi,
    functionName: "nonfungiblePositionManager",
  });
  console.log(`  npm: ${npmResult} ${npmResult === DEX.nonfungiblePositionManager ? "OK" : "MISMATCH"}`);

  const maxLeadResult = await pub.readContract({
    address: stakerAddr,
    abi: stakerAbi,
    functionName: "maxIncentiveStartLeadTime",
  });
  console.log(`  maxIncentiveStartLeadTime: ${maxLeadResult} (${Number(maxLeadResult) / 86400} days)`);

  const maxDurResult = await pub.readContract({
    address: stakerAddr,
    abi: stakerAbi,
    functionName: "maxIncentiveDuration",
  });
  console.log(`  maxIncentiveDuration: ${maxDurResult} (${Number(maxDurResult) / 86400} days)`);

  // ═══════════════════════════════════════════════════════
  // Summary
  // ═══════════════════════════════════════════════════════
  console.log("\n═══════════════════════════════════════════");
  console.log("  STAKER + MULTICALL3 DEPLOYMENT COMPLETE");
  console.log("═══════════════════════════════════════════\n");

  const result = {
    multicall3: mc3Address,
    snowballStaker: stakerAddr,
    config: {
      factory: DEX.factory,
      nonfungiblePositionManager: DEX.nonfungiblePositionManager,
      maxIncentiveStartLeadTime: maxIncentiveStartLeadTime.toString(),
      maxIncentiveDuration: maxIncentiveDuration.toString(),
    },
  };

  console.log(JSON.stringify(result, null, 2));

  // Save
  const outPath = path.join(__dirname, "../../deployments/creditcoin-testnet/staker-multicall.json");
  fs.writeFileSync(outPath, JSON.stringify(result, null, 2));
  console.log(`\nSaved to: ${outPath}`);
}

main().then(() => process.exit(0)).catch((e) => {
  console.error("\nFAILED:", e.message || e);
  process.exit(1);
});
