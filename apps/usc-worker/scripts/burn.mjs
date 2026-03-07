/**
 * Burn DN tokens on Sepolia to trigger the bridge worker.
 *
 * Usage: node scripts/burn.mjs [amount]
 *   amount: DN to burn (default: 10)
 */
import { ethers } from "ethers";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "../../..");
const accounts = JSON.parse(readFileSync(resolve(ROOT, "scripts/simulation-accounts.json"), "utf-8"));
const DEPLOYER_PK = accounts.deployer.privateKey;

const SEPOLIA_RPC = "https://1rpc.io/sepolia";
const deployment = JSON.parse(readFileSync(resolve(__dirname, "deployment.json"), "utf-8"));
const DN_TOKEN = deployment.sepolia.dnToken;

const dnTokenAbi = [
  "function bridgeBurn(uint256 amount, uint64 destinationChainKey) returns (bool)",
  "function balanceOf(address) view returns (uint256)",
];

async function main() {
  const amount = process.argv[2] || "10";
  const amountWei = ethers.parseEther(amount);

  const provider = new ethers.JsonRpcProvider(SEPOLIA_RPC);
  const wallet = new ethers.Wallet(DEPLOYER_PK, provider);
  const dnToken = new ethers.Contract(DN_TOKEN, dnTokenAbi, wallet);

  console.log(`Address: ${wallet.address}`);
  console.log(`DN Token: ${DN_TOKEN}`);

  const balance = await dnToken.balanceOf(wallet.address);
  console.log(`DN balance: ${ethers.formatEther(balance)} DN`);

  console.log(`\nBurning ${amount} DN on Sepolia...`);
  const tx = await dnToken.bridgeBurn(amountWei, 1);
  console.log(`TX: ${tx.hash}`);

  const receipt = await tx.wait();
  console.log(`✅ Burn confirmed at block ${receipt.blockNumber}`);
  console.log(`\nWorker should detect this BridgeBurn event.`);
}

main().catch((e) => {
  console.error(`Error: ${e.message}`);
  process.exit(1);
});
