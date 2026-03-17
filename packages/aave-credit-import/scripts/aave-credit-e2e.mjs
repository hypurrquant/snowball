/**
 * Aave Credit Import E2E Script
 *
 * Imports Aave V3 credit history from Sepolia to Creditcoin via USC proof,
 * then records it in ERC-8004 ReputationRegistry.
 *
 * Usage:
 *   node scripts/aave-credit-e2e.mjs                   → Full Aave cycle (supply + repay) then import
 *   node scripts/aave-credit-e2e.mjs <tx-hash>         → Import from existing Aave tx
 *   node scripts/aave-credit-e2e.mjs --deploy           → Deploy contracts only
 */

import { ethers } from "ethers";
import { config } from "dotenv";
config({ path: "../../.env" });

// ============ Config ============

const SEPOLIA_RPC = "https://1rpc.io/sepolia";
const USC_RPC = "https://rpc.usc-testnet2.creditcoin.network";
const PROOF_API = "https://proof-gen-api.usc-testnet2.creditcoin.network";

const SEPOLIA_CHAIN_KEY = 1;

// Aave V3 Sepolia addresses
const AAVE_POOL = "0x6Ae43d3271ff6888e7Fc43Fd7321a503ff738951";
const AAVE_USDC = "0x94a9D9AC8a22534E3FaCa9F4e7F2E2cf85d5E4C8";

// USC Precompiles
const CHAIN_INFO = "0x0000000000000000000000000000000000000fd3";
const VERIFIER = "0x0000000000000000000000000000000000000FD2";

// USC contract addresses (from env or --deploy)
let IMPORTER_ADDRESS = process.env.AAVE_CREDIT_IMPORTER || "";
let REPUTATION_REGISTRY = process.env.USC_REPUTATION_REGISTRY || "";
let IDENTITY_REGISTRY = process.env.USC_IDENTITY_REGISTRY || "";
let AGENT_ID = process.env.AAVE_AGENT_ID ? Number(process.env.AAVE_AGENT_ID) : 0;

// ============ ABIs ============

const chainInfoAbi = [
  "function get_latest_attestation_height_and_hash(uint64) view returns (uint64,bytes32,bool,bool)",
];

const verifierAbi = [
  "function verifyAndEmit(uint64 chainKey, uint64 height, bytes encodedTransaction, tuple(bytes32 root, tuple(bytes32 hash, bool isLeft)[] siblings) merkleProof, tuple(bytes32 lowerEndpointDigest, bytes32[] roots) continuityProof) view returns (bool)",
];

const aavePoolAbi = [
  "function supply(address asset, uint256 amount, address onBehalfOf, uint16 referralCode)",
  "function borrow(address asset, uint256 amount, uint256 interestRateMode, uint16 referralCode, address onBehalfOf)",
  "function repay(address asset, uint256 amount, uint256 interestRateMode, address onBehalfOf) returns (uint256)",
  "event Supply(address indexed reserve, address user, address indexed onBehalfOf, uint256 amount, uint16 indexed referralCode)",
  "event Repay(address indexed reserve, address indexed user, address indexed repayer, uint256 amount, bool useATokens)",
];

const erc20Abi = [
  "function approve(address spender, uint256 amount) returns (bool)",
  "function balanceOf(address) view returns (uint256)",
  "function decimals() view returns (uint8)",
];

const identityRegistryAbi = [
  "function registerAgent(string _name, string _agentType, address _endpoint, string _tokenURI) returns (uint256)",
  "function totalAgents() view returns (uint256)",
];

const reputationRegistryAbi = [
  "function getReputation(uint256 _agentId, string _tag) view returns (tuple(uint64 totalInteractions, uint64 successfulInteractions, int128 reputationScore, uint8 decimals))",
  "function getReviews(uint256 _agentId) view returns (tuple(address reviewer, uint256 agentId, int128 score, string comment, uint256 timestamp)[])",
];

const importerAbi = [
  "function importCredit(uint64 blockHeight, bytes encodedTransaction, tuple(bytes32 root, tuple(bytes32 hash, bool isLeft)[] siblings) merkleProof, tuple(bytes32 lowerEndpointDigest, bytes32[] roots) continuityProof, address user, uint256 agentId, uint8 eventType, uint256 amount) returns (bool)",
  "function processedTxKeys(bytes32) view returns (bool)",
  "function totalRecords() view returns (uint256)",
  "function getRecord(uint256 index) view returns (tuple(address user, uint256 agentId, uint8 eventType, uint256 amount, int128 score, uint64 sourceBlockHeight, bytes32 txKey, uint256 timestamp))",
  "function getUserRecords(address user) view returns (uint256[])",
];

// ============ Aave Event Signatures ============

const AAVE_REPAY_TOPIC = ethers.id("Repay(address,address,address,uint256,bool)");
const AAVE_SUPPLY_TOPIC = ethers.id("Supply(address,address,address,uint256,uint16)");

// ============ Helpers ============

function log(step, msg) {
  console.log(`\n[${"=".repeat(3)} Step ${step} ${"=".repeat(3)}] ${msg}`);
}

async function waitForAttestation(chainInfo, blockHeight, maxWaitMs = 600_000) {
  const startTime = Date.now();
  while (true) {
    const att = await chainInfo.get_latest_attestation_height_and_hash(SEPOLIA_CHAIN_KEY);
    const attested = Number(att[0]);

    if (attested >= blockHeight) {
      console.log(`  Attested: block ${blockHeight} (latest: ${attested})`);
      return;
    }

    const elapsed = Math.round((Date.now() - startTime) / 1000);
    const gap = blockHeight - attested;
    console.log(`  Waiting... attested: ${attested}, need: ${blockHeight}, gap: ${gap} blocks (${elapsed}s elapsed)`);

    if (Date.now() - startTime > maxWaitMs) {
      throw new Error(`Timeout waiting for attestation after ${maxWaitMs / 1000}s`);
    }

    await new Promise((r) => setTimeout(r, 15_000));
  }
}

async function generateProof(txHash) {
  const url = `${PROOF_API}/api/v1/proof-by-tx/${SEPOLIA_CHAIN_KEY}/${txHash}`;
  const resp = await fetch(url, { signal: AbortSignal.timeout(30_000) });
  const data = await resp.json();

  if (data.code) {
    throw new Error(`Proof API error: ${data.code} - ${data.message}`);
  }

  return data;
}

function parseAaveEvents(receipt) {
  const iface = new ethers.Interface(aavePoolAbi);
  const events = [];

  for (const l of receipt.logs) {
    try {
      const parsed = iface.parseLog(l);
      if (parsed.name === "Repay") {
        events.push({
          type: "Repay",
          eventType: 0,
          reserve: parsed.args.reserve,
          user: parsed.args.user,
          repayer: parsed.args.repayer,
          amount: parsed.args.amount,
        });
      } else if (parsed.name === "Supply") {
        events.push({
          type: "Supply",
          eventType: 1,
          reserve: parsed.args.reserve,
          onBehalfOf: parsed.args.onBehalfOf,
          amount: parsed.args.amount,
        });
      }
    } catch {}
  }

  return events;
}

// ============ Deploy Contracts ============

async function deployContracts(uscWallet) {
  console.log("\n========== Deploying ERC-8004 + AaveCreditImporter on USC testnet ==========\n");

  // 1. Deploy IdentityRegistry
  console.log("1/4 Deploying IdentityRegistry...");
  const idFactory = new ethers.ContractFactory(
    identityRegistryAbi,
    await getIdentityRegistryBytecode(),
    uscWallet
  );

  // We'll deploy using forge create instead for simplicity
  // But since we need the ABI, let's use ethers with compiled bytecode

  // Alternative: use forge create directly
  const forgeCreateId = await forgeCreate(
    uscWallet,
    "IdentityRegistry",
    "../../packages/erc-8004/contracts/IdentityRegistry.sol:IdentityRegistry",
    []
  );
  IDENTITY_REGISTRY = forgeCreateId;
  console.log(`  IdentityRegistry: ${IDENTITY_REGISTRY}`);

  // 2. Deploy ReputationRegistry
  console.log("2/4 Deploying ReputationRegistry...");
  const forgeCreateRep = await forgeCreate(
    uscWallet,
    "ReputationRegistry",
    "../../packages/erc-8004/contracts/ReputationRegistry.sol:ReputationRegistry",
    [IDENTITY_REGISTRY]
  );
  REPUTATION_REGISTRY = forgeCreateRep;
  console.log(`  ReputationRegistry: ${REPUTATION_REGISTRY}`);

  // 3. Register Agent
  console.log("3/4 Registering Aave Credit PoC Agent...");
  const idReg = new ethers.Contract(IDENTITY_REGISTRY, identityRegistryAbi, uscWallet);
  const regTx = await idReg.registerAgent(
    "Aave Credit PoC Agent",
    "credit-importer",
    uscWallet.address,
    ""
  );
  const regReceipt = await regTx.wait();
  AGENT_ID = Number(await idReg.totalAgents());
  console.log(`  Agent registered: ID ${AGENT_ID}`);

  // 4. Deploy AaveCreditImporter
  console.log("4/4 Deploying AaveCreditImporter...");
  const forgeCreateImporter = await forgeCreate(
    uscWallet,
    "AaveCreditImporter",
    "src/AaveCreditImporter.sol:AaveCreditImporter",
    [REPUTATION_REGISTRY]
  );
  IMPORTER_ADDRESS = forgeCreateImporter;
  console.log(`  AaveCreditImporter: ${IMPORTER_ADDRESS}`);

  console.log("\n========== Deployment Complete ==========");
  console.log(`  IDENTITY_REGISTRY:    ${IDENTITY_REGISTRY}`);
  console.log(`  REPUTATION_REGISTRY:  ${REPUTATION_REGISTRY}`);
  console.log(`  AAVE_CREDIT_IMPORTER: ${IMPORTER_ADDRESS}`);
  console.log(`  AGENT_ID:             ${AGENT_ID}`);
  console.log("\nAdd to .env:");
  console.log(`  USC_IDENTITY_REGISTRY=${IDENTITY_REGISTRY}`);
  console.log(`  USC_REPUTATION_REGISTRY=${REPUTATION_REGISTRY}`);
  console.log(`  AAVE_CREDIT_IMPORTER=${IMPORTER_ADDRESS}`);
  console.log(`  AAVE_AGENT_ID=${AGENT_ID}`);

  return { IDENTITY_REGISTRY, REPUTATION_REGISTRY, IMPORTER_ADDRESS, AGENT_ID };
}

async function forgeCreate(wallet, name, contractPath, constructorArgs) {
  const { execSync } = await import("child_process");
  const { resolve } = await import("path");

  let execCwd = process.cwd();
  let forgeContractPath = contractPath;

  // For ERC-8004 contracts, run forge from the erc-8004 directory
  if (contractPath.includes("erc-8004")) {
    execCwd = resolve(process.cwd(), "../../packages/erc-8004");
    forgeContractPath = contractPath.replace("../../packages/erc-8004/", "");
  }

  let cmd = `forge create ${forgeContractPath} --rpc-url ${USC_RPC} --private-key ${wallet.signingKey.privateKey} --broadcast`;

  if (constructorArgs.length > 0) {
    cmd += ` --constructor-args ${constructorArgs.join(" ")}`;
  }

  const output = execSync(cmd, { encoding: "utf-8", cwd: execCwd });

  // Parse deployed address from forge create output
  const match = output.match(/Deployed to:\s*(0x[0-9a-fA-F]{40})/);
  if (!match) {
    throw new Error(`Could not parse deployed address for ${name}:\n${output}`);
  }

  return match[1];
}

// Not used with forge create approach, kept for reference
async function getIdentityRegistryBytecode() {
  return "0x";
}

// ============ Main Flow ============

async function main() {
  const privateKey = process.env.DEPLOYER_PRIVATE_KEY;
  if (!privateKey) throw new Error("DEPLOYER_PRIVATE_KEY not set");

  const sepoliaProvider = new ethers.JsonRpcProvider(SEPOLIA_RPC);
  const uscProvider = new ethers.JsonRpcProvider(USC_RPC, undefined, { staticNetwork: true });

  const sepoliaWallet = new ethers.Wallet(privateKey, sepoliaProvider);
  const uscWallet = new ethers.Wallet(privateKey, uscProvider);

  const deployer = sepoliaWallet.address;
  console.log(`Deployer: ${deployer}`);

  const args = process.argv.slice(2);

  // ============ Deploy Mode ============

  if (args.includes("--deploy")) {
    await deployContracts(uscWallet);
    return;
  }

  // ============ Validate Config ============

  if (!IMPORTER_ADDRESS) {
    console.log("AAVE_CREDIT_IMPORTER not set. Run with --deploy first or set env vars.");
    console.log("  node scripts/aave-credit-e2e.mjs --deploy");
    return;
  }

  if (!AGENT_ID) {
    console.log("AAVE_AGENT_ID not set. Run with --deploy first or set env var.");
    return;
  }

  let txHash = args[0];
  let blockNumber;
  let aaveEvents = [];

  // ============ Step 1: Aave Interaction (Sepolia) ============

  if (txHash) {
    log(1, `Using existing Aave tx: ${txHash}`);
    const receipt = await sepoliaProvider.getTransactionReceipt(txHash);
    if (!receipt) throw new Error("Transaction not found");
    blockNumber = receipt.blockNumber;

    aaveEvents = parseAaveEvents(receipt);
    if (aaveEvents.length === 0) throw new Error("No Aave Repay/Supply events found in tx");

    for (const evt of aaveEvents) {
      console.log(`  ${evt.type}: ${ethers.formatUnits(evt.amount, 6)} USDC`);
      console.log(`  User: ${evt.user || evt.onBehalfOf}`);
    }
    console.log(`  Block: ${blockNumber}`);
  } else {
    log(1, "Running full Aave cycle on Sepolia (Supply + Borrow + Repay)...");

    const pool = new ethers.Contract(AAVE_POOL, aavePoolAbi, sepoliaWallet);
    const usdc = new ethers.Contract(AAVE_USDC, erc20Abi, sepoliaWallet);
    const decimals = await usdc.decimals();

    const balance = await usdc.balanceOf(deployer);
    console.log(`  USDC balance: ${ethers.formatUnits(balance, decimals)}`);

    const supplyAmount = ethers.parseUnits("100", decimals);
    if (balance < supplyAmount) {
      console.log("  Insufficient USDC. Get testnet USDC from Aave faucet:");
      console.log("  https://staging.aave.com/faucet/");
      return;
    }

    // Approve
    console.log("  Approving USDC for Aave Pool...");
    const approveTx = await usdc.approve(AAVE_POOL, ethers.MaxUint256);
    await approveTx.wait();

    // Supply
    console.log(`  Supplying ${ethers.formatUnits(supplyAmount, decimals)} USDC...`);
    const supplyTx = await pool.supply(AAVE_USDC, supplyAmount, deployer, 0);
    await supplyTx.wait();
    console.log(`  Supply tx: ${supplyTx.hash}`);

    // Borrow (small amount)
    const borrowAmount = ethers.parseUnits("10", decimals);
    console.log(`  Borrowing ${ethers.formatUnits(borrowAmount, decimals)} USDC...`);
    const borrowTx = await pool.borrow(AAVE_USDC, borrowAmount, 2, 0, deployer); // 2 = variable rate
    await borrowTx.wait();
    console.log(`  Borrow tx: ${borrowTx.hash}`);

    // Repay (this is the key event we want to import)
    console.log(`  Repaying ${ethers.formatUnits(borrowAmount, decimals)} USDC...`);
    const repayTx = await pool.repay(AAVE_USDC, borrowAmount, 2, deployer);
    const repayReceipt = await repayTx.wait();
    txHash = repayReceipt.hash;
    blockNumber = repayReceipt.blockNumber;

    aaveEvents = parseAaveEvents(repayReceipt);
    console.log(`  Repay tx: ${txHash}`);
    console.log(`  Block: ${blockNumber}`);
    console.log(`  Events found: ${aaveEvents.length}`);
  }

  // Use the first event for import
  const primaryEvent = aaveEvents[0];
  console.log(`\n  Primary event: ${primaryEvent.type}`);
  console.log(`  Score mapping: ${primaryEvent.eventType === 0 ? "400 (4.00/5.00)" : primaryEvent.eventType === 1 ? "350 (3.50/5.00)" : "150 (1.50/5.00)"}`);

  // ============ Step 2: Wait for Attestation ============

  log(2, `Waiting for Sepolia block ${blockNumber} to be attested on USC...`);
  const chainInfo = new ethers.Contract(CHAIN_INFO, chainInfoAbi, uscProvider);
  await waitForAttestation(chainInfo, blockNumber);

  // ============ Step 3: Generate Proof ============

  log(3, `Generating proof for tx ${txHash}...`);
  const proof = await generateProof(txHash);

  console.log(`  Chain Key: ${proof.chainKey}`);
  console.log(`  Block Height: ${proof.headerNumber}`);
  console.log(`  TX Index: ${proof.txIndex}`);
  console.log(`  Merkle siblings: ${proof.merkleProof.siblings.length}`);
  console.log(`  Continuity roots: ${proof.continuityProof.roots.length}`);

  // Format proof data for contract calls
  const merkleProofData = {
    root: proof.merkleProof.root,
    siblings: proof.merkleProof.siblings.map((s) => ({
      hash: s.hash,
      isLeft: s.isLeft,
    })),
  };

  const continuityProofData = {
    lowerEndpointDigest: proof.continuityProof.lowerEndpointDigest,
    roots: proof.continuityProof.roots,
  };

  // ============ Step 4: Verify Proof (staticcall) ============

  log(4, "Verifying proof on USC testnet (staticcall)...");
  const verifier = new ethers.Contract(VERIFIER, verifierAbi, uscProvider);

  const verified = await verifier.verifyAndEmit(
    proof.chainKey,
    proof.headerNumber,
    proof.txBytes,
    merkleProofData,
    continuityProofData
  );

  console.log(`  Verification result: ${verified ? "VALID" : "INVALID"}`);
  if (!verified) throw new Error("Proof verification failed");

  // ============ Step 5: Credit Import ============

  log(5, "Importing credit via AaveCreditImporter...");
  const importer = new ethers.Contract(IMPORTER_ADDRESS, importerAbi, uscWallet);

  const eventUser = primaryEvent.user || primaryEvent.onBehalfOf;
  const importTx = await importer.importCredit(
    proof.headerNumber,
    proof.txBytes,
    merkleProofData,
    continuityProofData,
    eventUser,
    AGENT_ID,
    primaryEvent.eventType,
    primaryEvent.amount
  );

  console.log(`  Import tx: ${importTx.hash}`);
  const importReceipt = await importTx.wait();
  console.log(`  Confirmed at block ${importReceipt.blockNumber}`);

  // Check record
  const totalRecords = await importer.totalRecords();
  const record = await importer.getRecord(totalRecords - 1n);
  console.log(`  Record #${totalRecords - 1n}:`);
  console.log(`    User: ${record.user}`);
  console.log(`    Event: ${["Repay", "Supply", "Liquidation"][record.eventType]}`);
  console.log(`    Score: ${record.score} (${Number(record.score) / 100}/5.00)`);

  // ============ Step 6: ERC-8004 State Check ============

  log(6, "Checking ERC-8004 reputation state...");
  const repRegistry = new ethers.Contract(REPUTATION_REGISTRY, reputationRegistryAbi, uscProvider);

  const reputation = await repRegistry.getReputation(AGENT_ID, "aave-credit");
  console.log(`  Agent ID: ${AGENT_ID}`);
  console.log(`  Tag: aave-credit`);
  console.log(`  Total interactions: ${reputation.totalInteractions}`);
  console.log(`  Reputation score: ${reputation.reputationScore} (${Number(reputation.reputationScore) / 100}/5.00)`);

  const reviews = await repRegistry.getReviews(AGENT_ID);
  console.log(`  Total reviews: ${reviews.length}`);
  if (reviews.length > 0) {
    const latest = reviews[reviews.length - 1];
    console.log(`  Latest review:`);
    console.log(`    Reviewer: ${latest.reviewer}`);
    console.log(`    Score: ${latest.score} (${Number(latest.score) / 100}/5.00)`);
    console.log(`    Comment: ${latest.comment}`);
  }

  // ============ Summary ============

  console.log("\n============ Summary ============");
  console.log(`  Sepolia Aave tx:     ${txHash}`);
  console.log(`  Sepolia block:       ${blockNumber}`);
  console.log(`  Event type:          ${primaryEvent.type}`);
  console.log(`  Amount:              ${ethers.formatUnits(primaryEvent.amount, 6)} USDC`);
  console.log(`  USC import tx:       ${importTx.hash}`);
  console.log(`  ERC-8004 score:      ${reputation.reputationScore} (${Number(reputation.reputationScore) / 100}/5.00)`);
  console.log(`  Tag:                 aave-credit`);
  console.log(`  Credit import complete!`);
}

main().catch((e) => {
  console.error(`\nError: ${e.message}`);
  process.exit(1);
});
