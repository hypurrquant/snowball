/**
 * Deploy DN Crosschain Bridge contracts to 3 chains:
 * 1. DN Token v2 → Sepolia (auto)
 * 2. BridgeVault → CC Testnet (auto)
 * 3. DNBridgeUSC v2 → USC Testnet (MANUAL — requires EvmV1Decoder library linking)
 *
 * This script deploys steps 1 & 2 automatically.
 * Step 3 requires forge create with --libraries flag (see output for commands).
 *
 * Full deployment record: deployments/bridge-deploy.json (manually maintained)
 *
 * Usage: NODE_PATH=apps/web/node_modules npx tsx scripts/deploy-dn-bridge.ts
 */
import {
  createPublicClient,
  createWalletClient,
  http,
  parseEther,
  defineChain,
  type Hex,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { sepolia } from "viem/chains";
import accounts from "../simulation-accounts.json";

// ──── Chains ────
const cc3Testnet = defineChain({
  id: 102031,
  name: "Creditcoin3 Testnet",
  nativeCurrency: { name: "CTC", symbol: "tCTC", decimals: 18 },
  rpcUrls: { default: { http: ["https://rpc.cc3-testnet.creditcoin.network"] } },
});

const uscTestnet = defineChain({
  id: 102036,
  name: "USC Testnet",
  nativeCurrency: { name: "CTC", symbol: "tCTC", decimals: 18 },
  rpcUrls: { default: { http: ["https://rpc.usc-testnet2.creditcoin.network"] } },
});

// ──── Account ────
const deployer = privateKeyToAccount(accounts.deployer.privateKey as Hex);
console.log(`Deployer: ${deployer.address}`);

// ──── Clients ────
const sepoliaPublic = createPublicClient({ chain: sepolia, transport: http("https://1rpc.io/sepolia") });
const sepoliaWallet = createWalletClient({ account: deployer, chain: sepolia, transport: http("https://1rpc.io/sepolia") });

const ccPublic = createPublicClient({ chain: cc3Testnet, transport: http() });
const ccWallet = createWalletClient({ account: deployer, chain: cc3Testnet, transport: http() });

const uscPublic = createPublicClient({ chain: uscTestnet, transport: http() });
const uscWallet = createWalletClient({ account: deployer, chain: uscTestnet, transport: http() });

// ──── Contract Bytecodes (from forge build) ────
import { readFileSync } from "fs";
import { join } from "path";

function loadBytecode(contractName: string): Hex {
  const artifactPath = join(
    __dirname,
    "../packages/usc-bridge/out",
    `${contractName}.sol`,
    `${contractName}.json`,
  );
  const artifact = JSON.parse(readFileSync(artifactPath, "utf-8"));
  return artifact.bytecode.object as Hex;
}

async function deployContract(
  name: string,
  publicClient: any,
  walletClient: any,
  bytecode: Hex,
  constructorArgs: Hex = "0x",
) {
  console.log(`\n🔨 Deploying ${name}...`);
  const data = (bytecode + constructorArgs.slice(2)) as Hex;
  const hash = await walletClient.sendTransaction({ data });
  console.log(`   TX: ${hash}`);
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  console.log(`   Contract: ${receipt.contractAddress}`);
  console.log(`   Block: ${receipt.blockNumber}`);
  return { address: receipt.contractAddress!, blockNumber: Number(receipt.blockNumber), txHash: hash };
}

// ──── ABI Encode Helpers ────
function encodeUint256(val: bigint): string {
  return val.toString(16).padStart(64, "0");
}

function encodeAddress(addr: string): string {
  return addr.toLowerCase().slice(2).padStart(64, "0");
}

async function main() {
  const USDC_CC = "0x60e204104cfe1a93f630ea5ebc0a895cc80ebed9"; // CC Testnet USDC
  const results: Record<string, any> = {};

  // 1. Deploy DN Token v2 on Sepolia
  const dnTokenBytecode = loadBytecode("DNToken");
  // Constructor: initialSupply = 0 (users mint via public mint)
  const dnTokenArgs = ("0x" + encodeUint256(0n)) as Hex;
  const dnToken = await deployContract("DNToken (Sepolia)", sepoliaPublic, sepoliaWallet, dnTokenBytecode, dnTokenArgs);
  results.dnTokenSepolia = dnToken;

  // 2. Deploy BridgeVault on CC Testnet
  const vaultBytecode = loadBytecode("BridgeVault");
  // Constructor: _usdc = USDC address
  const vaultArgs = ("0x" + encodeAddress(USDC_CC)) as Hex;
  const vault = await deployContract("BridgeVault (CC Testnet)", ccPublic, ccWallet, vaultBytecode, vaultArgs);
  results.bridgeVaultCC = vault;

  // 3. Deploy DNBridgeUSC v2 on USC Testnet
  // NOTE: DNBridgeUSC depends on EvmV1Decoder external library.
  // The raw bytecode contains unlinked references (__$...$__).
  // Use `forge create` with --libraries flag instead:
  //   forge create src/EvmV1Decoder.sol:EvmV1Decoder --rpc-url <USC_RPC> --private-key <KEY> --broadcast
  //   forge create src/DNBridgeUSC.sol:DNBridgeUSC --rpc-url <USC_RPC> --private-key <KEY> --broadcast \
  //     --libraries src/EvmV1Decoder.sol:EvmV1Decoder:<DEPLOYED_LIB_ADDR> \
  //     --constructor-args <SEPOLIA_DN_TOKEN_ADDR>
  console.log("\n⚠️  DNBridgeUSC requires EvmV1Decoder library linking.");
  console.log("   Deploy manually with forge create (see comments in script).");
  console.log("   Skipping automatic deployment for DNBridgeUSC.");
  results.dnBridgeUSC = { address: "DEPLOY_MANUALLY", blockNumber: 0, txHash: "N/A" };

  // Summary
  console.log("\n" + "=".repeat(60));
  console.log("DEPLOYMENT SUMMARY");
  console.log("=".repeat(60));
  console.log(`DN Token v2 (Sepolia):     ${results.dnTokenSepolia.address}`);
  console.log(`BridgeVault (CC Testnet):   ${results.bridgeVaultCC.address}`);
  console.log(`DNBridgeUSC v2 (USC):      ${results.dnBridgeUSC.address}`);
  console.log("\nUpdate these in:");
  console.log("  - packages/core/src/config/addresses.ts (BRIDGE section)");
  console.log("  - apps/usc-worker/src/config.mjs");

  // NOTE: deployments/bridge-deploy.json is maintained manually.
  // Do NOT auto-generate it here — the file includes USC deployment data
  // that this script cannot produce (forge create with library linking).
  console.log("\nManually update deployments/bridge-deploy.json with the addresses above.");
}

main().catch((err) => {
  console.error("Deployment failed:", err);
  process.exit(1);
});
