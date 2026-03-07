/**
 * Deploy AgentVault V3 with permission refactor (separated execution + token allowances)
 *
 * Usage: NODE_PATH=apps/web/node_modules npx tsx scripts/deploy-agent-vault-v2.ts
 */
import {
  createPublicClient, createWalletClient, http,
  type Address,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { defineChain } from "viem";
import * as fs from "fs";
import * as path from "path";

const cc3 = defineChain({
  id: 102031, name: "CC3 Testnet",
  nativeCurrency: { name: "CTC", symbol: "tCTC", decimals: 18 },
  rpcUrls: { default: { http: ["https://rpc.cc3-testnet.creditcoin.network"] } },
});

const accts = JSON.parse(fs.readFileSync(path.join(__dirname, "../simulation-accounts.json"), "utf8"));
const account = privateKeyToAccount(accts.deployer.privateKey as `0x${string}`);
const transport = http("https://rpc.cc3-testnet.creditcoin.network");
const pub = createPublicClient({ chain: cc3, transport });
const wallet = createWalletClient({ account, chain: cc3, transport });

// Read compiled artifact from forge output
const artifactPath = path.join(
  __dirname,
  "../../packages/liquity/out/AgentVault.sol/AgentVault.json"
);

async function main() {
  console.log(`Deployer: ${account.address}`);

  if (!fs.existsSync(artifactPath)) {
    console.error("Artifact not found. Run 'forge build --skip test' in packages/liquity first.");
    process.exit(1);
  }

  const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));
  const bytecode = artifact.bytecode.object as `0x${string}`;

  console.log("Deploying AgentVault V3...");

  const hash = await wallet.deployContract({
    abi: artifact.abi,
    bytecode,
  });

  console.log(`Deploy tx: ${hash}`);

  const receipt = await pub.waitForTransactionReceipt({ hash });
  const contractAddress = receipt.contractAddress;

  console.log(`AgentVault V3 deployed at: ${contractAddress}`);
  console.log("");
  console.log("Update these files with the new address:");
  console.log("  1. packages/core/src/config/addresses.ts → ERC8004.agentVault");
  console.log("  2. packages/core/src/config/addresses.ts → LIQUITY.shared.agentVault");
  console.log("  3. packages/agent-runtime/src/config.ts → agentVault");

  // Verify getPermNonce works (new v3 function)
  const nonce = await pub.readContract({
    address: contractAddress as Address,
    abi: artifact.abi,
    functionName: "getPermNonce",
    args: [account.address, account.address],
  });
  console.log(`\nVerification: getPermNonce(deployer, deployer) = ${nonce}`);

  // Verify getDelegatedUsers still works
  const result = await pub.readContract({
    address: contractAddress as Address,
    abi: artifact.abi,
    functionName: "getDelegatedUsers",
    args: [account.address],
  });
  console.log(`Verification: getDelegatedUsers(deployer) = ${JSON.stringify(result)}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
