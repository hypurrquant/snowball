/**
 * Deploy MetaMorphoFactory separately (after main deployment).
 * Usage: npx tsx scripts/deploy-metamorpho-factory.ts
 */
import {
  createPublicClient,
  createWalletClient,
  http,
  formatEther,
  type Address,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import * as fs from "fs";
import * as path from "path";
import * as dotenv from "dotenv";

dotenv.config({ path: path.join(__dirname, "../../../.env") });

const creditcoinTestnet = {
  id: 102031,
  name: "Creditcoin Testnet" as const,
  nativeCurrency: { name: "CTC", symbol: "tCTC", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://rpc.cc3-testnet.creditcoin.network" as const] },
  },
  testnet: true,
} as const;

const PRIVATE_KEY = process.env.DEPLOYER_PRIVATE_KEY || process.env.ADMIN_PRIVATE_KEY;
if (!PRIVATE_KEY) { console.error("Set DEPLOYER_PRIVATE_KEY in .env"); process.exit(1); }

const account = privateKeyToAccount(PRIVATE_KEY as `0x${string}`);
const publicClient = createPublicClient({ chain: creditcoinTestnet as any, transport: http() });
const walletClient = createWalletClient({ account, chain: creditcoinTestnet as any, transport: http() });

async function main() {
  const balance = await publicClient.getBalance({ address: account.address });
  console.log(`Deployer: ${account.address}`);
  console.log(`Balance: ${formatEther(balance)} tCTC\n`);

  // Load morpho.json to get Morpho core address
  const deployDir = path.join(__dirname, "../../../deployments/creditcoin-testnet");
  const morphoAddrs = JSON.parse(fs.readFileSync(path.join(deployDir, "morpho.json"), "utf8"));
  const morphoAddress = morphoAddrs.core.morpho;
  console.log(`Morpho core: ${morphoAddress}`);

  // Load MetaMorphoFactory artifact
  const artifactPath = path.join(__dirname, "../../morpho/out/MetaMorphoFactory.sol/MetaMorphoFactory.json");
  const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));
  const bytecode = artifact.bytecode?.object ?? artifact.bytecode;

  console.log(`Deploying MetaMorphoFactory...`);
  const hash = await walletClient.deployContract({
    abi: artifact.abi,
    bytecode: bytecode as `0x${string}`,
    args: [morphoAddress],
    gas: 30_000_000n,
  });
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  if (receipt.status !== "success") throw new Error("Deploy failed");

  const factoryAddress = receipt.contractAddress!;
  console.log(`MetaMorphoFactory: ${factoryAddress}`);

  // Update morpho.json
  morphoAddrs.vaults.metaMorphoFactory = factoryAddress;
  fs.writeFileSync(path.join(deployDir, "morpho.json"), JSON.stringify(morphoAddrs, null, 2));
  console.log(`\nUpdated morpho.json`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => { console.error("FAILED:", err.message || err); process.exit(1); });
