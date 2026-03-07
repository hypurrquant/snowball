/**
 * E2E DN Bridge Pipeline Simulation
 *
 * Tests the full bridge pipeline:
 * 1. CC Testnet: USDC approve + BridgeVault deposit
 * 2. Sepolia: DN Token mint + bridgeBurn
 * 3. USC Worker detects burn → processBridgeMint (docker로 상시 운영)
 *
 * Usage: NODE_PATH=apps/web/node_modules npx tsx scripts/simulate-dn-bridge.ts
 *
 * ── Test Results (2026-03-07) ──
 *
 * Run 1: 10 DN (worker 시작 직후, 밀린 burn 처리)
 *   - CC Approve:  0x46e88327293b4511c9fd0c8994ad2a3c958c5d3dfcfef9505405811b8d009f57
 *   - CC Deposit:  0xdb3c09215ad026a4eef912bdbdd56f672e032ffbf5595fa3af7f196947be8ce0
 *   - Sep Mint:    0x274b42de513063202a9e4b9231ce32acf08ec7eba66f54c5f5bd8059af3d1b0d
 *   - Sep Burn:    0xedfdd42335d80107f2a7be74ce64bf4316f3cc56c553e817e9abc2af8bea0f8f
 *   - USC Mint:    0x7ebaba561ba22cc1aa466194aa68c88230c1f344a7178941b68a548a463d20d4 (block 294319)
 *   - Attestation: ~4m30s (attested 10401090 → need 10401097)
 *   - USC DN balance: 10 → 15 (+5 DN verified)
 *
 * Run 0: 10 DN (이전 세션에서 burn만 완료, worker 미운영 상태였음)
 *   - Sep Burn:    0xb500a00d0128e48007e5a30d0017ba0d85574422fc8775a34469d348e960afd7
 *   - USC Mint:    0xbfb851466b6aba21e2bbff953c010d4dfa1fb71aa33f86d27354525660c93d4b (block 294277)
 *   - 즉시 처리 (이미 attested 상태)
 *   - USC DN balance: 0 → 10
 */
import {
  createPublicClient,
  createWalletClient,
  http,
  parseEther,
  formatEther,
  defineChain,
  erc20Abi,
  type Hex,
  type Address,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { sepolia } from "viem/chains";
import accounts from "../simulation-accounts.json";

// ──── Config ────
const BRIDGE_AMOUNT = parseEther("10"); // 10 USDC / 10 DN

const USDC = "0x60e204104cfe1a93f630ea5ebc0a895cc80ebed9" as Address;
const BRIDGE_VAULT = "0x06961ab735f87486c538d840d0f54d3f6518cd78" as Address;
const DN_TOKEN_SEPOLIA = "0xa6722586d0f1cfb2a66725717ed3b99f609cb39b" as Address;
const DN_BRIDGE_USC = "0x4fE881D69fB10b8bcd2009D1BC9684a609B29270" as Address;
const USC_CHAIN_KEY = 1n;

// ──── ABIs ────
const bridgeVaultAbi = [
  {
    type: "function",
    name: "deposit",
    inputs: [
      { name: "amount", type: "uint256" },
      { name: "destinationChainKey", type: "uint64" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "event",
    name: "Deposited",
    inputs: [
      { name: "user", type: "address", indexed: true },
      { name: "amount", type: "uint256", indexed: false },
      { name: "destinationChainKey", type: "uint64", indexed: false },
    ],
  },
] as const;

const dnTokenAbi = [
  {
    type: "function",
    name: "mint",
    inputs: [
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "bridgeBurn",
    inputs: [
      { name: "amount", type: "uint256" },
      { name: "destinationChainKey", type: "uint64" },
    ],
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "balanceOf",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "event",
    name: "BridgeBurn",
    inputs: [
      { name: "from", type: "address", indexed: true },
      { name: "amount", type: "uint256", indexed: false },
      { name: "destinationChainKey", type: "uint64", indexed: false },
    ],
  },
] as const;

// ──── Chains ────
const cc3Testnet = defineChain({
  id: 102031,
  name: "Creditcoin3 Testnet",
  nativeCurrency: { name: "CTC", symbol: "tCTC", decimals: 18 },
  rpcUrls: { default: { http: ["https://rpc.cc3-testnet.creditcoin.network"] } },
});

const uscTestnet = defineChain({
  id: 102036,
  name: "USC Testnet",
  nativeCurrency: { name: "CTC", symbol: "tCTC", decimals: 18 },
  rpcUrls: { default: { http: ["https://rpc.usc-testnet2.creditcoin.network"] } },
});

// ──── Clients ────
const deployer = privateKeyToAccount(accounts.deployer.privateKey as Hex);
console.log(`\nDeployer: ${deployer.address}`);
console.log(`Bridge Amount: ${formatEther(BRIDGE_AMOUNT)} tokens\n`);

const ccPublic = createPublicClient({ chain: cc3Testnet, transport: http() });
const ccWallet = createWalletClient({ account: deployer, chain: cc3Testnet, transport: http() });

const sepPublic = createPublicClient({ chain: sepolia, transport: http("https://1rpc.io/sepolia") });
const sepWallet = createWalletClient({ account: deployer, chain: sepolia, transport: http("https://1rpc.io/sepolia") });

const uscPublic = createPublicClient({ chain: uscTestnet, transport: http() });

// ──── Helpers ────
async function waitTx(client: any, hash: Hex, label: string) {
  const receipt = await client.waitForTransactionReceipt({ hash });
  const status = receipt.status === "success" ? "SUCCESS" : "FAILED";
  console.log(`   ${label}: ${status} | TX: ${hash}`);
  if (receipt.status !== "success") {
    throw new Error(`${label} failed!`);
  }
  return receipt;
}

// ──── Main ────
async function main() {
  console.log("=" .repeat(60));
  console.log("STEP A: CC Testnet — USDC Approve + Vault Deposit");
  console.log("=" .repeat(60));

  // A1: Approve USDC
  console.log("\n[A1] Approving USDC for BridgeVault...");
  const approveHash = await ccWallet.writeContract({
    address: USDC,
    abi: erc20Abi,
    functionName: "approve",
    args: [BRIDGE_VAULT, BRIDGE_AMOUNT],
  });
  await waitTx(ccPublic, approveHash, "USDC Approve");

  // A2: Deposit to vault
  console.log("[A2] Depositing USDC to BridgeVault...");
  const depositHash = await ccWallet.writeContract({
    address: BRIDGE_VAULT,
    abi: bridgeVaultAbi,
    functionName: "deposit",
    args: [BRIDGE_AMOUNT, USC_CHAIN_KEY],
  });
  const depositReceipt = await waitTx(ccPublic, depositHash, "Vault Deposit");
  console.log(`   Deposit event logs: ${depositReceipt.logs.length}`);

  // Check vault USDC balance
  const vaultBalance = await ccPublic.readContract({
    address: USDC,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: [BRIDGE_VAULT],
  });
  console.log(`   BridgeVault USDC balance: ${formatEther(vaultBalance)}`);

  console.log("\n" + "=" .repeat(60));
  console.log("STEP B: Sepolia — DN Token Mint + Bridge Burn");
  console.log("=" .repeat(60));

  // B1: Mint DN on Sepolia
  console.log("\n[B1] Minting DN tokens on Sepolia...");
  const mintHash = await sepWallet.writeContract({
    address: DN_TOKEN_SEPOLIA,
    abi: dnTokenAbi,
    functionName: "mint",
    args: [deployer.address, BRIDGE_AMOUNT],
  });
  await waitTx(sepPublic, mintHash, "DN Mint");

  // Check balance after mint
  const balAfterMint = await sepPublic.readContract({
    address: DN_TOKEN_SEPOLIA,
    abi: dnTokenAbi,
    functionName: "balanceOf",
    args: [deployer.address],
  });
  console.log(`   DN balance after mint: ${formatEther(balAfterMint)}`);

  // B2: Bridge Burn
  console.log("[B2] Burning DN tokens (bridge burn)...");
  const burnHash = await sepWallet.writeContract({
    address: DN_TOKEN_SEPOLIA,
    abi: dnTokenAbi,
    functionName: "bridgeBurn",
    args: [BRIDGE_AMOUNT, USC_CHAIN_KEY],
  });
  const burnReceipt = await waitTx(sepPublic, burnHash, "DN Bridge Burn");
  console.log(`   Burn event logs: ${burnReceipt.logs.length}`);

  // Check balance after burn
  const balAfterBurn = await sepPublic.readContract({
    address: DN_TOKEN_SEPOLIA,
    abi: dnTokenAbi,
    functionName: "balanceOf",
    args: [deployer.address],
  });
  console.log(`   DN balance after burn: ${formatEther(balAfterBurn)}`);

  console.log("\n" + "=" .repeat(60));
  console.log("STEP C: Balance Summary (3 Chains)");
  console.log("=" .repeat(60));

  const [ccUSDC, sepDN, uscDN] = await Promise.all([
    ccPublic.readContract({ address: USDC, abi: erc20Abi, functionName: "balanceOf", args: [deployer.address] }),
    sepPublic.readContract({ address: DN_TOKEN_SEPOLIA, abi: dnTokenAbi, functionName: "balanceOf", args: [deployer.address] }),
    uscPublic.readContract({
      address: DN_BRIDGE_USC,
      abi: [{ type: "function", name: "balanceOf", inputs: [{ name: "account", type: "address" }], outputs: [{ name: "", type: "uint256" }], stateMutability: "view" }] as const,
      functionName: "balanceOf",
      args: [deployer.address],
    }).catch(() => 0n),
  ]);

  console.log(`\n   CC Testnet USDC:    ${formatEther(ccUSDC)}`);
  console.log(`   Sepolia DN:         ${formatEther(sepDN)}`);
  console.log(`   USC Testnet DN:     ${formatEther(uscDN as bigint)}`);

  console.log("\n" + "=" .repeat(60));
  console.log("E2E RESULT: Steps A + B PASSED");
  console.log("Step C (USC Mint) requires USC Worker — run manually:");
  console.log("  cd apps/usc-worker && DEPLOYER_PRIVATE_KEY=... node src/index.mjs");
  console.log("=" .repeat(60));
}

main().catch((err) => {
  console.error("\nE2E FAILED:", err.message || err);
  process.exit(1);
});
