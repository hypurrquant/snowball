/**
 * Viem-based deploy script for Snowball Liquity V2 contracts.
 * Avoids ethers v6 nonce race conditions on Creditcoin Testnet.
 *
 * Usage: npx tsx scripts/deploy-viem.ts
 */
import {
  createPublicClient,
  createWalletClient,
  http,
  parseEther,
  formatEther,
  getContractAddress,
  type Address,
  type Abi,
  type Hash,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import * as fs from "fs";
import * as path from "path";
import * as dotenv from "dotenv";

dotenv.config({ path: path.join(__dirname, "../../../.env") });
dotenv.config();

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
  const dirs = ["core", "mocks"];
  for (const dir of dirs) {
    const p = path.join(
      __dirname,
      `../artifacts/contracts/${dir}/${contractName}.sol/${contractName}.json`
    );
    if (fs.existsSync(p)) {
      const artifact = JSON.parse(fs.readFileSync(p, "utf8"));
      return { abi: artifact.abi, bytecode: artifact.bytecode as `0x${string}` };
    }
  }
  throw new Error(`Artifact not found: ${contractName}`);
}

async function deploy(
  name: string,
  args: any[] = []
): Promise<{ address: Address; abi: Abi }> {
  const { abi, bytecode } = loadArtifact(name);
  const hash = await walletClient.deployContract({
    abi,
    bytecode,
    args,
  });
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  if (receipt.status !== "success") throw new Error(`Deploy ${name} failed`);
  const address = receipt.contractAddress!;
  console.log(`  ${name}: ${address}`);
  return { address, abi };
}

async function send(
  address: Address,
  abi: Abi,
  functionName: string,
  args: any[] = []
): Promise<Hash> {
  const hash = await walletClient.writeContract({
    address,
    abi,
    functionName,
    args,
    gas: 3_000_000n,
  });
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  if (receipt.status !== "success") {
    throw new Error(`TX ${functionName} on ${address} reverted (${hash})`);
  }
  return hash;
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

// ─── Main ───
interface BranchAddresses {
  addressesRegistry: string;
  borrowerOperations: string;
  troveManager: string;
  stabilityPool: string;
  activePool: string;
  defaultPool: string;
  gasPool: string;
  collSurplusPool: string;
  sortedTroves: string;
  troveNFT: string;
  priceFeed: string;
}

async function deployBranch(
  collTokenAddr: Address,
  priceFeedAddr: Address,
  sbUSDAddr: Address,
  mcr: bigint,
  ccr: bigint,
  label: string
): Promise<BranchAddresses> {
  console.log(`\n--- Deploying ${label} branch ---`);

  // 1. Deploy all contracts
  const ar = await deploy("AddressesRegistry", [mcr, ccr]);
  const tm = await deploy("TroveManager");
  const bo = await deploy("BorrowerOperations");
  const sp = await deploy("StabilityPool");
  const ap = await deploy("ActivePool");
  const dp = await deploy("DefaultPool");
  const gp = await deploy("GasPool");
  const csp = await deploy("CollSurplusPool");
  const st = await deploy("SortedTroves");
  const nft = await deploy("TroveNFT");

  // 2. Wire AddressesRegistry
  console.log(`  Wiring AddressesRegistry (${label})...`);
  await send(ar.address, ar.abi, "setAddresses", [
    bo.address, tm.address, sp.address, ap.address,
    dp.address, gp.address, csp.address, st.address,
    nft.address, priceFeedAddr, sbUSDAddr, collTokenAddr,
  ]);
  console.log(`  AddressesRegistry wired ✓`);

  // 3. Initialize via addressesRegistry (sequential, each waits for mine)
  console.log(`  Initializing contracts (${label})...`);
  await send(tm.address, tm.abi, "setAddressesRegistry", [ar.address]);
  console.log(`    TroveManager ✓`);
  await send(bo.address, bo.abi, "setAddressesRegistry", [ar.address]);
  console.log(`    BorrowerOperations ✓`);
  await send(sp.address, sp.abi, "setAddressesRegistry", [ar.address]);
  console.log(`    StabilityPool ✓`);
  await send(ap.address, ap.abi, "setAddressesRegistry", [ar.address]);
  console.log(`    ActivePool ✓`);
  await send(st.address, st.abi, "setAddressesRegistry", [ar.address]);
  console.log(`    SortedTroves ✓`);

  // 4. Set direct addresses
  console.log(`  Setting direct addresses (${label})...`);
  await send(ap.address, ap.abi, "setAddresses", [
    bo.address, tm.address, sp.address, dp.address, collTokenAddr,
  ]);
  await send(dp.address, dp.abi, "setAddresses", [
    tm.address, ap.address, collTokenAddr,
  ]);
  await send(csp.address, csp.abi, "setAddresses", [
    bo.address, tm.address, collTokenAddr,
  ]);
  await send(st.address, st.abi, "setAddresses", [tm.address, bo.address]);
  await send(nft.address, nft.abi, "setAddresses", [tm.address, bo.address]);
  await send(sp.address, sp.abi, "setAddresses", [
    sbUSDAddr, collTokenAddr, tm.address, ap.address,
  ]);
  console.log(`  All contracts wired ✓ (${label})`);

  // 5. Verify initialization
  const mcrValue = await publicClient.readContract({
    address: bo.address,
    abi: bo.abi,
    functionName: "MCR",
  }) as bigint;
  console.log(`  Verified BorrowerOps MCR: ${formatEther(mcrValue)}`);

  return {
    addressesRegistry: ar.address,
    borrowerOperations: bo.address,
    troveManager: tm.address,
    stabilityPool: sp.address,
    activePool: ap.address,
    defaultPool: dp.address,
    gasPool: gp.address,
    collSurplusPool: csp.address,
    sortedTroves: st.address,
    troveNFT: nft.address,
    priceFeed: priceFeedAddr,
  };
}

async function main() {
  const balance = await publicClient.getBalance({ address: account.address });
  console.log(`Deploying with: ${account.address}`);
  console.log(`Balance: ${formatEther(balance)} tCTC\n`);

  // ==================== Phase 1: Mock Tokens & Oracles ====================
  console.log("=== Phase 1: Mock Tokens & Oracles ===");
  const wCTC = await deploy("MockWCTC");
  const lstCTC = await deploy("MockLstCTC");
  const pfWCTC = await deploy("MockPriceFeed", [parseEther("0.2")]);
  const pfLstCTC = await deploy("MockPriceFeed", [parseEther("0.2")]);

  // ==================== Phase 2: SbUSD Token ====================
  console.log("\n=== Phase 2: SbUSD Token ===");
  const sbUSD = await deploy("SbUSDToken");

  // ==================== Phase 3-4: Branches ====================
  console.log("\n=== Phase 3: Branch 0 (wCTC) — MCR 110%, CCR 150% ===");
  const branch0 = await deployBranch(
    wCTC.address, pfWCTC.address, sbUSD.address,
    parseEther("1.1"), parseEther("1.5"), "wCTC"
  );

  console.log("\n=== Phase 4: Branch 1 (lstCTC) — MCR 120%, CCR 160% ===");
  const branch1 = await deployBranch(
    lstCTC.address, pfLstCTC.address, sbUSD.address,
    parseEther("1.2"), parseEther("1.6"), "lstCTC"
  );

  // ==================== Phase 5: Wire sbUSD ====================
  console.log("\n=== Phase 5: Wire sbUSD ===");
  await send(sbUSD.address, sbUSD.abi, "setBranchAddresses", [
    branch0.troveManager as Address,
    branch0.stabilityPool as Address,
    branch0.borrowerOperations as Address,
    branch0.activePool as Address,
  ]);
  console.log("  sbUSD wired to Branch 0 ✓");

  await send(sbUSD.address, sbUSD.abi, "setBranchAddresses", [
    branch1.troveManager as Address,
    branch1.stabilityPool as Address,
    branch1.borrowerOperations as Address,
    branch1.activePool as Address,
  ]);
  console.log("  sbUSD wired to Branch 1 ✓");

  // ==================== Phase 6: Collateral Registry ====================
  console.log("\n=== Phase 6: Collateral Registry ===");
  const cr = await deploy("CollateralRegistry", [sbUSD.address]);
  await send(cr.address, cr.abi, "addBranch", [
    wCTC.address, branch0.troveManager as Address,
    branch0.borrowerOperations as Address, branch0.stabilityPool as Address,
    branch0.activePool as Address, pfWCTC.address,
  ]);
  console.log("  Branch 0 (wCTC) added ✓");

  await send(cr.address, cr.abi, "addBranch", [
    lstCTC.address, branch1.troveManager as Address,
    branch1.borrowerOperations as Address, branch1.stabilityPool as Address,
    branch1.activePool as Address, pfLstCTC.address,
  ]);
  console.log("  Branch 1 (lstCTC) added ✓");

  await send(sbUSD.address, sbUSD.abi, "setCollateralRegistry", [cr.address]);
  console.log("  sbUSD CollateralRegistry set ✓");

  // ==================== Phase 7: Helpers ====================
  console.log("\n=== Phase 7: Helpers ===");
  const hh = await deploy("HintHelpers", [cr.address]);
  const mtg = await deploy("MultiTroveGetter", [cr.address]);

  // ==================== Phase 7.5: AgentVault ====================
  console.log("\n=== Phase 7.5: AgentVault ===");
  const agentVault = await deploy("AgentVault");

  // ==================== Phase 7.6: SmartAccountFactory ====================
  console.log("\n=== Phase 7.6: SmartAccountFactory ===");
  const smartAccountFactory = await deploy("SmartAccountFactory");

  // ==================== Phase 8: Mint initial tokens ====================
  console.log("\n=== Phase 8: Mint initial tokens ===");
  await send(wCTC.address, wCTC.abi, "mint", [
    account.address, parseEther("1000000"),
  ]);
  console.log("  Minted 1,000,000 wCTC ✓");

  await send(lstCTC.address, lstCTC.abi, "mint", [
    account.address, parseEther("1000000"),
  ]);
  console.log("  Minted 1,000,000 lstCTC ✓");

  // ==================== Phase 9: Save Addresses ====================
  const addresses = {
    network: {
      name: "Creditcoin Testnet",
      chainId: 102031,
      rpc: "https://rpc.cc3-testnet.creditcoin.network",
      explorer: "https://creditcoin-testnet.blockscout.com",
    },
    tokens: {
      wCTC: wCTC.address,
      lstCTC: lstCTC.address,
      sbUSD: sbUSD.address,
    },
    branches: { wCTC: branch0, lstCTC: branch1 },
    shared: {
      collateralRegistry: cr.address,
      hintHelpers: hh.address,
      multiTroveGetter: mtg.address,
      agentVault: agentVault.address,
      smartAccountFactory: smartAccountFactory.address,
    },
  };

  // Save to contracts-liquity/deployments/
  const localPath = path.join(__dirname, "../deployments/addresses-102031.json");
  fs.mkdirSync(path.dirname(localPath), { recursive: true });
  fs.writeFileSync(localPath, JSON.stringify(addresses, null, 2));

  // Save to root deployments/ (unified file with erc8004)
  const rootPath = path.join(__dirname, "../../../deployments/addresses.json");
  let unified: any = addresses;
  // Preserve existing erc8004 addresses if present
  try {
    const existing = JSON.parse(fs.readFileSync(rootPath, "utf8"));
    if (existing.erc8004) {
      unified = { ...addresses, erc8004: existing.erc8004 };
    }
  } catch {}
  fs.mkdirSync(path.dirname(rootPath), { recursive: true });
  fs.writeFileSync(rootPath, JSON.stringify(unified, null, 2));

  console.log("\n✅ Deployment complete!");
  console.log(`  Local:  ${localPath}`);
  console.log(`  Root:   ${rootPath}`);
  console.log(JSON.stringify(addresses, null, 2));
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("\n❌ Deployment failed:", err.message || err);
    process.exit(1);
  });
