/**
 * Snowball Integration -- Viem-based deploy script
 * Deploys unified oracle, adapters, interest router, and cross-protocol router
 *
 * Prerequisites:
 *   - forge build (in packages/integration)
 *   - Existing deployments: liquity.json, morpho.json
 *
 * Usage: npx tsx scripts/deploy-viem.ts
 */
import {
  createPublicClient,
  createWalletClient,
  http,
  parseEther,
  formatEther,
  keccak256,
  toBytes,
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
  blockExplorers: {
    default: { name: "Blockscout", url: "https://creditcoin-testnet.blockscout.com" },
  },
  testnet: true,
} as const;

// ─── Helpers ───
function loadArtifact(contractName: string): { abi: Abi; bytecode: `0x${string}` } {
  const p = path.join(__dirname, `../out/${contractName}.sol/${contractName}.json`);
  if (fs.existsSync(p)) {
    const artifact = JSON.parse(fs.readFileSync(p, "utf8"));
    const bytecode = artifact.bytecode?.object ?? artifact.bytecode;
    return { abi: artifact.abi, bytecode: bytecode as `0x${string}` };
  }
  throw new Error(`Foundry artifact not found: ${contractName} (run 'forge build' first)`);
}

function loadDeployment(name: string): Record<string, any> {
  const p = path.join(__dirname, `../../../deployments/creditcoin-testnet/${name}.json`);
  if (!fs.existsSync(p)) throw new Error(`Deployment not found: ${p}`);
  return JSON.parse(fs.readFileSync(p, "utf8"));
}

// ─── Setup clients ───
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
  const hash = await walletClient.deployContract({ abi, bytecode, args });
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  if (receipt.status !== "success") throw new Error(`Deploy ${name} failed`);
  const address = receipt.contractAddress!;
  console.log(`  ${name}: ${address}`);
  return { address, abi };
}

async function send(address: Address, abi: Abi, functionName: string, args: any[] = []): Promise<Hash> {
  const hash = await walletClient.writeContract({ address, abi, functionName, args, gas: 3_000_000n });
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  if (receipt.status !== "success") throw new Error(`TX ${functionName} failed`);
  return hash;
}

// ─── Main ───
async function main() {
  const balance = await publicClient.getBalance({ address: account.address });
  console.log(`Deploying with: ${account.address}`);
  console.log(`Balance: ${formatEther(balance)} tCTC\n`);

  // Load existing deployments
  const liquity = loadDeployment("liquity");
  const morpho = loadDeployment("morpho");

  const OPERATOR_ADDRESS = (process.env.OPERATOR_ADDRESS || account.address) as Address;
  const TREASURY_ADDRESS = (process.env.TREASURY_ADDRESS || account.address) as Address;

  const tokens = {
    wCTC: liquity.tokens.wCTC as Address,
    lstCTC: liquity.tokens.lstCTC as Address,
    sbUSD: liquity.tokens.sbUSD as Address,
  };

  // ==================== Phase 1: SnowballOracle ====================
  console.log("=== Phase 1: SnowballOracle ===");
  const oracle = await deploy("SnowballOracle", [account.address]);

  // Grant OPERATOR_ROLE to operator address
  const OPERATOR_ROLE = keccak256(toBytes("OPERATOR_ROLE"));
  if (OPERATOR_ADDRESS.toLowerCase() !== account.address.toLowerCase()) {
    await send(oracle.address, oracle.abi, "grantRole", [OPERATOR_ROLE, OPERATOR_ADDRESS]);
    console.log(`  Granted OPERATOR_ROLE to ${OPERATOR_ADDRESS}`);
  }

  // Set initial prices (deployer has OPERATOR_ROLE from constructor)
  const INITIAL_CTC_PRICE = parseEther("0.2"); // $0.20 per CTC
  const INITIAL_SBUSD_PRICE = parseEther("1");  // $1.00 per sbUSD

  await send(oracle.address, oracle.abi, "updatePrice", [tokens.wCTC, INITIAL_CTC_PRICE]);
  console.log("  wCTC price set: $0.20");
  await send(oracle.address, oracle.abi, "updatePrice", [tokens.lstCTC, INITIAL_CTC_PRICE]);
  console.log("  lstCTC price set: $0.20");
  await send(oracle.address, oracle.abi, "updatePrice", [tokens.sbUSD, INITIAL_SBUSD_PRICE]);
  console.log("  sbUSD price set: $1.00");

  // ==================== Phase 2: Liquity Adapters ====================
  console.log("\n=== Phase 2: Liquity Price Feed Adapters ===");
  const MAX_PRICE_AGE = 120n; // 120 seconds

  const liquityAdapterWCTC = await deploy("LiquityPriceFeedAdapter", [
    oracle.address, tokens.wCTC, MAX_PRICE_AGE,
  ]);
  const liquityAdapterLstCTC = await deploy("LiquityPriceFeedAdapter", [
    oracle.address, tokens.lstCTC, MAX_PRICE_AGE,
  ]);

  // ==================== Phase 3: Morpho Adapters ====================
  console.log("\n=== Phase 3: Morpho Oracle Adapters ===");
  const morphoAdapterWCTC = await deploy("MorphoOracleAdapter", [
    oracle.address, tokens.wCTC, MAX_PRICE_AGE,
  ]);
  const morphoAdapterLstCTC = await deploy("MorphoOracleAdapter", [
    oracle.address, tokens.lstCTC, MAX_PRICE_AGE,
  ]);
  const morphoAdapterSbUSD = await deploy("MorphoOracleAdapter", [
    oracle.address, tokens.sbUSD, MAX_PRICE_AGE,
  ]);

  // ==================== Phase 4: SnowballInterestRouter ====================
  console.log("\n=== Phase 4: SnowballInterestRouter ===");
  const MORPHO_SPLIT_BPS = 7000n;         // 70% to Morpho
  const MIN_DISTRIBUTE = parseEther("100"); // 100 sbUSD minimum

  const interestRouter = await deploy("SnowballInterestRouter", [
    tokens.sbUSD,
    morpho.core.snowballLend as Address,  // morphoTarget
    TREASURY_ADDRESS,                      // treasury
    MORPHO_SPLIT_BPS,
    MIN_DISTRIBUTE,
  ]);
  console.log("  Split: 70% Morpho / 30% Treasury");

  // ==================== Phase 5: SnowballRouter ====================
  console.log("\n=== Phase 5: SnowballRouter ===");
  const router = await deploy("SnowballRouter", []);

  // Whitelist Liquity BorrowerOperations
  await send(router.address, router.abi, "setWhitelist", [
    liquity.branches.wCTC.borrowerOperations as Address, true,
  ]);
  console.log("  Whitelisted: BorrowerOps (wCTC)");

  await send(router.address, router.abi, "setWhitelist", [
    liquity.branches.lstCTC.borrowerOperations as Address, true,
  ]);
  console.log("  Whitelisted: BorrowerOps (lstCTC)");

  // Whitelist Morpho Blue
  await send(router.address, router.abi, "setWhitelist", [
    morpho.core.snowballLend as Address, true,
  ]);
  console.log("  Whitelisted: SnowballLend (Morpho)");

  // ==================== Save Addresses ====================
  const addresses = {
    network: {
      name: "Creditcoin Testnet",
      chainId: 102031,
    },
    oracle: {
      snowballOracle: oracle.address,
      operator: OPERATOR_ADDRESS,
      liquityAdapters: {
        wCTC: liquityAdapterWCTC.address,
        lstCTC: liquityAdapterLstCTC.address,
      },
      morphoAdapters: {
        wCTC: morphoAdapterWCTC.address,
        lstCTC: morphoAdapterLstCTC.address,
        sbUSD: morphoAdapterSbUSD.address,
      },
    },
    interestRouter: {
      address: interestRouter.address,
      morphoTarget: morpho.core.snowballLend,
      treasury: TREASURY_ADDRESS,
      morphoSplitBps: 7000,
      minDistributeAmount: "100000000000000000000", // 100e18
    },
    router: {
      address: router.address,
      whitelisted: {
        borrowerOps_wCTC: liquity.branches.wCTC.borrowerOperations,
        borrowerOps_lstCTC: liquity.branches.lstCTC.borrowerOperations,
        snowballLend: morpho.core.snowballLend,
      },
    },
  };

  const outPath = path.join(__dirname, "../../../deployments/creditcoin-testnet/integration.json");
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(addresses, null, 2));

  console.log("\nIntegration deployment complete!");
  console.log(`  Saved to: ${outPath}`);
  console.log(JSON.stringify(addresses, null, 2));
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("\nDeployment failed:", err.message || err);
    process.exit(1);
  });
