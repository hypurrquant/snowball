/**
 * Snowball Options -- Viem-based deploy script
 * Deploys OptionsClearingHouse, OptionsVault, SnowballOptions, OptionsRelayer
 * All behind ERC1967 UUPS proxies on Creditcoin Testnet
 *
 * Usage: npx tsx scripts/deploy-viem.ts
 */
import {
  createPublicClient,
  createWalletClient,
  http,
  formatEther,
  encodeFunctionData,
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

const ORACLE_ADDRESS = process.env.ORACLE_BTC_ADDRESS;
if (!ORACLE_ADDRESS) {
  console.error("Set ORACLE_BTC_ADDRESS in .env (BTCMockOracle address)");
  process.exit(1);
}

// Derive operator address from private key if necessary
let OPERATOR_ADDRESS = process.env.OPERATOR_ADDRESS;
if (OPERATOR_ADDRESS && OPERATOR_ADDRESS.length !== 42) {
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

async function deployProxy(
  implName: string,
  initData: `0x${string}`
): Promise<{ address: Address; implAddress: Address; abi: Abi }> {
  // Deploy implementation
  const impl = await deploy(implName);
  console.log(`  ${implName} impl: ${impl.address}`);

  // Deploy ERC1967Proxy
  const proxy = await deploy("ERC1967Proxy", [impl.address, initData]);
  console.log(`  ${implName} proxy: ${proxy.address}`);

  return { address: proxy.address, implAddress: impl.address, abi: impl.abi };
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

  const COMMISSION_FEE = 500n; // 5%

  // ─── Phase 1: OptionsClearingHouse ───
  console.log("=== Phase 1: OptionsClearingHouse (UUPS Proxy) ===");
  const chArtifact = loadArtifact("OptionsClearingHouse");
  const chInitData = encodeFunctionData({
    abi: chArtifact.abi,
    functionName: "initialize",
    args: [account.address],
  });
  const clearingHouse = await deployProxy("OptionsClearingHouse", chInitData);

  // ─── Phase 2: OptionsVault ───
  console.log("\n=== Phase 2: OptionsVault (UUPS Proxy) ===");
  const vaultArtifact = loadArtifact("OptionsVault");
  const vaultInitData = encodeFunctionData({
    abi: vaultArtifact.abi,
    functionName: "initialize",
    args: [account.address],
  });
  const optionsVault = await deployProxy("OptionsVault", vaultInitData);

  // ─── Phase 3: SnowballOptions ───
  console.log("\n=== Phase 3: SnowballOptions (UUPS Proxy) ===");
  const optArtifact = loadArtifact("SnowballOptions");
  const optInitData = encodeFunctionData({
    abi: optArtifact.abi,
    functionName: "initialize",
    args: [
      account.address,
      clearingHouse.address,
      optionsVault.address,
      ORACLE_ADDRESS as Address,
      COMMISSION_FEE,
    ],
  });
  const snowballOptions = await deployProxy("SnowballOptions", optInitData);

  // ─── Phase 4: OptionsRelayer ───
  console.log("\n=== Phase 4: OptionsRelayer (UUPS Proxy) ===");
  const relayerArtifact = loadArtifact("OptionsRelayer");
  const relayerInitData = encodeFunctionData({
    abi: relayerArtifact.abi,
    functionName: "initialize",
    args: [account.address, snowballOptions.address, clearingHouse.address],
  });
  const optionsRelayer = await deployProxy("OptionsRelayer", relayerInitData);

  // ─── Phase 5: Role Setup ───
  console.log("\n=== Phase 5: Role Setup ===");

  // ClearingHouse: PRODUCT_ROLE → SnowballOptions
  const PRODUCT_ROLE = "0x41d66cdaef18e97d7e75ce2cfcd556a65f6f5a09b2e0c1e3c1f2cb4bbe12bc64"; // keccak256("PRODUCT_ROLE")
  await send(clearingHouse.address, clearingHouse.abi, "grantRole", [PRODUCT_ROLE, snowballOptions.address]);
  console.log("  ClearingHouse: PRODUCT_ROLE → SnowballOptions");

  // Vault: ENGINE_ROLE → SnowballOptions
  const ENGINE_ROLE = "0x2724ee9ad8e3ee18a94a56f4f4b67eb6b01fd83e098db3ce96d28ba6e16906f7"; // keccak256("ENGINE_ROLE")
  await send(optionsVault.address, optionsVault.abi, "grantRole", [ENGINE_ROLE, snowballOptions.address]);
  console.log("  OptionsVault: ENGINE_ROLE → SnowballOptions");

  // SnowballOptions: RELAYER_ROLE → OptionsRelayer
  const RELAYER_ROLE = "0xe2b7fb3b832174769106daebcfd6d1970523240dda11281102db9363b83b0dc4"; // keccak256("RELAYER_ROLE")
  await send(snowballOptions.address, snowballOptions.abi, "grantRole", [RELAYER_ROLE, optionsRelayer.address]);
  console.log("  SnowballOptions: RELAYER_ROLE → OptionsRelayer");

  // Grant OPERATOR_ROLE to backend wallet if specified
  if (OPERATOR_ADDRESS) {
    const OPERATOR_ROLE = "0x97667070c54ef182b0f5858b034beac1b6f3089aa2d3188bb1e8929f4fa9b929"; // keccak256("OPERATOR_ROLE")
    await send(snowballOptions.address, snowballOptions.abi, "grantRole", [OPERATOR_ROLE, OPERATOR_ADDRESS]);
    await send(optionsRelayer.address, optionsRelayer.abi, "grantRole", [OPERATOR_ROLE, OPERATOR_ADDRESS]);
    console.log(`  OPERATOR_ROLE → ${OPERATOR_ADDRESS}`);
  }

  const addresses = {
    network: { name: "Creditcoin Testnet", chainId: 102031 },
    options: {
      clearingHouse: clearingHouse.address,
      clearingHouseImpl: clearingHouse.implAddress,
      vault: optionsVault.address,
      vaultImpl: optionsVault.implAddress,
      snowballOptions: snowballOptions.address,
      snowballOptionsImpl: snowballOptions.implAddress,
      relayer: optionsRelayer.address,
      relayerImpl: optionsRelayer.implAddress,
    },
    config: {
      oracle: ORACLE_ADDRESS,
      commissionFee: "500 (5%)",
    },
  };

  const outPath = path.join(__dirname, "../../../deployments/creditcoin-testnet/options.json");
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(addresses, null, 2));

  console.log("\nSnowball Options deployment complete!");
  console.log(`  Saved to: ${outPath}`);
  console.log(JSON.stringify(addresses, null, 2));
}

main().then(() => process.exit(0)).catch((err) => {
  console.error("\nDeployment failed:", err.message || err);
  process.exit(1);
});
