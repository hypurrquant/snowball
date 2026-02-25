/**
 * Snowball Oracle -- Viem-based deploy script
 * Deploys BTCMockOracle on Creditcoin Testnet
 *
 * Usage: npx tsx scripts/deploy-viem.ts
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
  blockExplorers: {
    default: { name: "Blockscout", url: "https://creditcoin-testnet.blockscout.com" },
  },
  testnet: true,
} as const;

function loadArtifact(contractName: string): { abi: Abi; bytecode: `0x${string}` } {
  const p = path.join(__dirname, `../out/${contractName}.sol/${contractName}.json`);
  if (fs.existsSync(p)) {
    const artifact = JSON.parse(fs.readFileSync(p, "utf8"));
    const bytecode = artifact.bytecode?.object ?? artifact.bytecode;
    return { abi: artifact.abi, bytecode: bytecode as `0x${string}` };
  }
  throw new Error(`Foundry artifact not found: ${contractName} (run 'forge build' first)`);
}

const PRIVATE_KEY = process.env.DEPLOYER_PRIVATE_KEY || process.env.ADMIN_PRIVATE_KEY;
if (!PRIVATE_KEY) {
  console.error("Set DEPLOYER_PRIVATE_KEY in .env");
  process.exit(1);
}

// Derive operator address from OPERATOR_PRIVATE_KEY if OPERATOR_ADDRESS is not a valid address
let OPERATOR_ADDRESS = process.env.OPERATOR_ADDRESS;
if (OPERATOR_ADDRESS && OPERATOR_ADDRESS.length !== 42) {
  // Likely a private key was set instead of address — derive it
  try {
    const opAccount = privateKeyToAccount(OPERATOR_ADDRESS as `0x${string}`);
    OPERATOR_ADDRESS = opAccount.address;
  } catch {
    OPERATOR_ADDRESS = undefined;
  }
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

async function send(address: Address, abi: Abi, functionName: string, args: any[] = []) {
  const hash = await walletClient.writeContract({ address, abi, functionName, args, gas: 3_000_000n });
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  if (receipt.status !== "success") throw new Error(`TX ${functionName} failed`);
  return hash;
}

async function main() {
  const balance = await publicClient.getBalance({ address: account.address });
  console.log(`Deploying with: ${account.address}`);
  console.log(`Balance: ${formatEther(balance)} tCTC\n`);

  console.log("=== Deploy BTCMockOracle ===");
  const oracle = await deploy("BTCMockOracle", [account.address]);

  // Grant OPERATOR_ROLE to backend wallet if provided
  if (OPERATOR_ADDRESS) {
    console.log(`\n=== Grant OPERATOR_ROLE to ${OPERATOR_ADDRESS} ===`);
    const OPERATOR_ROLE = "0x97667070c54ef182b0f5858b034beac1b6f3089aa2d3188bb1e8929f4fa9b929"; // keccak256("OPERATOR_ROLE")
    await send(oracle.address, oracle.abi, "grantRole", [OPERATOR_ROLE, OPERATOR_ADDRESS]);
    console.log("  OPERATOR_ROLE granted");
  }

  const addresses = {
    network: { name: "Creditcoin Testnet", chainId: 102031 },
    oracle: {
      btcMockOracle: oracle.address,
    },
  };

  const outPath = path.join(__dirname, "../../../deployments/creditcoin-testnet/oracle.json");
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(addresses, null, 2));

  console.log("\nBTCMockOracle deployment complete!");
  console.log(`  Saved to: ${outPath}`);
  console.log(JSON.stringify(addresses, null, 2));
}

main().then(() => process.exit(0)).catch((err) => {
  console.error("\nDeployment failed:", err.message || err);
  process.exit(1);
});
