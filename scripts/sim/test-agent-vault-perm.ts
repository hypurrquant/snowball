/**
 * Check AgentVault permission state for User #5
 */
import { createPublicClient, http, type Address, toFunctionSelector } from "viem";

const RPC = "https://rpc.cc3-testnet.creditcoin.network";
const client = createPublicClient({ transport: http(RPC) });

const USER5 = "0xdC810e6749C8D6c5108f0143845Bb61a3059bEb2" as Address;
const AGENT_VAULT = "0x7bca6fb903cc564d92ed5384512976c94f2730d7" as Address;
const DEPLOYER = "0xE550Afa5f8C81D7c3219a4Ece9c2e58618C125c6" as Address;

const WCTC = "0xca69344e2917f026ef4a5ace5d7b122343fc8528" as Address;
const LSTCTC = "0xa768d376272f9216c8c4aa3063391bdafbcad4c2" as Address;
const SBUSD = "0x8aefed3e2e9a886bdd72ec9cebe27d7aabced2a5" as Address;

const AgentVaultABI = [
  { type: "function", name: "getPermission", inputs: [{ name: "user", type: "address" }, { name: "agent", type: "address" }, { name: "tokens", type: "address[]" }], outputs: [{ name: "", type: "tuple", components: [{ name: "allowedTargets", type: "address[]" }, { name: "allowedFunctions", type: "bytes4[]" }, { name: "expiry", type: "uint256" }, { name: "active", type: "bool" }, { name: "tokenAllowances", type: "tuple[]", components: [{ name: "token", type: "address" }, { name: "cap", type: "uint256" }, { name: "spent", type: "uint256" }] }] }], stateMutability: "view" },
  { type: "function", name: "getBalance", inputs: [{ name: "user", type: "address" }, { name: "token", type: "address" }], outputs: [{ name: "", type: "uint256" }], stateMutability: "view" },
  { type: "function", name: "getDelegatedUsers", inputs: [{ name: "agent", type: "address" }], outputs: [{ name: "", type: "address[]" }], stateMutability: "view" },
] as const;

const ADJUST_RATE_SEL = toFunctionSelector("adjustTroveInterestRate(uint256,uint256,uint256,uint256,uint256)");
const ADD_COLL_SEL = toFunctionSelector("addColl(uint256,uint256)");

async function main() {
  console.log("=== AgentVault Permission Check ===\n");

  // Check with deployer as agent
  const tokens = [WCTC, LSTCTC, SBUSD];
  const perm = await client.readContract({
    address: AGENT_VAULT,
    abi: AgentVaultABI,
    functionName: "getPermission",
    args: [USER5, DEPLOYER, tokens],
  }) as any;

  console.log("User:", USER5);
  console.log("Agent (deployer):", DEPLOYER);
  console.log("Permission active:", perm.active);
  console.log("Expiry:", perm.expiry.toString());
  console.log("Allowed targets:", perm.allowedTargets);
  console.log("Allowed functions:", perm.allowedFunctions);
  console.log("Token allowances:", perm.tokenAllowances.map((t: any) => ({
    token: t.token,
    cap: t.cap.toString(),
    spent: t.spent.toString(),
  })));

  console.log(`\nExpected selectors:`);
  console.log(`  adjustTroveInterestRate: ${ADJUST_RATE_SEL}`);
  console.log(`  addColl: ${ADD_COLL_SEL}`);

  const hasAdjust = perm.allowedFunctions.some((f: string) => f.toLowerCase() === ADJUST_RATE_SEL.toLowerCase());
  const hasAddColl = perm.allowedFunctions.some((f: string) => f.toLowerCase() === ADD_COLL_SEL.toLowerCase());
  console.log(`\nPermission check:`);
  console.log(`  adjustTroveInterestRate: ${hasAdjust ? "✅" : "❌"}`);
  console.log(`  addColl: ${hasAddColl ? "✅" : "❌"}`);

  // Vault balances
  console.log("\n=== Vault Balances ===");
  for (const [name, token] of [["wCTC", WCTC], ["lstCTC", LSTCTC], ["sbUSD", SBUSD]] as const) {
    const bal = await client.readContract({ address: AGENT_VAULT, abi: AgentVaultABI, functionName: "getBalance", args: [USER5, token] }) as bigint;
    console.log(`  ${name}: ${(Number(bal) / 1e18).toFixed(4)}`);
  }
}

main().catch(console.error);
