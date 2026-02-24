/**
 * Snowball Lend -- Viem-based deploy script
 * Deploys Morpho Blue fork on Creditcoin Testnet
 *
 * Usage: npx tsx scripts/deploy-viem.ts
 */
import {
  createPublicClient,
  createWalletClient,
  http,
  parseEther,
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

const LLTV_77 = parseEther("0.77");
const LLTV_80 = parseEther("0.80");
const LLTV_86 = parseEther("0.86");

// Existing Snowball Protocol tokens (deployed on Creditcoin Testnet)
const SNOWBALL_TOKENS = {
  wCTC: "0x8f7f60a0f615d828eafcbbf6121f73efcfb56969" as Address,
  lstCTC: "0x72968ff9203dc5f352c5e42477b84d11c8c8f153" as Address,
  sbUSD: "0x5772f9415b75ecca00e7667e0c7d730db3b29fbd" as Address,
};

async function main() {
  const balance = await publicClient.getBalance({ address: account.address });
  console.log(`Deploying with: ${account.address}`);
  console.log(`Balance: ${formatEther(balance)} tCTC\n`);

  console.log("=== Phase 1: SnowballLend core ===");
  const snowballLend = await deploy("SnowballLend", [account.address]);

  console.log("\n=== Phase 2: AdaptiveCurveIRM ===");
  const irm = await deploy("AdaptiveCurveIRM", [snowballLend.address]);

  console.log("\n=== Phase 3: Enable IRM and LLTVs ===");
  await send(snowballLend.address, snowballLend.abi, "enableIrm", [irm.address]);
  await send(snowballLend.address, snowballLend.abi, "enableLltv", [LLTV_77]);
  await send(snowballLend.address, snowballLend.abi, "enableLltv", [LLTV_80]);
  await send(snowballLend.address, snowballLend.abi, "enableLltv", [LLTV_86]);
  console.log("  IRM + LLTVs enabled");

  console.log("\n=== Phase 4: Mock Oracles ===");
  const wCTCOracle = await deploy("MockOracle", [parseEther("5")]);
  const lstCTCOracle = await deploy("MockOracle", [parseEther("5")]);
  const sbUSDOracle = await deploy("MockOracle", [parseEther("1")]);

  console.log("\n=== Phase 5: MockUSDC ===");
  const mockUSDC = await deploy("MockERC20", ["USD Coin", "USDC", 6]);
  console.log("  Minting 1,000,000 USDC to deployer...");
  await send(mockUSDC.address, mockUSDC.abi, "mint", [account.address, 1_000_000n * 10n ** 6n]);

  console.log("\n=== Phase 6: SnowballVaultFactory ===");
  const vaultFactory = await deploy("SnowballVaultFactory", [snowballLend.address]);

  console.log("\n=== Phase 7: PublicAllocator ===");
  const publicAllocator = await deploy("PublicAllocator", [snowballLend.address]);

  // ─── Phase 8: Create Markets ───
  // MarketParams tuple: (loanToken, collateralToken, oracle, irm, lltv)
  console.log("\n=== Phase 8: Create Markets ===");

  // Market 1: wCTC/sbUSD — borrow sbUSD against wCTC collateral (77% LLTV)
  const market1Params = [
    SNOWBALL_TOKENS.sbUSD,       // loanToken
    SNOWBALL_TOKENS.wCTC,        // collateralToken
    wCTCOracle.address,          // oracle
    irm.address,                 // irm
    LLTV_77,                     // lltv
  ] as const;
  const market1Tx = await send(snowballLend.address, snowballLend.abi, "createMarket", [market1Params]);
  console.log("  Market wCTC/sbUSD created (LLTV 77%)");

  // Market 2: lstCTC/sbUSD — borrow sbUSD against lstCTC collateral (80% LLTV)
  const market2Params = [
    SNOWBALL_TOKENS.sbUSD,       // loanToken
    SNOWBALL_TOKENS.lstCTC,      // collateralToken
    lstCTCOracle.address,        // oracle
    irm.address,                 // irm
    LLTV_80,                     // lltv
  ] as const;
  const market2Tx = await send(snowballLend.address, snowballLend.abi, "createMarket", [market2Params]);
  console.log("  Market lstCTC/sbUSD created (LLTV 80%)");

  // Market 3: sbUSD/USDC — borrow USDC against sbUSD collateral (86% LLTV)
  const market3Params = [
    mockUSDC.address,            // loanToken
    SNOWBALL_TOKENS.sbUSD,       // collateralToken
    sbUSDOracle.address,         // oracle
    irm.address,                 // irm
    LLTV_86,                     // lltv
  ] as const;
  const market3Tx = await send(snowballLend.address, snowballLend.abi, "createMarket", [market3Params]);
  console.log("  Market sbUSD/USDC created (LLTV 86%)");

  const addresses = {
    network: { name: "Creditcoin Testnet", chainId: 102031 },
    core: {
      snowballLend: snowballLend.address,
      adaptiveCurveIRM: irm.address,
    },
    tokens: {
      wCTC: SNOWBALL_TOKENS.wCTC,
      lstCTC: SNOWBALL_TOKENS.lstCTC,
      sbUSD: SNOWBALL_TOKENS.sbUSD,
      mockUSDC: mockUSDC.address,
    },
    vaults: {
      snowballVaultFactory: vaultFactory.address,
      publicAllocator: publicAllocator.address,
    },
    oracles: {
      wCTCOracle: wCTCOracle.address,
      lstCTCOracle: lstCTCOracle.address,
      sbUSDOracle: sbUSDOracle.address,
    },
    markets: {
      "wCTC/sbUSD": { loanToken: "sbUSD", collateralToken: "wCTC", oracle: wCTCOracle.address, irm: irm.address, lltv: "0.77" },
      "lstCTC/sbUSD": { loanToken: "sbUSD", collateralToken: "lstCTC", oracle: lstCTCOracle.address, irm: irm.address, lltv: "0.80" },
      "sbUSD/USDC": { loanToken: "USDC", collateralToken: "sbUSD", oracle: sbUSDOracle.address, irm: irm.address, lltv: "0.86" },
    },
  };

  const outPath = path.join(__dirname, "../../../deployments/creditcoin-testnet/morpho.json");
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(addresses, null, 2));

  console.log("\nSnowball Lend deployment complete!");
  console.log(`  Saved to: ${outPath}`);
  console.log(JSON.stringify(addresses, null, 2));
}

main().then(() => process.exit(0)).catch((err) => {
  console.error("\nDeployment failed:", err.message || err);
  process.exit(1);
});
