/**
 * 이자율 관리 대화형 CLI
 *
 * 사용법:
 *   NODE_PATH=apps/web/node_modules npx tsx scripts/sim/interest-rate-cli.ts <command> [args]
 *
 * Commands:
 *   setup          두 Trove 열기 (User #5 + MM #1)
 *   status         현재 상태 대시보드
 *   mm <rate%>     Market Maker 이자율 변경 (예: mm 15)
 *   user <rate%>   User 이자율 변경 (예: user 13.4)
 *   check          Agent 분석 — user rate vs avg rate 비교, 추천 출력
 */

import {
  createPublicClient,
  createWalletClient,
  http,
  parseEther,
  formatEther,
  maxUint256,
  keccak256,
  encodeAbiParameters,
  defineChain,
  type Address,
  type WalletClient,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import accounts from "../simulation-accounts.json";

// ─── Chain ───

const cc3Testnet = defineChain({
  id: 102031,
  name: "Creditcoin3 Testnet",
  nativeCurrency: { name: "CTC", symbol: "tCTC", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://rpc.cc3-testnet.creditcoin.network"] },
  },
});

const transport = http("https://rpc.cc3-testnet.creditcoin.network");
const publicClient = createPublicClient({ chain: cc3Testnet, transport });

// ─── Contracts ───

const WCTC = "0xca69344e2917f026ef4a5ace5d7b122343fc8528" as Address;
const BORROWER_OPS =
  "0xb637f375cbbd278ace5fdba53ad868ae7cb186ea" as Address;
const TROVE_MANAGER =
  "0xa20f9dfeb110e11c89147b9db5adb98a7d91e70e" as Address;
const ACTIVE_POOL =
  "0xa7f0600a023cf6076f5d8dc51b46b91bafe095e5" as Address;
const SORTED_TROVES =
  "0xf5ef344759df7786cda9d2133e4d1e10e3b43f9f" as Address;
const HINT_HELPERS =
  "0x6ee9850b0915763bdc0c7edca8b66189449a447f" as Address;
const ZERO = "0x0000000000000000000000000000000000000000" as Address;
const GAS_COMP = parseEther("0.2");

// ─── ABIs ───

const ERC20ABI = [
  {
    type: "function",
    name: "approve",
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ type: "bool" }],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "balanceOf",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ type: "uint256" }],
    stateMutability: "view",
  },
] as const;

const BorrowerOpsABI = [
  {
    type: "function",
    name: "openTrove",
    inputs: [
      { name: "owner", type: "address" },
      { name: "ownerIndex", type: "uint256" },
      { name: "collAmount", type: "uint256" },
      { name: "boldAmount", type: "uint256" },
      { name: "upperHint", type: "uint256" },
      { name: "lowerHint", type: "uint256" },
      { name: "annualInterestRate", type: "uint256" },
      { name: "maxUpfrontFee", type: "uint256" },
      { name: "addManager", type: "address" },
      { name: "removeManager", type: "address" },
      { name: "receiver", type: "address" },
    ],
    outputs: [{ name: "troveId", type: "uint256" }],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "adjustTroveInterestRate",
    inputs: [
      { name: "_troveId", type: "uint256" },
      { name: "_newAnnualInterestRate", type: "uint256" },
      { name: "_upperHint", type: "uint256" },
      { name: "_lowerHint", type: "uint256" },
      { name: "_maxUpfrontFee", type: "uint256" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
] as const;

const TroveManagerABI = [
  {
    type: "function",
    name: "getLatestTroveData",
    inputs: [{ name: "troveId", type: "uint256" }],
    outputs: [
      {
        name: "",
        type: "tuple",
        components: [
          { name: "entireDebt", type: "uint256" },
          { name: "entireColl", type: "uint256" },
          { name: "redistDebtGain", type: "uint256" },
          { name: "redistCollGain", type: "uint256" },
          { name: "accruedInterest", type: "uint256" },
          { name: "recordedDebt", type: "uint256" },
          { name: "annualInterestRate", type: "uint256" },
          { name: "weightedRecordedDebt", type: "uint256" },
          { name: "accruedBatchManagementFee", type: "uint256" },
          { name: "lastInterestRateAdjTime", type: "uint256" },
        ],
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getTroveStatus",
    inputs: [{ name: "troveId", type: "uint256" }],
    outputs: [{ type: "uint8" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getTroveIdsCount",
    inputs: [],
    outputs: [{ type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getTroveFromTroveIdsArray",
    inputs: [{ name: "_index", type: "uint256" }],
    outputs: [{ type: "uint256" }],
    stateMutability: "view",
  },
] as const;

const ActivePoolABI = [
  {
    type: "function",
    name: "aggWeightedDebtSum",
    inputs: [],
    outputs: [{ type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "aggRecordedDebt",
    inputs: [],
    outputs: [{ type: "uint256" }],
    stateMutability: "view",
  },
] as const;

const HintHelpersABI = [
  {
    type: "function",
    name: "getApproxHint",
    inputs: [
      { name: "branchIdx", type: "uint256" },
      { name: "interestRate", type: "uint256" },
      { name: "numTrials", type: "uint256" },
      { name: "inputRandomSeed", type: "uint256" },
    ],
    outputs: [
      { name: "hintId", type: "uint256" },
      { name: "diff", type: "uint256" },
      { name: "latestRandomSeed", type: "uint256" },
    ],
    stateMutability: "view",
  },
] as const;

const SortedTrovesABI = [
  {
    type: "function",
    name: "findInsertPosition",
    inputs: [
      { name: "_annualInterestRate", type: "uint256" },
      { name: "_prevId", type: "uint256" },
      { name: "_nextId", type: "uint256" },
    ],
    outputs: [{ type: "uint256" }, { type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getSize",
    inputs: [],
    outputs: [{ type: "uint256" }],
    stateMutability: "view",
  },
] as const;

// ─── Helpers ───

function makeWallet(privateKey: string): WalletClient {
  const account = privateKeyToAccount(privateKey as `0x${string}`);
  return createWalletClient({ account, chain: cc3Testnet, transport });
}

async function waitTx(hash: `0x${string}`, label: string) {
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  if (receipt.status === "reverted")
    throw new Error(`REVERTED: ${label} — ${hash}`);
  console.log(`  [OK] ${label} — ${hash}`);
  return receipt;
}

function computeTroveId(owner: Address, ownerIndex: bigint): bigint {
  // BorrowerOperations.sol: keccak256(abi.encode(msg.sender, _owner, _ownerIndex))
  // When owner calls directly: msg.sender == owner
  return BigInt(
    keccak256(
      encodeAbiParameters(
        [{ type: "address" }, { type: "address" }, { type: "uint256" }],
        [owner, owner, ownerIndex],
      ),
    ),
  );
}

function fmtRate(rate: bigint): string {
  return `${(Number(rate) / 1e16).toFixed(2)}%`;
}

function fmtDebt(val: bigint): string {
  return `${Number(formatEther(val)).toFixed(1)} sbUSD`;
}

async function findHints(
  rate: bigint,
): Promise<{ upper: bigint; lower: bigint }> {
  const size = (await publicClient.readContract({
    address: SORTED_TROVES,
    abi: SortedTrovesABI,
    functionName: "getSize",
  })) as bigint;

  if (size === 0n) return { upper: 0n, lower: 0n };

  const numTrials = BigInt(Math.min(Number(size) * 15, 100));
  const seed = BigInt(Math.floor(Math.random() * 1e10));

  const result = (await publicClient.readContract({
    address: HINT_HELPERS,
    abi: HintHelpersABI,
    functionName: "getApproxHint",
    args: [0n, rate, numTrials, seed],
  })) as [bigint, bigint, bigint];

  const [upper, lower] = (await publicClient.readContract({
    address: SORTED_TROVES,
    abi: SortedTrovesABI,
    functionName: "findInsertPosition",
    args: [rate, result[0], result[0]],
  })) as [bigint, bigint];

  return { upper, lower };
}

// ─── State ───

interface TroveInfo {
  entireDebt: bigint;
  entireColl: bigint;
  annualInterestRate: bigint;
}

const userWallet = makeWallet(accounts.accounts[4].privateKey); // #5
const mmWallet = makeWallet(accounts.accounts[0].privateKey); // #1
const userAddr = userWallet.account!.address;
const mmAddr = mmWallet.account!.address;
const userTroveId = computeTroveId(userAddr, 0n);
const mmTroveId = computeTroveId(mmAddr, 0n);

async function getTroveInfo(troveId: bigint): Promise<TroveInfo | null> {
  const status = (await publicClient.readContract({
    address: TROVE_MANAGER,
    abi: TroveManagerABI,
    functionName: "getTroveStatus",
    args: [troveId],
  })) as number;

  if (status !== 1) return null;

  const data = (await publicClient.readContract({
    address: TROVE_MANAGER,
    abi: TroveManagerABI,
    functionName: "getLatestTroveData",
    args: [troveId],
  })) as any;

  return {
    entireDebt: data.entireDebt,
    entireColl: data.entireColl,
    annualInterestRate: data.annualInterestRate,
  };
}

async function getAvgRate(): Promise<bigint> {
  const [weightedSum, totalDebt] = await Promise.all([
    publicClient.readContract({
      address: ACTIVE_POOL,
      abi: ActivePoolABI,
      functionName: "aggWeightedDebtSum",
    }) as Promise<bigint>,
    publicClient.readContract({
      address: ACTIVE_POOL,
      abi: ActivePoolABI,
      functionName: "aggRecordedDebt",
    }) as Promise<bigint>,
  ]);
  if (totalDebt === 0n) return 0n;
  return weightedSum / totalDebt;
}

async function getAllTroves(): Promise<
  { id: bigint; rate: bigint; debt: bigint }[]
> {
  const count = (await publicClient.readContract({
    address: TROVE_MANAGER,
    abi: TroveManagerABI,
    functionName: "getTroveIdsCount",
  })) as bigint;

  const troves: { id: bigint; rate: bigint; debt: bigint }[] = [];
  for (let i = 0n; i < count; i++) {
    const id = (await publicClient.readContract({
      address: TROVE_MANAGER,
      abi: TroveManagerABI,
      functionName: "getTroveFromTroveIdsArray",
      args: [i],
    })) as bigint;

    const info = await getTroveInfo(id);
    if (info) {
      troves.push({ id, rate: info.annualInterestRate, debt: info.entireDebt });
    }
  }
  return troves;
}

// ─── Commands ───

async function cmdSetup() {
  console.log("=== Setup: Opening Troves ===\n");

  for (const { wallet, label, coll, debt, rate } of [
    {
      wallet: userWallet,
      label: "User(#5)",
      coll: parseEther("500"),
      debt: parseEther("1000"),
      rate: parseEther("0.05"),
    },
    {
      wallet: mmWallet,
      label: "MM(#1)",
      coll: parseEther("2000"),
      debt: parseEther("4000"),
      rate: parseEther("0.06"),
    },
  ]) {
    const addr = wallet.account!.address;
    const troveId = computeTroveId(addr, 0n);
    const existing = await getTroveInfo(troveId);

    if (existing) {
      console.log(
        `  ${label}: Already exists (rate: ${fmtRate(existing.annualInterestRate)}, debt: ${fmtDebt(existing.entireDebt)})`,
      );
      continue;
    }

    const bal = (await publicClient.readContract({
      address: WCTC,
      abi: ERC20ABI,
      functionName: "balanceOf",
      args: [addr],
    })) as bigint;

    if (bal < coll + GAS_COMP) {
      console.log(
        `  ${label}: wCTC insufficient (need ${formatEther(coll + GAS_COMP)}, have ${formatEther(bal)})`,
      );
      continue;
    }

    console.log(
      `  ${label}: Opening — ${formatEther(coll)} wCTC, ${formatEther(debt)} sbUSD, ${fmtRate(rate)}`,
    );

    const approveTx = await wallet.writeContract({
      address: WCTC,
      abi: ERC20ABI,
      functionName: "approve",
      args: [BORROWER_OPS, coll + GAS_COMP],
    });
    await waitTx(approveTx, `${label} approve`);

    const openTx = await wallet.writeContract({
      address: BORROWER_OPS,
      abi: BorrowerOpsABI,
      functionName: "openTrove",
      args: [addr, 0n, coll, debt, 0n, 0n, rate, maxUint256, ZERO, ZERO, ZERO],
    });
    await waitTx(openTx, `${label} openTrove`);
  }

  console.log("");
  await cmdStatus();
}

async function cmdStatus() {
  const [userData, mmData, avg, allTroves] = await Promise.all([
    getTroveInfo(userTroveId),
    getTroveInfo(mmTroveId),
    getAvgRate(),
    getAllTroves(),
  ]);

  const bar = "=".repeat(60);
  const line = "-".repeat(60);

  console.log(bar);
  console.log(`  STATUS | ${new Date().toLocaleTimeString("ko-KR")}`);
  console.log(bar);
  console.log(`  Avg Interest Rate:    ${fmtRate(avg)}`);

  if (userData) {
    console.log(
      `  User (#5) Rate:       ${fmtRate(userData.annualInterestRate)}  (debt: ${fmtDebt(userData.entireDebt)}, coll: ${formatEther(userData.entireColl)} wCTC)`,
    );
  } else {
    console.log(`  User (#5):            NO TROVE`);
  }

  if (mmData) {
    console.log(
      `  Market Maker (#1):    ${fmtRate(mmData.annualInterestRate)}  (debt: ${fmtDebt(mmData.entireDebt)}, coll: ${formatEther(mmData.entireColl)} wCTC)`,
    );
  } else {
    console.log(`  Market Maker (#1):    NO TROVE`);
  }

  console.log(line);
  console.log(`  All Troves (${allTroves.length}):`);
  for (const t of allTroves) {
    const tag =
      t.id === userTroveId ? " <-- User" : t.id === mmTroveId ? " <-- MM" : "";
    console.log(
      `    ${fmtRate(t.rate).padEnd(8)} | ${fmtDebt(t.debt).padEnd(18)}${tag}`,
    );
  }
  console.log(bar);
}

async function cmdAdjustRate(
  wallet: WalletClient,
  troveId: bigint,
  ratePercent: number,
  label: string,
) {
  const newRate = parseEther((ratePercent / 100).toString());
  console.log(`\n  ${label}: Adjusting rate to ${fmtRate(newRate)}...`);

  const { upper, lower } = await findHints(newRate);

  const tx = await wallet.writeContract({
    address: BORROWER_OPS,
    abi: BorrowerOpsABI,
    functionName: "adjustTroveInterestRate",
    args: [troveId, newRate, upper, lower, maxUint256],
  });
  await waitTx(tx, `${label} adjustRate -> ${fmtRate(newRate)}`);

  console.log("");
  await cmdStatus();
}

async function cmdCheck() {
  const [userData, avg] = await Promise.all([
    getTroveInfo(userTroveId),
    getAvgRate(),
  ]);

  if (!userData) {
    console.log("  User has no active Trove. Run 'setup' first.");
    return;
  }

  const userRate = userData.annualInterestRate;
  const buffer = parseEther("0.01"); // 1%
  const target = avg + buffer;

  console.log("\n=== Agent Analysis ===\n");
  console.log(`  Avg Rate:   ${fmtRate(avg)}`);
  console.log(`  User Rate:  ${fmtRate(userRate)}`);

  if (userRate < avg) {
    console.log(
      `\n  RECOMMENDATION: RAISE to ${fmtRate(target)}`,
    );
    console.log(`  Reason: user rate(${fmtRate(userRate)}) < avg(${fmtRate(avg)})`);
    console.log(
      `  Run: user ${(Number(target) / 1e16).toFixed(2)}`,
    );
  } else if (userRate > avg + buffer * 2n) {
    console.log(
      `\n  RECOMMENDATION: LOWER to ${fmtRate(target)}`,
    );
    console.log(
      `  Reason: user rate(${fmtRate(userRate)}) >> avg(${fmtRate(avg)}) + 2%`,
    );
    console.log(
      `  Run: user ${(Number(target) / 1e16).toFixed(2)}`,
    );
  } else {
    console.log(`\n  OK — rate is within acceptable range`);
    console.log(
      `  Range: ${fmtRate(avg)} ~ ${fmtRate(avg + buffer * 2n)}`,
    );
  }
}

// ─── Main ───

async function main() {
  const [cmd, ...args] = process.argv.slice(2);

  switch (cmd) {
    case "setup":
      await cmdSetup();
      break;
    case "status":
      await cmdStatus();
      break;
    case "mm": {
      const rate = parseFloat(args[0]);
      if (isNaN(rate)) {
        console.log("Usage: mm <rate%>  (e.g., mm 15)");
        break;
      }
      await cmdAdjustRate(mmWallet, mmTroveId, rate, "MM(#1)");
      break;
    }
    case "user": {
      const rate = parseFloat(args[0]);
      if (isNaN(rate)) {
        console.log("Usage: user <rate%>  (e.g., user 13.4)");
        break;
      }
      await cmdAdjustRate(userWallet, userTroveId, rate, "User(#5)");
      break;
    }
    case "check":
      await cmdCheck();
      break;
    default:
      console.log("Interest Rate CLI");
      console.log("  setup          Open both Troves");
      console.log("  status         Show dashboard");
      console.log("  mm <rate%>     Adjust MM rate (e.g., mm 15)");
      console.log("  user <rate%>   Adjust User rate (e.g., user 13.4)");
      console.log("  check          Agent analysis");
  }
}

main().catch((err) => {
  console.error("ERROR:", err.message ?? err);
  process.exit(1);
});
