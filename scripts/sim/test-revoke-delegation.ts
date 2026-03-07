/**
 * User #5의 AgentVault delegation을 해제한다.
 * Usage: NODE_PATH=apps/web/node_modules npx tsx scripts/sim/test-revoke-delegation.ts
 */
import { createPublicClient, createWalletClient, http, type Address } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import accounts from "../simulation-accounts.json";

const RPC = "https://rpc.cc3-testnet.creditcoin.network";
const chain = { id: 102031, name: "Creditcoin Testnet", nativeCurrency: { name: "CTC", symbol: "CTC", decimals: 18 }, rpcUrls: { default: { http: [RPC] } } };

const publicClient = createPublicClient({ transport: http(RPC) });

// User #5 (Moderate Borrower)
const user5 = accounts.accounts[4]; // index 5
const user5Account = privateKeyToAccount(user5.privateKey as `0x${string}`);
const user5Wallet = createWalletClient({ account: user5Account, chain, transport: http(RPC) });

const AGENT_VAULT = "0x7bca6fb903cc564d92ed5384512976c94f2730d7" as Address;
const AGENT_EOA = "0xE550Afa5f8C81D7c3219a4Ece9c2e58618C125c6" as Address;

const AgentVaultABI = [
  { type: "function", name: "revokePermission", inputs: [{ name: "agent", type: "address" }], outputs: [], stateMutability: "nonpayable" },
  { type: "function", name: "getDelegatedUsers", inputs: [{ name: "agent", type: "address" }], outputs: [{ name: "", type: "address[]" }], stateMutability: "view" },
] as const;

async function main() {
  console.log(`=== Revoke User #5 Delegation ===`);
  console.log(`User #5: ${user5.address}`);

  // Before
  const before = await publicClient.readContract({ address: AGENT_VAULT, abi: AgentVaultABI, functionName: "getDelegatedUsers", args: [AGENT_EOA] }) as Address[];
  console.log(`\nBefore: ${before.length} delegated users`);
  before.forEach((u, i) => console.log(`  [${i}] ${u}`));

  // Revoke
  console.log(`\nRevoking permission...`);
  const hash = await user5Wallet.writeContract({
    address: AGENT_VAULT,
    abi: AgentVaultABI,
    functionName: "revokePermission",
    args: [AGENT_EOA],
  });
  console.log(`TX: ${hash}`);
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  console.log(`Status: ${receipt.status}`);

  // After
  const after = await publicClient.readContract({ address: AGENT_VAULT, abi: AgentVaultABI, functionName: "getDelegatedUsers", args: [AGENT_EOA] }) as Address[];
  console.log(`\nAfter: ${after.length} delegated users`);
  after.forEach((u, i) => console.log(`  [${i}] ${u}`));
}

main().catch(console.error);
