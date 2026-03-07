/**
 * Market Maker #1의 이자율을 변경하여 avg rate를 흔든다.
 * Usage: NODE_PATH=apps/web/node_modules npx tsx scripts/sim/test-mm-change-rate.ts <rate%>
 * Example: ... 15   → 15%로 변경
 */
import { createPublicClient, createWalletClient, http, formatEther, maxUint256, type Address } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import accounts from "../simulation-accounts.json";

const RPC = "https://rpc.cc3-testnet.creditcoin.network";
const chain = { id: 102031, name: "Creditcoin Testnet", nativeCurrency: { name: "CTC", symbol: "CTC", decimals: 18 }, rpcUrls: { default: { http: [RPC] } } };

const publicClient = createPublicClient({ transport: http(RPC) });

// MM #1
const mm = accounts.accounts[0]; // index 1 = Whale LP
const mmAccount = privateKeyToAccount(mm.privateKey as `0x${string}`);
const mmWallet = createWalletClient({ account: mmAccount, chain, transport: http(RPC) });

// wCTC branch
const TROVE_NFT = "0x72e383eff50893e2b2edeb711a81c3a812dcd2f9" as Address;
const TROVE_MANAGER = "0xa20f9dfeb110e11c89147b9db5adb98a7d91e70e" as Address;
const BORROWER_OPS = "0xb637f375cbbd278ace5fdba53ad868ae7cb186ea" as Address;
const SORTED_TROVES = "0xf5ef344759df7786cda9d2133e4d1e10e3b43f9f" as Address;
const HINT_HELPERS = "0x6ee9850b0915763bdc0c7edca8b66189449a447f" as Address;
const ACTIVE_POOL = "0xa7f0600a023cf6076f5d8dc51b46b91bafe095e5" as Address;

const TroveNFTABI = [
  { type: "function", name: "tokenOfOwnerByIndex", inputs: [{ name: "owner", type: "address" }, { name: "index", type: "uint256" }], outputs: [{ type: "uint256" }], stateMutability: "view" },
  { type: "function", name: "balanceOf", inputs: [{ name: "owner", type: "address" }], outputs: [{ type: "uint256" }], stateMutability: "view" },
] as const;

const TroveManagerABI = [
  { type: "function", name: "getLatestTroveData", inputs: [{ name: "_troveId", type: "uint256" }], outputs: [{ name: "", type: "tuple", components: [{ name: "entireDebt", type: "uint256" }, { name: "entireColl", type: "uint256" }, { name: "redistDebtGain", type: "uint256" }, { name: "redistCollGain", type: "uint256" }, { name: "accruedInterest", type: "uint256" }, { name: "recordedDebt", type: "uint256" }, { name: "annualInterestRate", type: "uint256" }, { name: "weightedRecordedDebt", type: "uint256" }, { name: "accruedBatchManagementFee", type: "uint256" }, { name: "lastInterestRateAdjTime", type: "uint256" }] }], stateMutability: "view" },
] as const;

const BorrowerOpsABI = [
  { type: "function", name: "adjustTroveInterestRate", inputs: [{ name: "troveId", type: "uint256" }, { name: "newAnnualInterestRate", type: "uint256" }, { name: "upperHint", type: "uint256" }, { name: "lowerHint", type: "uint256" }, { name: "maxUpfrontFee", type: "uint256" }], outputs: [], stateMutability: "nonpayable" },
] as const;

const HintHelpersABI = [
  { type: "function", name: "getApproxHint", inputs: [{ name: "branchIdx", type: "uint256" }, { name: "interestRate", type: "uint256" }, { name: "numTrials", type: "uint256" }, { name: "inputRandomSeed", type: "uint256" }], outputs: [{ name: "hintId", type: "uint256" }, { name: "diff", type: "uint256" }, { name: "latestRandomSeed", type: "uint256" }], stateMutability: "view" },
] as const;

const SortedTrovesABI = [
  { type: "function", name: "findInsertPosition", inputs: [{ name: "annualInterestRate", type: "uint256" }, { name: "prevId", type: "uint256" }, { name: "nextId", type: "uint256" }], outputs: [{ name: "upperHint", type: "uint256" }, { name: "lowerHint", type: "uint256" }], stateMutability: "view" },
] as const;

const ActivePoolABI = [
  { type: "function", name: "aggWeightedDebtSum", inputs: [], outputs: [{ name: "", type: "uint256" }], stateMutability: "view" },
  { type: "function", name: "aggRecordedDebt", inputs: [], outputs: [{ name: "", type: "uint256" }], stateMutability: "view" },
] as const;

async function main() {
  const targetPct = parseFloat(process.argv[2] || "15");
  const newRate = BigInt(Math.round(targetPct * 1e16)); // e.g. 15% = 15e16

  console.log(`=== MM #1 Rate Change: ${targetPct}% ===`);
  console.log(`MM address: ${mm.address}`);

  // MM #1 troveId from on-chain scan
  const troveId = 92408897392467206362459278187899798345896840828170861688819565866137755968206n;
  const data = await publicClient.readContract({ address: TROVE_MANAGER, abi: TroveManagerABI, functionName: "getLatestTroveData", args: [troveId] }) as any;
  console.log(`TroveId: ${troveId}`);
  console.log(`Current rate: ${(Number(data.annualInterestRate) / 1e16).toFixed(2)}%`);
  console.log(`Target rate: ${targetPct}%`);

  // Get hints
  const [approxHint] = await publicClient.readContract({
    address: HINT_HELPERS, abi: HintHelpersABI, functionName: "getApproxHint",
    args: [0n, newRate, 15n, BigInt(Math.floor(Math.random() * 1e10))],
  }) as readonly [bigint, bigint, bigint];

  const [upperHint, lowerHint] = await publicClient.readContract({
    address: SORTED_TROVES, abi: SortedTrovesABI, functionName: "findInsertPosition",
    args: [newRate, approxHint, approxHint],
  }) as readonly [bigint, bigint];

  // Execute
  const txHash = await mmWallet.writeContract({
    address: BORROWER_OPS,
    abi: BorrowerOpsABI,
    functionName: "adjustTroveInterestRate",
    args: [troveId, newRate, upperHint, lowerHint, maxUint256],
  });

  console.log(`TX: ${txHash}`);
  const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
  console.log(`Status: ${receipt.status}`);

  // Verify new avg rate
  const [weightedSum, recordedDebt] = await Promise.all([
    publicClient.readContract({ address: ACTIVE_POOL, abi: ActivePoolABI, functionName: "aggWeightedDebtSum" }) as Promise<bigint>,
    publicClient.readContract({ address: ACTIVE_POOL, abi: ActivePoolABI, functionName: "aggRecordedDebt" }) as Promise<bigint>,
  ]);
  const avgRate = recordedDebt > 0n ? weightedSum / recordedDebt : 0n;
  console.log(`\nNew avg rate: ${(Number(avgRate) / 1e16).toFixed(2)}%`);
  console.log(`User #5 rate: 4.76%`);
  console.log(`→ User rate ${4.76 < Number(avgRate) / 1e16 ? "<" : ">"} avg → Agent should ${4.76 < Number(avgRate) / 1e16 ? "RAISE" : "no action"}`);
}

main().catch(console.error);
