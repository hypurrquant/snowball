/**
 * Snowball Protocol — Full Redeployment Script
 *
 * Deploys ALL protocol contracts in correct dependency order:
 *   Tokens → Oracle → Adapters → Morpho → InterestRouter → Liquity → Router
 *
 * Liquity V2 uses nonce-based address pre-computation because contracts
 * read the AddressesRegistry in their constructors.
 *
 * Usage: npx tsx scripts/deploy-all.ts
 */
import {
  createPublicClient,
  createWalletClient,
  http,
  parseEther,
  formatEther,
  keccak256,
  toBytes,
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

// ─── Artifact loader (multi-package) ───
function loadArtifact(pkg: string, contractName: string, fileName?: string): { abi: Abi; bytecode: `0x${string}` } {
  const file = fileName || contractName;
  const p = path.join(__dirname, `../../${pkg}/out/${file}.sol/${contractName}.json`);
  if (fs.existsSync(p)) {
    const artifact = JSON.parse(fs.readFileSync(p, "utf8"));
    const bytecode = artifact.bytecode?.object ?? artifact.bytecode;
    return { abi: artifact.abi, bytecode: bytecode as `0x${string}` };
  }
  throw new Error(`Artifact not found: ${pkg}/out/${file}.sol/${contractName}.json`);
}

// ─── Clients ───
const PRIVATE_KEY = process.env.DEPLOYER_PRIVATE_KEY || process.env.ADMIN_PRIVATE_KEY;
if (!PRIVATE_KEY) { console.error("Set DEPLOYER_PRIVATE_KEY in .env"); process.exit(1); }

const account = privateKeyToAccount(PRIVATE_KEY as `0x${string}`);
const publicClient = createPublicClient({ chain: creditcoinTestnet as any, transport: http() });
const walletClient = createWalletClient({ account, chain: creditcoinTestnet as any, transport: http() });

const ZERO = "0x0000000000000000000000000000000000000000" as Address;

async function deploy(pkg: string, name: string, args: any[] = [], fileName?: string, gas = 10_000_000n): Promise<{ address: Address; abi: Abi }> {
  const { abi, bytecode } = loadArtifact(pkg, name, fileName);
  const hash = await walletClient.deployContract({ abi, bytecode, args, gas });
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  if (receipt.status !== "success") throw new Error(`Deploy ${name} failed`);
  console.log(`  ${name}: ${receipt.contractAddress}`);
  return { address: receipt.contractAddress!, abi };
}

async function send(address: Address, abi: Abi, fn: string, args: any[] = []): Promise<Hash> {
  const hash = await walletClient.writeContract({ address, abi, functionName: fn, args, gas: 5_000_000n });
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  if (receipt.status !== "success") throw new Error(`TX ${fn} failed`);
  return hash;
}

function computeAddr(nonce: number): Address {
  return getContractAddress({ from: account.address, nonce: BigInt(nonce) });
}

// ─── Main ───
async function main() {
  const balance = await publicClient.getBalance({ address: account.address });
  console.log(`Deployer: ${account.address}`);
  console.log(`Balance: ${formatEther(balance)} tCTC\n`);

  const OPERATOR = (process.env.OPERATOR_ADDRESS || account.address) as Address;
  const TREASURY = (process.env.TREASURY_ADDRESS || account.address) as Address;

  // ═══════════════════════════════════════════════════════════════
  // PHASE 1: Tokens
  // ═══════════════════════════════════════════════════════════════
  console.log("═══ Phase 1: Tokens ═══");
  const wCTC = await deploy("liquity", "MockWCTC");
  const lstCTC = await deploy("liquity", "MockLstCTC");
  const sbUSD = await deploy("liquity", "SbUSDToken", [account.address]);
  const mockUSDC = await deploy("morpho", "ERC20Mock", ["USD Coin", "USDC"]);

  // ═══════════════════════════════════════════════════════════════
  // PHASE 2: SnowballOracle + Price Setup
  // ═══════════════════════════════════════════════════════════════
  console.log("\n═══ Phase 2: SnowballOracle ═══");
  const oracle = await deploy("integration", "SnowballOracle", [account.address]);

  const OPERATOR_ROLE = keccak256(toBytes("OPERATOR_ROLE"));
  if (OPERATOR.toLowerCase() !== account.address.toLowerCase()) {
    await send(oracle.address, oracle.abi, "grantRole", [OPERATOR_ROLE, OPERATOR]);
    console.log(`  OPERATOR_ROLE → ${OPERATOR}`);
  }

  await send(oracle.address, oracle.abi, "updatePrice", [wCTC.address, parseEther("0.2")]);
  await send(oracle.address, oracle.abi, "updatePrice", [lstCTC.address, parseEther("0.2")]);
  await send(oracle.address, oracle.abi, "updatePrice", [sbUSD.address, parseEther("1")]);
  console.log("  Prices set: wCTC=$0.20, lstCTC=$0.20, sbUSD=$1.00");

  // ═══════════════════════════════════════════════════════════════
  // PHASE 3: Oracle Adapters
  // ═══════════════════════════════════════════════════════════════
  console.log("\n═══ Phase 3: Oracle Adapters ═══");
  const MAX_AGE = 120n;

  const liqAdapterWCTC = await deploy("integration", "LiquityPriceFeedAdapter",
    [oracle.address, wCTC.address, MAX_AGE]);
  const liqAdapterLstCTC = await deploy("integration", "LiquityPriceFeedAdapter",
    [oracle.address, lstCTC.address, MAX_AGE]);

  const morphoAdapterWCTC = await deploy("integration", "MorphoOracleAdapter",
    [oracle.address, wCTC.address, MAX_AGE]);
  const morphoAdapterLstCTC = await deploy("integration", "MorphoOracleAdapter",
    [oracle.address, lstCTC.address, MAX_AGE]);
  const morphoAdapterSbUSD = await deploy("integration", "MorphoOracleAdapter",
    [oracle.address, sbUSD.address, MAX_AGE]);

  // ═══════════════════════════════════════════════════════════════
  // PHASE 4: Morpho Blue
  // ═══════════════════════════════════════════════════════════════
  console.log("\n═══ Phase 4: Morpho Blue ═══");
  const morpho = await deploy("morpho", "Morpho", [account.address]);
  const irm = await deploy("morpho", "AdaptiveCurveIrm", [morpho.address]);

  await send(morpho.address, morpho.abi, "enableIrm", [irm.address]);
  const LLTV_77 = parseEther("0.77");
  const LLTV_80 = parseEther("0.80");
  const LLTV_86 = parseEther("0.86");
  await send(morpho.address, morpho.abi, "enableLltv", [LLTV_77]);
  await send(morpho.address, morpho.abi, "enableLltv", [LLTV_80]);
  await send(morpho.address, morpho.abi, "enableLltv", [LLTV_86]);
  console.log("  IRM + LLTVs enabled");

  // Create markets
  await send(morpho.address, morpho.abi, "createMarket", [
    [sbUSD.address, wCTC.address, morphoAdapterWCTC.address, irm.address, LLTV_77]
  ]);
  console.log("  Market wCTC/sbUSD (77%)");

  await send(morpho.address, morpho.abi, "createMarket", [
    [sbUSD.address, lstCTC.address, morphoAdapterLstCTC.address, irm.address, LLTV_80]
  ]);
  console.log("  Market lstCTC/sbUSD (80%)");

  await send(morpho.address, morpho.abi, "createMarket", [
    [mockUSDC.address, sbUSD.address, morphoAdapterSbUSD.address, irm.address, LLTV_86]
  ]);
  console.log("  Market sbUSD/USDC (86%)");

  let vaultFactory: { address: Address; abi: Abi } | null = null;
  try {
    vaultFactory = await deploy("morpho", "MetaMorphoFactory", [morpho.address], undefined, 30_000_000n);
  } catch (e: any) {
    console.log(`  MetaMorphoFactory skipped (${e.message?.slice(0, 60)})`);
  }

  // ═══════════════════════════════════════════════════════════════
  // PHASE 5: SnowballInterestRouter
  // ═══════════════════════════════════════════════════════════════
  console.log("\n═══ Phase 5: InterestRouter ═══");
  const interestRouter = await deploy("integration", "SnowballInterestRouter", [
    sbUSD.address, morpho.address, TREASURY, 7000n, parseEther("100"),
  ]);
  console.log("  Split: 70% Morpho / 30% Treasury");

  // ═══════════════════════════════════════════════════════════════
  // PHASE 6: Liquity V2 — Pre-compute & Deploy
  // ═══════════════════════════════════════════════════════════════
  console.log("\n═══ Phase 6: Liquity V2 Branches ═══");

  // Get current nonce for address pre-computation
  const baseNonce = await publicClient.getTransactionCount({ address: account.address });
  console.log(`  Base nonce: ${baseNonce}`);

  // Pre-compute ALL addresses in the deployment sequence:
  //
  // Nonce layout (from baseNonce):
  //   +0   AR_0 deploy
  //   +1   AR_0.setAddresses tx
  //   +2   BorrowerOps_0
  //   +3   TroveManager_0
  //   +4   StabilityPool_0
  //   +5   ActivePool_0
  //   +6   DefaultPool_0
  //   +7   CollSurplusPool_0
  //   +8   SortedTroves_0
  //   +9   GasPool_0
  //   +10  TroveNFT_0
  //   +11  AR_1 deploy
  //   +12  AR_1.setAddresses tx
  //   +13  BorrowerOps_1
  //   +14  TroveManager_1
  //   +15  StabilityPool_1
  //   +16  ActivePool_1
  //   +17  DefaultPool_1
  //   +18  CollSurplusPool_1
  //   +19  SortedTroves_1
  //   +20  GasPool_1
  //   +21  TroveNFT_1
  //   +22  CollateralRegistry
  //   +23  HintHelpers
  //   +24  MultiTroveGetter

  const pre = {
    // Branch 0 (wCTC)
    bo0:  computeAddr(baseNonce + 2),
    tm0:  computeAddr(baseNonce + 3),
    sp0:  computeAddr(baseNonce + 4),
    ap0:  computeAddr(baseNonce + 5),
    dp0:  computeAddr(baseNonce + 6),
    csp0: computeAddr(baseNonce + 7),
    st0:  computeAddr(baseNonce + 8),
    gp0:  computeAddr(baseNonce + 9),
    nft0: computeAddr(baseNonce + 10),
    // Branch 1 (lstCTC)
    bo1:  computeAddr(baseNonce + 13),
    tm1:  computeAddr(baseNonce + 14),
    sp1:  computeAddr(baseNonce + 15),
    ap1:  computeAddr(baseNonce + 16),
    dp1:  computeAddr(baseNonce + 17),
    csp1: computeAddr(baseNonce + 18),
    st1:  computeAddr(baseNonce + 19),
    gp1:  computeAddr(baseNonce + 20),
    nft1: computeAddr(baseNonce + 21),
    // Shared
    cr:   computeAddr(baseNonce + 22),
    hh:   computeAddr(baseNonce + 23),
    mtg:  computeAddr(baseNonce + 24),
  };

  console.log("  Pre-computed addresses:");
  console.log(`    BorrowerOps_0: ${pre.bo0}`);
  console.log(`    TroveManager_0: ${pre.tm0}`);
  console.log(`    CollateralRegistry: ${pre.cr}`);

  // Helper to build the AddressVars struct (18 fields)
  function makeAddressVars(
    collToken: Address, priceFeed: Address,
    bo: Address, tm: Address, sp: Address, ap: Address,
    dp: Address, csp: Address, st: Address, gp: Address, nft: Address,
  ) {
    return [[
      collToken,                    // collToken
      bo,                           // borrowerOperations
      tm,                           // troveManager
      nft,                          // troveNFT
      ZERO,                         // metadataNFT (unused, cosmetic only)
      sp,                           // stabilityPool
      priceFeed,                    // priceFeed
      ap,                           // activePool
      dp,                           // defaultPool
      gp,                           // gasPoolAddress
      csp,                          // collSurplusPool
      st,                           // sortedTroves
      interestRouter.address,       // interestRouter
      pre.hh,                       // hintHelpers
      pre.mtg,                      // multiTroveGetter
      pre.cr,                       // collateralRegistry
      sbUSD.address,                // sbUSDToken
      wCTC.address,                 // WETH (use wCTC as wrapped native)
    ]];
  }

  // --- Branch 0 (wCTC) — MCR 110%, CCR 150% ---
  console.log("\n--- Branch 0 (wCTC) ---");
  const ar0 = await deploy("liquity", "AddressesRegistry", [
    account.address,    // owner
    parseEther("1.5"),  // CCR
    parseEther("1.1"),  // MCR
    parseEther("0.1"),  // BCR
    parseEther("1.1"),  // SCR
    parseEther("0.05"), // LIQUIDATION_PENALTY_SP
    parseEther("0.1"),  // LIQUIDATION_PENALTY_REDISTRIBUTION
  ]);

  await send(ar0.address, ar0.abi, "setAddresses",
    makeAddressVars(
      wCTC.address, liqAdapterWCTC.address,
      pre.bo0, pre.tm0, pre.sp0, pre.ap0,
      pre.dp0, pre.csp0, pre.st0, pre.gp0, pre.nft0,
    )
  );
  console.log("  AddressesRegistry wired (ownership renounced)");

  // Deploy in EXACT nonce order
  const bo0  = await deploy("liquity", "BorrowerOperations", [ar0.address]);
  const tm0  = await deploy("liquity", "TroveManager", [ar0.address]);
  const sp0  = await deploy("liquity", "StabilityPool", [ar0.address]);
  const ap0  = await deploy("liquity", "ActivePool", [ar0.address]);
  const dp0  = await deploy("liquity", "DefaultPool", [ar0.address]);
  const csp0 = await deploy("liquity", "CollSurplusPool", [ar0.address]);
  const st0  = await deploy("liquity", "SortedTroves", [ar0.address]);
  const gp0  = await deploy("liquity", "GasPool", [ar0.address]);
  const nft0 = await deploy("liquity", "TroveNFT", [ar0.address]);

  // Verify address match
  if (bo0.address.toLowerCase() !== pre.bo0.toLowerCase()) {
    throw new Error(`Nonce mismatch! Expected ${pre.bo0}, got ${bo0.address}`);
  }
  console.log("  Branch 0 nonce verification: OK");

  // --- Branch 1 (lstCTC) — MCR 120%, CCR 160% ---
  console.log("\n--- Branch 1 (lstCTC) ---");
  const ar1 = await deploy("liquity", "AddressesRegistry", [
    account.address,
    parseEther("1.6"),  // CCR
    parseEther("1.2"),  // MCR
    parseEther("0.1"),  // BCR
    parseEther("1.2"),  // SCR
    parseEther("0.05"),
    parseEther("0.1"),
  ]);

  await send(ar1.address, ar1.abi, "setAddresses",
    makeAddressVars(
      lstCTC.address, liqAdapterLstCTC.address,
      pre.bo1, pre.tm1, pre.sp1, pre.ap1,
      pre.dp1, pre.csp1, pre.st1, pre.gp1, pre.nft1,
    )
  );
  console.log("  AddressesRegistry wired (ownership renounced)");

  const bo1  = await deploy("liquity", "BorrowerOperations", [ar1.address]);
  const tm1  = await deploy("liquity", "TroveManager", [ar1.address]);
  const sp1  = await deploy("liquity", "StabilityPool", [ar1.address]);
  const ap1  = await deploy("liquity", "ActivePool", [ar1.address]);
  const dp1  = await deploy("liquity", "DefaultPool", [ar1.address]);
  const csp1 = await deploy("liquity", "CollSurplusPool", [ar1.address]);
  const st1  = await deploy("liquity", "SortedTroves", [ar1.address]);
  const gp1  = await deploy("liquity", "GasPool", [ar1.address]);
  const nft1 = await deploy("liquity", "TroveNFT", [ar1.address]);

  if (bo1.address.toLowerCase() !== pre.bo1.toLowerCase()) {
    throw new Error(`Nonce mismatch! Expected ${pre.bo1}, got ${bo1.address}`);
  }
  console.log("  Branch 1 nonce verification: OK");

  // --- Shared contracts ---
  console.log("\n--- Shared Contracts ---");
  const cr = await deploy("liquity", "CollateralRegistry", [
    sbUSD.address,
    [wCTC.address, lstCTC.address],
    [tm0.address, tm1.address],
  ]);
  const hh = await deploy("liquity", "HintHelpers", [cr.address]);
  const mtg = await deploy("liquity", "MultiTroveGetter", [cr.address]);

  if (cr.address.toLowerCase() !== pre.cr.toLowerCase()) {
    throw new Error(`CR nonce mismatch! Expected ${pre.cr}, got ${cr.address}`);
  }
  console.log("  Shared contract nonce verification: OK");

  // ═══════════════════════════════════════════════════════════════
  // PHASE 7: Wire sbUSD + Helpers
  // ═══════════════════════════════════════════════════════════════
  console.log("\n═══ Phase 7: Wire sbUSD ═══");
  await send(sbUSD.address, sbUSD.abi, "setBranchAddresses", [
    tm0.address, sp0.address, bo0.address, ap0.address,
  ]);
  console.log("  sbUSD → Branch 0");

  await send(sbUSD.address, sbUSD.abi, "setBranchAddresses", [
    tm1.address, sp1.address, bo1.address, ap1.address,
  ]);
  console.log("  sbUSD → Branch 1");

  await send(sbUSD.address, sbUSD.abi, "setCollateralRegistry", [cr.address]);
  console.log("  sbUSD → CollateralRegistry");

  let redemptionHelper: { address: Address; abi: Abi } | null = null;
  try {
    redemptionHelper = await deploy("liquity", "RedemptionHelper", [
      cr.address, [ar0.address, ar1.address],
    ]);
  } catch (e: any) {
    console.log(`  RedemptionHelper skipped (${e.message?.slice(0, 60)})`);
  }

  let agentVault: { address: Address; abi: Abi } | null = null;
  try {
    agentVault = await deploy("liquity", "AgentVault");
  } catch (e: any) {
    console.log(`  AgentVault skipped (${e.message?.slice(0, 60)})`);
  }

  // ═══════════════════════════════════════════════════════════════
  // PHASE 8: SnowballRouter
  // ═══════════════════════════════════════════════════════════════
  console.log("\n═══ Phase 8: SnowballRouter ═══");
  const router = await deploy("integration", "SnowballRouter");

  await send(router.address, router.abi, "setWhitelist", [bo0.address, true]);
  await send(router.address, router.abi, "setWhitelist", [bo1.address, true]);
  await send(router.address, router.abi, "setWhitelist", [morpho.address, true]);
  console.log("  Whitelisted: BorrowerOps(wCTC, lstCTC), Morpho");

  // ═══════════════════════════════════════════════════════════════
  // PHASE 9: Mint initial tokens
  // ═══════════════════════════════════════════════════════════════
  console.log("\n═══ Phase 9: Mint tokens ═══");
  try {
    const FAUCET_AMOUNT = parseEther("100000");
    const FAUCET_CALLS = 10;
    for (let i = 0; i < FAUCET_CALLS; i++) {
      await send(wCTC.address, wCTC.abi, "faucet", [FAUCET_AMOUNT]);
      await send(lstCTC.address, lstCTC.abi, "faucet", [FAUCET_AMOUNT]);
      console.log(`  Faucet call ${i + 1}/${FAUCET_CALLS}: 100K wCTC + 100K lstCTC`);
    }
    console.log("  1M wCTC + 1M lstCTC minted (100K × 10)");
  } catch (e: any) {
    console.log(`  Token minting skipped (${e.message?.slice(0, 60)})`);
  }

  // ═══════════════════════════════════════════════════════════════
  // PHASE 10: Save deployment addresses
  // ═══════════════════════════════════════════════════════════════
  const deployDir = path.join(__dirname, "../../../deployments/creditcoin-testnet");
  fs.mkdirSync(deployDir, { recursive: true });

  const integrationAddrs = {
    network: { name: "Creditcoin Testnet", chainId: 102031 },
    oracle: {
      snowballOracle: oracle.address,
      operator: OPERATOR,
      liquityAdapters: { wCTC: liqAdapterWCTC.address, lstCTC: liqAdapterLstCTC.address },
      morphoAdapters: { wCTC: morphoAdapterWCTC.address, lstCTC: morphoAdapterLstCTC.address, sbUSD: morphoAdapterSbUSD.address },
    },
    interestRouter: {
      address: interestRouter.address,
      morphoTarget: morpho.address,
      treasury: TREASURY,
      morphoSplitBps: 7000,
    },
    router: {
      address: router.address,
      whitelisted: { borrowerOps_wCTC: bo0.address, borrowerOps_lstCTC: bo1.address, morpho: morpho.address },
    },
  };

  const liquityAddrs = {
    network: { name: "Creditcoin Testnet", chainId: 102031, rpc: "https://rpc.cc3-testnet.creditcoin.network", explorer: "https://creditcoin-testnet.blockscout.com" },
    tokens: { wCTC: wCTC.address, lstCTC: lstCTC.address, sbUSD: sbUSD.address },
    branches: {
      wCTC: {
        addressesRegistry: ar0.address, borrowerOperations: bo0.address, troveManager: tm0.address,
        stabilityPool: sp0.address, activePool: ap0.address, defaultPool: dp0.address,
        gasPool: gp0.address, collSurplusPool: csp0.address, sortedTroves: st0.address,
        troveNFT: nft0.address, priceFeed: liqAdapterWCTC.address, interestRouter: interestRouter.address,
      },
      lstCTC: {
        addressesRegistry: ar1.address, borrowerOperations: bo1.address, troveManager: tm1.address,
        stabilityPool: sp1.address, activePool: ap1.address, defaultPool: dp1.address,
        gasPool: gp1.address, collSurplusPool: csp1.address, sortedTroves: st1.address,
        troveNFT: nft1.address, priceFeed: liqAdapterLstCTC.address, interestRouter: interestRouter.address,
      },
    },
    shared: {
      collateralRegistry: cr.address, hintHelpers: hh.address, multiTroveGetter: mtg.address,
      redemptionHelper: redemptionHelper?.address || ZERO, agentVault: agentVault?.address || ZERO,
    },
  };

  const morphoAddrs = {
    network: { name: "Creditcoin Testnet", chainId: 102031 },
    core: { morpho: morpho.address, adaptiveCurveIRM: irm.address },
    tokens: { wCTC: wCTC.address, lstCTC: lstCTC.address, sbUSD: sbUSD.address, mockUSDC: mockUSDC.address },
    vaults: { metaMorphoFactory: vaultFactory?.address || ZERO },
    oracles: { wCTC: morphoAdapterWCTC.address, lstCTC: morphoAdapterLstCTC.address, sbUSD: morphoAdapterSbUSD.address },
    markets: {
      "wCTC/sbUSD": { loanToken: "sbUSD", collateralToken: "wCTC", oracle: morphoAdapterWCTC.address, irm: irm.address, lltv: "0.77" },
      "lstCTC/sbUSD": { loanToken: "sbUSD", collateralToken: "lstCTC", oracle: morphoAdapterLstCTC.address, irm: irm.address, lltv: "0.80" },
      "sbUSD/USDC": { loanToken: "USDC", collateralToken: "sbUSD", oracle: morphoAdapterSbUSD.address, irm: irm.address, lltv: "0.86" },
    },
  };

  fs.writeFileSync(path.join(deployDir, "integration.json"), JSON.stringify(integrationAddrs, null, 2));
  fs.writeFileSync(path.join(deployDir, "liquity.json"), JSON.stringify(liquityAddrs, null, 2));
  fs.writeFileSync(path.join(deployDir, "morpho.json"), JSON.stringify(morphoAddrs, null, 2));

  console.log("\n════════════════════════════════════════════");
  console.log("  DEPLOYMENT COMPLETE");
  console.log("════════════════════════════════════════════");
  console.log(`  Tokens:      wCTC=${wCTC.address}`);
  console.log(`               lstCTC=${lstCTC.address}`);
  console.log(`               sbUSD=${sbUSD.address}`);
  console.log(`  Oracle:      ${oracle.address}`);
  console.log(`  Morpho:      ${morpho.address}`);
  console.log(`  InterestRouter: ${interestRouter.address}`);
  console.log(`  Liquity wCTC:   BorrowerOps=${bo0.address}`);
  console.log(`  Liquity lstCTC: BorrowerOps=${bo1.address}`);
  console.log(`  Router:      ${router.address}`);
  console.log(`\n  Saved to: ${deployDir}/`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => { console.error("\nDEPLOYMENT FAILED:", err.message || err); process.exit(1); });
