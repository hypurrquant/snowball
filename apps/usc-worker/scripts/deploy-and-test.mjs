/**
 * Deploy DNToken (Sepolia) + DNBridgeUSC (USC) and run full E2E test.
 *
 * Usage: node scripts/deploy-and-test.mjs
 *
 * Reads DEPLOYER_PRIVATE_KEY from ../../../scripts/simulation-accounts.json
 */
import { ethers } from "ethers";
import { readFileSync } from "fs";
import { execSync } from "child_process";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "../../..");
const BRIDGE_PKG = resolve(ROOT, "packages/usc-bridge");

// Load deployer key
const accounts = JSON.parse(readFileSync(resolve(ROOT, "scripts/simulation-accounts.json"), "utf-8"));
const DEPLOYER_PK = accounts.deployer.privateKey;

const SEPOLIA_RPC = "https://1rpc.io/sepolia";
const USC_RPC = "https://rpc.usc-testnet2.creditcoin.network";

function log(step, msg) {
  console.log(`\n[${"=".repeat(2)} ${step} ${"=".repeat(2)}] ${msg}`);
}

async function main() {
  const sepoliaProvider = new ethers.JsonRpcProvider(SEPOLIA_RPC);
  const uscProvider = new ethers.JsonRpcProvider(USC_RPC, undefined, { staticNetwork: true });
  const sepoliaWallet = new ethers.Wallet(DEPLOYER_PK, sepoliaProvider);
  const uscWallet = new ethers.Wallet(DEPLOYER_PK, uscProvider);

  console.log(`Deployer: ${sepoliaWallet.address}`);

  // ============ Step 1: Deploy DNToken on Sepolia ============
  log("1/6", "Deploying DNToken on Sepolia...");

  const deployDnResult = execSync(
    `forge create src/DNToken.sol:DNToken ` +
    `--rpc-url ${SEPOLIA_RPC} ` +
    `--private-key ${DEPLOYER_PK} ` +
    `--constructor-args ${ethers.parseEther("1000000").toString()}`,
    { cwd: BRIDGE_PKG, encoding: "utf-8", timeout: 120_000 }
  );
  console.log(deployDnResult);

  const dnTokenMatch = deployDnResult.match(/Deployed to:\s+(0x[0-9a-fA-F]{40})/);
  if (!dnTokenMatch) throw new Error("Failed to parse DNToken address");
  const DN_TOKEN_ADDR = dnTokenMatch[1];
  console.log(`  DNToken: ${DN_TOKEN_ADDR}`);

  // ============ Step 2: Deploy DNBridgeUSC on USC Testnet ============
  log("2/6", "Deploying DNBridgeUSC on USC Testnet...");

  const deployBridgeResult = execSync(
    `forge create src/DNBridgeUSC.sol:DNBridgeUSC ` +
    `--rpc-url ${USC_RPC} ` +
    `--private-key ${DEPLOYER_PK} ` +
    `--constructor-args ${DN_TOKEN_ADDR}`,
    { cwd: BRIDGE_PKG, encoding: "utf-8", timeout: 120_000 }
  );
  console.log(deployBridgeResult);

  const bridgeMatch = deployBridgeResult.match(/Deployed to:\s+(0x[0-9a-fA-F]{40})/);
  if (!bridgeMatch) throw new Error("Failed to parse DNBridgeUSC address");
  const BRIDGE_ADDR = bridgeMatch[1];
  console.log(`  DNBridgeUSC: ${BRIDGE_ADDR}`);

  // ============ Step 3: Verify deployments ============
  log("3/6", "Verifying deployments...");

  const dnTokenAbi = [
    "function balanceOf(address) view returns (uint256)",
    "function totalSupply() view returns (uint256)",
    "function bridgeBurn(uint256 amount, uint64 destinationChainKey) returns (bool)",
  ];
  const bridgeAbi = [
    "function owner() view returns (address)",
    "function operator() view returns (address)",
    "function sepoliaDNToken() view returns (address)",
  ];

  const dnToken = new ethers.Contract(DN_TOKEN_ADDR, dnTokenAbi, sepoliaWallet);
  const bridge = new ethers.Contract(BRIDGE_ADDR, bridgeAbi, uscProvider);

  const supply = await dnToken.totalSupply();
  const balance = await dnToken.balanceOf(sepoliaWallet.address);
  const bridgeOwner = await bridge.owner();
  const bridgeOperator = await bridge.operator();
  const bridgeToken = await bridge.sepoliaDNToken();

  console.log(`  DNToken supply: ${ethers.formatEther(supply)} DN`);
  console.log(`  Deployer DN balance: ${ethers.formatEther(balance)} DN`);
  console.log(`  Bridge owner: ${bridgeOwner}`);
  console.log(`  Bridge operator: ${bridgeOperator}`);
  console.log(`  Bridge sepoliaDNToken: ${bridgeToken}`);

  // ============ Step 4: Burn 10 DN on Sepolia ============
  log("4/6", "Burning 10 DN on Sepolia...");

  const burnAmount = ethers.parseEther("10");
  const burnTx = await dnToken.bridgeBurn(burnAmount, 1);
  console.log(`  Burn TX: ${burnTx.hash}`);
  const burnReceipt = await burnTx.wait();
  console.log(`  Confirmed at block ${burnReceipt.blockNumber}`);

  // ============ Step 5: Print config for worker ============
  log("5/6", "Worker configuration:");

  const currentBlock = await sepoliaProvider.getBlockNumber();
  // Set START_BLOCK to a few blocks before the burn to ensure worker catches it
  const startBlock = burnReceipt.blockNumber - 1;

  console.log(`
  Update apps/usc-worker/src/config.mjs:
    DN_TOKEN_SEPOLIA = "${DN_TOKEN_ADDR}"
    DN_BRIDGE_USC    = "${BRIDGE_ADDR}"
    DN_TOKEN_DEPLOY_BLOCK = ${startBlock}

  Then run worker:
    cd apps/usc-worker
    START_BLOCK=${startBlock} node src/index.mjs

  Worker should detect the burn and process it automatically.
  `);

  // ============ Step 6: Write addresses to a JSON file for reference ============
  log("6/6", "Saving deployment info...");

  const deployInfo = {
    timestamp: new Date().toISOString(),
    deployer: sepoliaWallet.address,
    sepolia: {
      dnToken: DN_TOKEN_ADDR,
      burnTxHash: burnTx.hash,
      burnBlock: burnReceipt.blockNumber,
    },
    usc: {
      dnBridgeUSC: BRIDGE_ADDR,
    },
    workerConfig: {
      START_BLOCK: startBlock,
    },
  };

  const outPath = resolve(__dirname, "deployment.json");
  const { writeFileSync } = await import("fs");
  writeFileSync(outPath, JSON.stringify(deployInfo, null, 2));
  console.log(`  Saved to: ${outPath}`);
  console.log(`\n✅ Deploy complete. Ready to test worker.`);
}

main().catch((e) => {
  console.error(`\n❌ Error: ${e.message}`);
  process.exit(1);
});
