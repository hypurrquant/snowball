/**
 * v0.23.0 Agent E2E Pre-check
 * On-chain state verification before running agent-server test
 */
import { createPublicClient, http, formatEther, type Address } from "viem";

const RPC = "https://rpc.cc3-testnet.creditcoin.network";
const client = createPublicClient({ transport: http(RPC) });

// Accounts
const USER5 = "0xdC810e6749C8D6c5108f0143845Bb61a3059bEb2" as Address;
const MM1 = "0x4BBae64C6d84E4dCD843CfEFB92A9E1d9400BD20" as Address;
const AGENT_VAULT = "0x7bca6fb903cc564d92ed5384512976c94f2730d7" as Address;
const AGENT_EOA = "0xE550Afa5f8C81D7c3219a4Ece9c2e58618C125c6" as Address; // deployer used as agent

// wCTC branch
const TROVE_MANAGER = "0xa20f9dfeb110e11c89147b9db5adb98a7d91e70e" as Address;
const BORROWER_OPS = "0xb637f375cbbd278ace5fdba53ad868ae7cb186ea" as Address;
const ACTIVE_POOL = "0xa7f0600a023cf6076f5d8dc51b46b91bafe095e5" as Address;
const TROVE_NFT = "0x72e383eff50893e2b2edeb711a81c3a812dcd2f9" as Address;

// lstCTC branch
const LSTCTC_TROVE_MANAGER = "0x83715c7e9873b0b8208adbbf8e07f31e83b94aed" as Address;
const LSTCTC_ACTIVE_POOL = "0xa57cca34198bf262a278da3b2b7a8a5f032cb835" as Address;
const LSTCTC_TROVE_NFT = "0x51a90151e0dd1348e77ee6bcc30278ee311f29a8" as Address;

const TroveManagerABI = [
  { type: "function", name: "getTroveIdsCount", inputs: [], outputs: [{ name: "", type: "uint256" }], stateMutability: "view" },
  { type: "function", name: "getTroveFromTroveIdsArray", inputs: [{ name: "_index", type: "uint256" }], outputs: [{ name: "", type: "uint256" }], stateMutability: "view" },
  { type: "function", name: "getLatestTroveData", inputs: [{ name: "_troveId", type: "uint256" }], outputs: [{ name: "", type: "tuple", components: [{ name: "entireDebt", type: "uint256" }, { name: "entireColl", type: "uint256" }, { name: "redistDebtGain", type: "uint256" }, { name: "redistCollGain", type: "uint256" }, { name: "accruedInterest", type: "uint256" }, { name: "recordedDebt", type: "uint256" }, { name: "annualInterestRate", type: "uint256" }, { name: "weightedRecordedDebt", type: "uint256" }, { name: "accruedBatchManagementFee", type: "uint256" }, { name: "lastInterestRateAdjTime", type: "uint256" }] }], stateMutability: "view" },
  { type: "function", name: "getTroveStatus", inputs: [{ name: "_troveId", type: "uint256" }], outputs: [{ name: "", type: "uint8" }], stateMutability: "view" },
] as const;

const TroveNFTABI = [
  { type: "function", name: "balanceOf", inputs: [{ name: "owner", type: "address" }], outputs: [{ type: "uint256" }], stateMutability: "view" },
  { type: "function", name: "tokenOfOwnerByIndex", inputs: [{ name: "owner", type: "address" }, { name: "index", type: "uint256" }], outputs: [{ type: "uint256" }], stateMutability: "view" },
] as const;

const ActivePoolABI = [
  { type: "function", name: "aggWeightedDebtSum", inputs: [], outputs: [{ name: "", type: "uint256" }], stateMutability: "view" },
  { type: "function", name: "aggRecordedDebt", inputs: [], outputs: [{ name: "", type: "uint256" }], stateMutability: "view" },
] as const;

const AddRemoveManagersABI = [
  { type: "function", name: "addManagerOf", inputs: [{ name: "_troveId", type: "uint256" }], outputs: [{ type: "address" }], stateMutability: "view" },
] as const;

const InterestDelegateABI = [
  { type: "function", name: "getInterestIndividualDelegateOf", inputs: [{ name: "_troveId", type: "uint256" }], outputs: [{ name: "", type: "tuple", components: [{ name: "account", type: "address" }, { name: "minInterestRate", type: "uint128" }, { name: "maxInterestRate", type: "uint128" }, { name: "minInterestRateChangePeriod", type: "uint256" }] }], stateMutability: "view" },
] as const;

const AgentVaultABI = [
  { type: "function", name: "getDelegatedUsers", inputs: [{ name: "agent", type: "address" }], outputs: [{ name: "", type: "address[]" }], stateMutability: "view" },
] as const;

async function findTroveId(troveNFT: Address, owner: Address): Promise<bigint> {
  try {
    const balance = await client.readContract({ address: troveNFT, abi: TroveNFTABI, functionName: "balanceOf", args: [owner] }) as bigint;
    if (balance === 0n) return 0n;
    return await client.readContract({ address: troveNFT, abi: TroveNFTABI, functionName: "tokenOfOwnerByIndex", args: [owner, 0n] }) as bigint;
  } catch { return 0n; }
}

async function checkBranch(label: string, troveManager: Address, activePool: Address, troveNFT: Address, borrowerOps: Address, user: Address) {
  console.log(`\n=== ${label} Branch ===`);

  // Trove count
  const count = await client.readContract({ address: troveManager, abi: TroveManagerABI, functionName: "getTroveIdsCount" }) as bigint;
  console.log(`Total troves: ${count}`);

  // Avg interest rate
  try {
    const [weightedSum, recordedDebt] = await Promise.all([
      client.readContract({ address: activePool, abi: ActivePoolABI, functionName: "aggWeightedDebtSum" }) as Promise<bigint>,
      client.readContract({ address: activePool, abi: ActivePoolABI, functionName: "aggRecordedDebt" }) as Promise<bigint>,
    ]);
    const avgRate = recordedDebt > 0n ? weightedSum / recordedDebt : 0n;
    console.log(`Avg interest rate: ${(Number(avgRate) / 1e16).toFixed(2)}%`);
    console.log(`  aggWeightedDebtSum: ${formatEther(weightedSum)}`);
    console.log(`  aggRecordedDebt: ${formatEther(recordedDebt)}`);
  } catch (e) {
    console.log(`Avg rate: ERROR - ${e}`);
  }

  // User trove
  const troveId = await findTroveId(troveNFT, user);
  if (troveId === 0n) {
    console.log(`User ${user.slice(0,10)}... has NO trove on ${label}`);
    return { troveId: 0n, hasDelegate: false };
  }

  console.log(`User troveId: ${troveId}`);
  const troveData = await client.readContract({ address: troveManager, abi: TroveManagerABI, functionName: "getLatestTroveData", args: [troveId] }) as any;
  const status = await client.readContract({ address: troveManager, abi: TroveManagerABI, functionName: "getTroveStatus", args: [troveId] }) as number;
  console.log(`  status: ${status} (1=active)`);
  console.log(`  collateral: ${formatEther(troveData.entireColl)} CTC`);
  console.log(`  debt: ${formatEther(troveData.entireDebt)} sbUSD`);
  console.log(`  annualInterestRate: ${(Number(troveData.annualInterestRate) / 1e16).toFixed(2)}%`);

  // Delegation status
  const addManager = await client.readContract({ address: borrowerOps, abi: AddRemoveManagersABI, functionName: "addManagerOf", args: [troveId] }) as Address;
  const delegateInfo = await client.readContract({ address: borrowerOps, abi: InterestDelegateABI, functionName: "getInterestIndividualDelegateOf", args: [troveId] }) as any;

  const isAddManager = addManager.toLowerCase() === AGENT_VAULT.toLowerCase();
  const isInterestDelegate = delegateInfo.account.toLowerCase() === AGENT_VAULT.toLowerCase();
  console.log(`  addManager: ${addManager} ${isAddManager ? "== AgentVault ✅" : "!= AgentVault ❌"}`);
  console.log(`  interestDelegate: ${delegateInfo.account} ${isInterestDelegate ? "== AgentVault ✅" : "!= AgentVault ❌"}`);
  if (isInterestDelegate) {
    console.log(`    minRate: ${(Number(delegateInfo.minInterestRate) / 1e16).toFixed(2)}%`);
    console.log(`    maxRate: ${(Number(delegateInfo.maxInterestRate) / 1e16).toFixed(2)}%`);
  }

  return { troveId, hasDelegate: isAddManager && isInterestDelegate };
}

async function main() {
  console.log("=== Agent E2E Pre-check ===");
  console.log(`User #5: ${USER5}`);
  console.log(`MM #1: ${MM1}`);
  console.log(`AgentVault: ${AGENT_VAULT}`);

  // AgentVault delegated users
  try {
    const delegatedUsers = await client.readContract({ address: AGENT_VAULT, abi: AgentVaultABI, functionName: "getDelegatedUsers", args: [AGENT_EOA] }) as Address[];
    console.log(`\nDelegated users (for agent EOA ${AGENT_EOA.slice(0,10)}...): ${delegatedUsers.length}`);
    delegatedUsers.forEach((u, i) => console.log(`  [${i}] ${u}`));
  } catch (e) {
    console.log(`getDelegatedUsers ERROR: ${e}`);
  }

  // wCTC branch
  const wctcResult = await checkBranch("wCTC", TROVE_MANAGER, ACTIVE_POOL, TROVE_NFT, BORROWER_OPS, USER5);

  // lstCTC branch
  const lstctcResult = await checkBranch("lstCTC", LSTCTC_TROVE_MANAGER, LSTCTC_ACTIVE_POOL, LSTCTC_TROVE_NFT, "0x8700ed43989e2f935ab8477dd8b2822cae7f60ca" as Address, USER5);

  // MM #1 trove check
  console.log("\n=== Market Maker #1 ===");
  const mmTroveId = await findTroveId(TROVE_NFT, MM1);
  if (mmTroveId > 0n) {
    const mmData = await client.readContract({ address: TROVE_MANAGER, abi: TroveManagerABI, functionName: "getLatestTroveData", args: [mmTroveId] }) as any;
    console.log(`MM troveId: ${mmTroveId}`);
    console.log(`  rate: ${(Number(mmData.annualInterestRate) / 1e16).toFixed(2)}%`);
    console.log(`  debt: ${formatEther(mmData.entireDebt)} sbUSD`);
  } else {
    console.log("MM #1 has NO trove on wCTC");
  }

  // Summary
  console.log("\n=== Summary ===");
  console.log(`wCTC: User trove=${wctcResult.troveId > 0n ? "YES" : "NO"}, delegated=${wctcResult.hasDelegate ? "YES" : "NO"}`);
  console.log(`lstCTC: User trove=${lstctcResult.troveId > 0n ? "YES" : "NO"}, delegated=${lstctcResult.hasDelegate ? "YES" : "NO"}`);
}

main().catch(console.error);
