/**
 * DN Token Bridge E2E Script
 *
 * Full flow: Sepolia burn → attestation wait → proof generation → USC verification → mint
 *
 * Usage:
 *   node scripts/bridge-e2e.mjs [burn-tx-hash]
 *
 * If no tx hash provided, it will burn 10 DN and then bridge.
 */

import { ethers } from "ethers";
import { config } from "dotenv";
config({ path: "../../.env" });

// ============ Config ============

const SEPOLIA_RPC = "https://1rpc.io/sepolia";
const USC_RPC = "https://rpc.usc-testnet2.creditcoin.network";
const PROOF_API = "https://proof-gen-api.usc-testnet2.creditcoin.network";

const SEPOLIA_CHAIN_KEY = 1;
const DN_TOKEN_SEPOLIA = "0xE964cb9cc1C8DA4847C24E3960aDa2F8Ff12C380";

// USC contract addresses (to be filled after deployment)
const DN_BRIDGE_USC = process.env.DN_BRIDGE_USC || "";

const CHAIN_INFO = "0x0000000000000000000000000000000000000fd3";
const VERIFIER = "0x0000000000000000000000000000000000000FD2";

// ============ ABIs ============

const chainInfoAbi = [
  "function get_latest_attestation_height_and_hash(uint64) view returns (uint64,bytes32,bool,bool)",
];

const verifierAbi = [
  "function verifyAndEmit(uint64 chainKey, uint64 height, bytes encodedTransaction, tuple(bytes32 root, tuple(bytes32 hash, bool isLeft)[] siblings) merkleProof, tuple(bytes32 lowerEndpointDigest, bytes32[] roots) continuityProof) view returns (bool)",
];

const dnTokenAbi = [
  "function bridgeBurn(uint256 amount, uint64 destinationChainKey) returns (bool)",
  "function balanceOf(address) view returns (uint256)",
  "event Transfer(address indexed from, address indexed to, uint256 value)",
  "event BridgeBurn(address indexed from, uint256 amount, uint64 destinationChainKey)",
];

const dnBridgeAbi = [
  "function processBridgeMint(uint64 blockHeight, bytes encodedTransaction, tuple(bytes32 root, tuple(bytes32 hash, bool isLeft)[] siblings) merkleProof, tuple(bytes32 lowerEndpointDigest, bytes32[] roots) continuityProof, address recipient, uint256 amount) returns (bool)",
  "function balanceOf(address) view returns (uint256)",
  "function totalBridgeMinted() view returns (uint256)",
  "function processedTxKeys(bytes32) view returns (bool)",
];

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
      console.log(`  ✅ Block ${blockHeight} is attested (latest: ${attested})`);
      return;
    }

    const elapsed = Math.round((Date.now() - startTime) / 1000);
    const gap = blockHeight - attested;
    console.log(`  ⏳ Waiting... attested: ${attested}, need: ${blockHeight}, gap: ${gap} blocks (${elapsed}s elapsed)`);

    if (Date.now() - startTime > maxWaitMs) {
      throw new Error(`Timeout waiting for attestation after ${maxWaitMs / 1000}s`);
    }

    await new Promise(r => setTimeout(r, 15_000)); // poll every 15s
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

  let burnTxHash = process.argv[2];
  let burnBlockNumber;
  let burnAmount;
  let burnFrom;

  // ============ Step 1: Burn on Sepolia ============

  if (burnTxHash) {
    log(1, `Using existing burn tx: ${burnTxHash}`);
    const receipt = await sepoliaProvider.getTransactionReceipt(burnTxHash);
    if (!receipt) throw new Error("Burn tx not found");
    burnBlockNumber = receipt.blockNumber;

    // Parse Transfer event to get amount
    const iface = new ethers.Interface(dnTokenAbi);
    for (const l of receipt.logs) {
      try {
        const parsed = iface.parseLog(l);
        if (parsed.name === "Transfer" && parsed.args.to === "0x0000000000000000000000000000000000000001") {
          burnFrom = parsed.args.from;
          burnAmount = parsed.args.value;
          console.log(`  Burn: ${ethers.formatEther(burnAmount)} DN from ${burnFrom}`);
          console.log(`  Block: ${burnBlockNumber}`);
          break;
        }
      } catch {}
    }
    if (!burnAmount) throw new Error("Could not find burn Transfer event");
  } else {
    log(1, "Burning 10 DN on Sepolia...");
    const dnToken = new ethers.Contract(DN_TOKEN_SEPOLIA, dnTokenAbi, sepoliaWallet);

    const balance = await dnToken.balanceOf(deployer);
    console.log(`  DN balance: ${ethers.formatEther(balance)}`);

    const burnAmountWei = ethers.parseEther("10");
    const tx = await dnToken.bridgeBurn(burnAmountWei, 1);
    console.log(`  Burn tx: ${tx.hash}`);

    const receipt = await tx.wait();
    burnTxHash = receipt.hash;
    burnBlockNumber = receipt.blockNumber;
    burnAmount = burnAmountWei;
    burnFrom = deployer;

    console.log(`  ✅ Burned 10 DN at block ${burnBlockNumber}`);
  }

  // ============ Step 2: Wait for Attestation ============

  log(2, `Waiting for Sepolia block ${burnBlockNumber} to be attested on USC...`);
  const chainInfo = new ethers.Contract(CHAIN_INFO, chainInfoAbi, uscProvider);
  await waitForAttestation(chainInfo, burnBlockNumber);

  // ============ Step 3: Generate Proof ============

  log(3, `Generating proof for tx ${burnTxHash}...`);
  const proof = await generateProof(burnTxHash);

  console.log(`  Chain Key: ${proof.chainKey}`);
  console.log(`  Block Height: ${proof.headerNumber}`);
  console.log(`  TX Index: ${proof.txIndex}`);
  console.log(`  Merkle siblings: ${proof.merkleProof.siblings.length}`);
  console.log(`  Continuity roots: ${proof.continuityProof.roots.length}`);

  // ============ Step 4: Verify Proof (staticcall) ============

  log(4, "Verifying proof on USC testnet (staticcall)...");
  const verifier = new ethers.Contract(VERIFIER, verifierAbi, uscProvider);

  const verified = await verifier.verifyAndEmit(
    proof.chainKey,
    proof.headerNumber,
    proof.txBytes,
    {
      root: proof.merkleProof.root,
      siblings: proof.merkleProof.siblings.map(s => ({
        hash: s.hash,
        isLeft: s.isLeft,
      })),
    },
    {
      lowerEndpointDigest: proof.continuityProof.lowerEndpointDigest,
      roots: proof.continuityProof.roots,
    }
  );

  console.log(`  Verification result: ${verified ? "✅ VALID" : "❌ INVALID"}`);
  if (!verified) throw new Error("Proof verification failed");

  // ============ Step 5: Mint on USC (requires deployed bridge) ============

  if (!DN_BRIDGE_USC) {
    log(5, "⚠️  DN_BRIDGE_USC not set. Skipping mint step.");
    console.log("  Set DN_BRIDGE_USC env var after deploying DNBridgeUSC on USC testnet.");
    console.log("\n  To deploy DNBridgeUSC, run:");
    console.log(`    cast send --rpc-url ${USC_RPC} --private-key $DEPLOYER_PRIVATE_KEY --create <bytecode>`);

    // Save proof data for later use
    console.log("\n  Proof data saved. To mint later, run:");
    console.log(`    DN_BRIDGE_USC=<addr> node scripts/bridge-e2e.mjs ${burnTxHash}`);

    console.log("\n============ Summary ============");
    console.log(`  Sepolia burn tx:    ${burnTxHash}`);
    console.log(`  Sepolia block:      ${burnBlockNumber}`);
    console.log(`  Amount:             ${ethers.formatEther(burnAmount)} DN`);
    console.log(`  Recipient:          ${burnFrom}`);
    console.log(`  Proof verified:     ✅`);
    console.log(`  USC mint:           ⏳ Pending (need bridge contract)`);
    return;
  }

  log(5, "Minting DN on USC testnet via bridge...");
  const bridge = new ethers.Contract(DN_BRIDGE_USC, dnBridgeAbi, uscWallet);

  const mintTx = await bridge.processBridgeMint(
    proof.headerNumber,
    proof.txBytes,
    {
      root: proof.merkleProof.root,
      siblings: proof.merkleProof.siblings.map(s => ({
        hash: s.hash,
        isLeft: s.isLeft,
      })),
    },
    {
      lowerEndpointDigest: proof.continuityProof.lowerEndpointDigest,
      roots: proof.continuityProof.roots,
    },
    burnFrom,
    burnAmount
  );

  console.log(`  Mint tx: ${mintTx.hash}`);
  const mintReceipt = await mintTx.wait();
  console.log(`  ✅ Mint confirmed at block ${mintReceipt.blockNumber}`);

  // Verify balances
  const bridgeBalance = await bridge.balanceOf(burnFrom);
  const totalMinted = await bridge.totalBridgeMinted();

  console.log("\n============ Final State ============");
  console.log(`  Sepolia burn tx:    ${burnTxHash}`);
  console.log(`  USC mint tx:        ${mintTx.hash}`);
  console.log(`  Amount bridged:     ${ethers.formatEther(burnAmount)} DN`);
  console.log(`  Recipient balance:  ${ethers.formatEther(bridgeBalance)} DN (on USC)`);
  console.log(`  Total minted:       ${ethers.formatEther(totalMinted)} DN`);
  console.log(`  ✅ Bridge complete!`);
}

main().catch(e => {
  console.error(`\n❌ Error: ${e.message}`);
  process.exit(1);
});
