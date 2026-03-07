/**
 * Scan all troves on wCTC branch to find owners
 */
import { createPublicClient, http, formatEther, type Address } from "viem";

const RPC = "https://rpc.cc3-testnet.creditcoin.network";
const client = createPublicClient({ transport: http(RPC) });

const TROVE_MANAGER = "0xa20f9dfeb110e11c89147b9db5adb98a7d91e70e" as Address;
const TROVE_NFT = "0x72e383eff50893e2b2edeb711a81c3a812dcd2f9" as Address;
const BORROWER_OPS = "0xb637f375cbbd278ace5fdba53ad868ae7cb186ea" as Address;
const AGENT_VAULT = "0x7bca6fb903cc564d92ed5384512976c94f2730d7" as Address;

const accounts = {
  "0xe550afa5f8c81d7c3219a4ece9c2e58618c125c6": "Deployer",
  "0x4bbae64c6d84e4dcd843cfefb92a9e1d9400bd20": "#1 Whale LP",
  "0x66a9d2919804f15c5fba1de9e3bae70ecdc15ad0": "#2 Active Trader",
  "0x745a55dad672207d726d6486edd7f1ddc7ec4e5c": "#3 Arbitrageur",
  "0xe84206ed3dcac3096248369d3240ad03e4dc2e2f": "#4 Conservative Lender",
  "0xdc810e6749c8d6c5108f0143845bb61a3059beb2": "#5 Moderate Borrower",
  "0x1c5a792130b7822084d4df53fd68810198e96378": "#6 Aggressive Borrower",
  "0x2cb476b2ee7dc11f13b76a149227144b8cef7e1b": "#7 Multi-Market",
  "0x8fe61c705865125018903132cd7f2ee1d2cf5ac5": "#8 DeFi Maximalist",
};

const TroveManagerABI = [
  { type: "function", name: "getTroveIdsCount", inputs: [], outputs: [{ name: "", type: "uint256" }], stateMutability: "view" },
  { type: "function", name: "getTroveFromTroveIdsArray", inputs: [{ name: "_index", type: "uint256" }], outputs: [{ name: "", type: "uint256" }], stateMutability: "view" },
  { type: "function", name: "getLatestTroveData", inputs: [{ name: "_troveId", type: "uint256" }], outputs: [{ name: "", type: "tuple", components: [{ name: "entireDebt", type: "uint256" }, { name: "entireColl", type: "uint256" }, { name: "redistDebtGain", type: "uint256" }, { name: "redistCollGain", type: "uint256" }, { name: "accruedInterest", type: "uint256" }, { name: "recordedDebt", type: "uint256" }, { name: "annualInterestRate", type: "uint256" }, { name: "weightedRecordedDebt", type: "uint256" }, { name: "accruedBatchManagementFee", type: "uint256" }, { name: "lastInterestRateAdjTime", type: "uint256" }] }], stateMutability: "view" },
  { type: "function", name: "getTroveStatus", inputs: [{ name: "_troveId", type: "uint256" }], outputs: [{ name: "", type: "uint8" }], stateMutability: "view" },
] as const;

const TroveNFTABI = [
  { type: "function", name: "ownerOf", inputs: [{ name: "tokenId", type: "uint256" }], outputs: [{ name: "", type: "address" }], stateMutability: "view" },
] as const;

const AddRemoveManagersABI = [
  { type: "function", name: "addManagerOf", inputs: [{ name: "_troveId", type: "uint256" }], outputs: [{ type: "address" }], stateMutability: "view" },
] as const;

const InterestDelegateABI = [
  { type: "function", name: "getInterestIndividualDelegateOf", inputs: [{ name: "_troveId", type: "uint256" }], outputs: [{ name: "", type: "tuple", components: [{ name: "account", type: "address" }, { name: "minInterestRate", type: "uint128" }, { name: "maxInterestRate", type: "uint128" }, { name: "minInterestRateChangePeriod", type: "uint256" }] }], stateMutability: "view" },
] as const;

async function main() {
  const count = await client.readContract({ address: TROVE_MANAGER, abi: TroveManagerABI, functionName: "getTroveIdsCount" }) as bigint;
  console.log(`wCTC branch: ${count} troves\n`);

  for (let i = 0n; i < count; i++) {
    const troveId = await client.readContract({ address: TROVE_MANAGER, abi: TroveManagerABI, functionName: "getTroveFromTroveIdsArray", args: [i] }) as bigint;
    const owner = await client.readContract({ address: TROVE_NFT, abi: TroveNFTABI, functionName: "ownerOf", args: [troveId] }) as Address;
    const data = await client.readContract({ address: TROVE_MANAGER, abi: TroveManagerABI, functionName: "getLatestTroveData", args: [troveId] }) as any;
    const status = await client.readContract({ address: TROVE_MANAGER, abi: TroveManagerABI, functionName: "getTroveStatus", args: [troveId] }) as number;

    const addManager = await client.readContract({ address: BORROWER_OPS, abi: AddRemoveManagersABI, functionName: "addManagerOf", args: [troveId] }) as Address;
    const delegateInfo = await client.readContract({ address: BORROWER_OPS, abi: InterestDelegateABI, functionName: "getInterestIndividualDelegateOf", args: [troveId] }) as any;

    const label = accounts[owner.toLowerCase() as keyof typeof accounts] || "Unknown";
    const isAV = addManager.toLowerCase() === AGENT_VAULT.toLowerCase();
    const isID = delegateInfo.account.toLowerCase() === AGENT_VAULT.toLowerCase();

    console.log(`[${i}] troveId=${troveId} status=${status} owner=${owner.slice(0,10)}...(${label})`);
    console.log(`    coll=${formatEther(data.entireColl)} debt=${formatEther(data.entireDebt)} rate=${(Number(data.annualInterestRate)/1e16).toFixed(2)}%`);
    console.log(`    addManager=${isAV?"AgentVault":"other"} interestDelegate=${isID?"AgentVault":"other("+delegateInfo.account.slice(0,10)+"...)"}`);
  }
}

main().catch(console.error);
