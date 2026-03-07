/**
 * Verify AgentVault on-chain: eth_getCode + getDelegatedUsers + getPermNonce
 *
 * Usage: NODE_PATH=apps/web/node_modules npx tsx scripts/verify-agent-vault.ts
 */
import { createPublicClient, http, defineChain, type Address } from "viem";

const CANONICAL_ADDRESS = "0x7bca6fb903cc564d92ed5384512976c94f2730d7" as Address;

const cc3 = defineChain({
  id: 102031,
  name: "CC3 Testnet",
  nativeCurrency: { name: "CTC", symbol: "tCTC", decimals: 18 },
  rpcUrls: { default: { http: ["https://rpc.cc3-testnet.creditcoin.network"] } },
});

const pub = createPublicClient({ chain: cc3, transport: http() });

const AgentVaultABI = [
  {
    type: "function",
    name: "getDelegatedUsers",
    inputs: [{ name: "agent", type: "address" }],
    outputs: [{ name: "", type: "address[]" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getPermNonce",
    inputs: [
      { name: "user", type: "address" },
      { name: "agent", type: "address" },
    ],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
] as const;

async function main() {
  console.log(`Verifying AgentVault at: ${CANONICAL_ADDRESS}\n`);

  // 1. eth_getCode
  const code = await pub.getCode({ address: CANONICAL_ADDRESS });
  if (!code || code === "0x") {
    console.error("FAIL: No bytecode at address");
    process.exit(1);
  }
  console.log(`[OK] eth_getCode: bytecode exists (${code.length} chars)`);

  // 2. getDelegatedUsers
  const zeroAddr = "0x0000000000000000000000000000000000000000" as Address;
  const users = await pub.readContract({
    address: CANONICAL_ADDRESS,
    abi: AgentVaultABI,
    functionName: "getDelegatedUsers",
    args: [zeroAddr],
  });
  console.log(`[OK] getDelegatedUsers(0x0): returned ${users.length} users`);

  // 3. getPermNonce
  const nonce = await pub.readContract({
    address: CANONICAL_ADDRESS,
    abi: AgentVaultABI,
    functionName: "getPermNonce",
    args: [zeroAddr, zeroAddr],
  });
  console.log(`[OK] getPermNonce(0x0, 0x0): ${nonce}`);

  console.log("\nAll checks passed. Canonical address confirmed.");
}

main().catch((err) => {
  console.error("Verification failed:", err.message);
  process.exit(1);
});
