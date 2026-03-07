import { config } from "dotenv";
config({ path: ".env" });

// ============ RPCs ============

export const SEPOLIA_RPC = process.env.SEPOLIA_RPC || "https://1rpc.io/sepolia";
export const USC_RPC = process.env.USC_RPC || "https://rpc.usc-testnet2.creditcoin.network";
export const PROOF_API = process.env.PROOF_API || "https://proof-gen-api.usc-testnet2.creditcoin.network";

// ============ Private Key ============

export const DEPLOYER_PRIVATE_KEY = process.env.DEPLOYER_PRIVATE_KEY;

// ============ Contract Addresses ============

export const DN_TOKEN_SEPOLIA = "0xa6722586d0f1cfb2a66725717ed3b99f609cb39b";
export const DN_BRIDGE_USC = "0x4fE881D69fB10b8bcd2009D1BC9684a609B29270";
export const CHAIN_INFO = "0x0000000000000000000000000000000000000fd3";
export const VERIFIER = "0x0000000000000000000000000000000000000FD2";

// ============ Chain Keys ============

export const SEPOLIA_CHAIN_KEY = 1;

// ============ DN Token Deploy Block (Sepolia) ============
// Exact deploy block of DN Token on Sepolia (verified via eth_getCode binary search)
export const DN_TOKEN_DEPLOY_BLOCK = 10_400_785;

export const START_BLOCK = process.env.START_BLOCK
  ? parseInt(process.env.START_BLOCK, 10)
  : DN_TOKEN_DEPLOY_BLOCK;

// ============ Worker Config ============

export const POLL_INTERVAL_MS = 30_000;
export const MAX_RETRY = 10;
export const ATTESTATION_TIMEOUT_MS = 600_000; // 10 min
export const PROOF_MAX_RETRIES = 3;

// ============ ABIs (minimal) ============

export const BRIDGE_BURN_TOPIC = "0x" + "0".repeat(64); // placeholder, set in poller

export const DN_TOKEN_ABI = [
  "event Transfer(address indexed from, address indexed to, uint256 value)",
  "event BridgeBurn(address indexed from, uint256 amount, uint64 destinationChainKey)",
];

export const CHAIN_INFO_ABI = [
  "function get_latest_attestation_height_and_hash(uint64) view returns (uint64,bytes32,bool,bool)",
];

export const DN_BRIDGE_ABI = [
  "function processBridgeMint(uint64 blockHeight, bytes encodedTransaction, tuple(bytes32 root, tuple(bytes32 hash, bool isLeft)[] siblings) merkleProof, tuple(bytes32 lowerEndpointDigest, bytes32[] roots) continuityProof, address recipient, uint256 amount) returns (bool)",
  "function processedTxKeys(bytes32) view returns (bool)",
];
