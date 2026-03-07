/**
 * Deploy DNToken on Sepolia + DNBridgeUSC on USC Testnet using ethers.js
 */
import { ethers } from "ethers";
import { readFileSync, writeFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "../../..");

// Load deployer key
const accounts = JSON.parse(readFileSync(resolve(ROOT, "scripts/simulation-accounts.json"), "utf-8"));
const DEPLOYER_PK = accounts.deployer.privateKey;

const SEPOLIA_RPC = "https://1rpc.io/sepolia";
const USC_RPC = "https://rpc.usc-testnet2.creditcoin.network";

// Load compiled artifacts from forge
const dnTokenArtifact = JSON.parse(
  readFileSync(resolve(ROOT, "packages/usc-bridge/out/DNToken.sol/DNToken.json"), "utf-8")
);
const bridgeArtifact = JSON.parse(
  readFileSync(resolve(ROOT, "packages/usc-bridge/out/DNBridgeUSC.sol/DNBridgeUSC.json"), "utf-8")
);

async function main() {
  const sepoliaProvider = new ethers.JsonRpcProvider(SEPOLIA_RPC);
  const uscProvider = new ethers.JsonRpcProvider(USC_RPC, undefined, { staticNetwork: true });
  const sepoliaWallet = new ethers.Wallet(DEPLOYER_PK, sepoliaProvider);
  const uscWallet = new ethers.Wallet(DEPLOYER_PK, uscProvider);

  console.log(`Deployer: ${sepoliaWallet.address}`);
  console.log(`Sepolia ETH: ${ethers.formatEther(await sepoliaProvider.getBalance(sepoliaWallet.address))}`);
  console.log(`USC CTC: ${ethers.formatEther(await uscProvider.getBalance(uscWallet.address))}`);

  // ============ 1. Deploy DNToken on Sepolia ============
  console.log("\n[1/2] Deploying DNToken on Sepolia...");
  const dnFactory = new ethers.ContractFactory(
    dnTokenArtifact.abi,
    dnTokenArtifact.bytecode.object,
    sepoliaWallet
  );
  const initialSupply = ethers.parseEther("1000000"); // 1M DN
  const dnToken = await dnFactory.deploy(initialSupply);
  console.log(`  TX: ${dnToken.deploymentTransaction().hash}`);
  await dnToken.waitForDeployment();
  const dnTokenAddr = await dnToken.getAddress();
  console.log(`  DNToken deployed: ${dnTokenAddr}`);

  // Verify
  const supply = await dnToken.totalSupply();
  const bal = await dnToken.balanceOf(sepoliaWallet.address);
  console.log(`  Total supply: ${ethers.formatEther(supply)} DN`);
  console.log(`  Deployer balance: ${ethers.formatEther(bal)} DN`);

  // ============ 2. Deploy DNBridgeUSC on USC Testnet ============
  console.log("\n[2/2] Deploying DNBridgeUSC on USC Testnet...");
  const bridgeFactory = new ethers.ContractFactory(
    bridgeArtifact.abi,
    bridgeArtifact.bytecode.object,
    uscWallet
  );
  const bridge = await bridgeFactory.deploy(dnTokenAddr);
  console.log(`  TX: ${bridge.deploymentTransaction().hash}`);
  await bridge.waitForDeployment();
  const bridgeAddr = await bridge.getAddress();
  console.log(`  DNBridgeUSC deployed: ${bridgeAddr}`);

  // Verify
  const owner = await bridge.owner();
  const operator = await bridge.operator();
  console.log(`  Owner: ${owner}`);
  console.log(`  Operator: ${operator}`);

  // ============ Save deployment info ============
  const currentBlock = await sepoliaProvider.getBlockNumber();
  const deployInfo = {
    timestamp: new Date().toISOString(),
    deployer: sepoliaWallet.address,
    sepolia: { dnToken: dnTokenAddr, deployBlock: currentBlock },
    usc: { dnBridgeUSC: bridgeAddr },
  };

  const outPath = resolve(__dirname, "deployment.json");
  writeFileSync(outPath, JSON.stringify(deployInfo, null, 2));
  console.log(`\nSaved to: ${outPath}`);
  console.log(`\n✅ Both contracts deployed. Next: update config.mjs and run worker.`);
}

main().catch((e) => {
  console.error(`\n❌ Error: ${e.message}`);
  process.exit(1);
});
