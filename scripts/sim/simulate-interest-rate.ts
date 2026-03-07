/**
 * 이자율 관리 시뮬레이션 (Interest Rate Management)
 *
 * 시나리오:
 * 1. User (Account #5) — wCTC Trove, 5% 이자율로 차입
 * 2. Market Maker (Account #1) — 대규모 Trove, 이자율 15%↔2% 진동으로 avg 흔들기
 * 3. Agent — 매 1분 루프, user rate vs avg rate 비교 → 이자율 조정
 *    - user rate < avg → 올리기
 *    - user rate > avg + 2% → 내리기
 *
 * 사용법: pnpm exec tsx scripts/sim/simulate-interest-rate.ts
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

// ─── Chain ───────────────────────────────────────────────

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

// ─── Config ──────────────────────────────────────────────

const LOOP_INTERVAL_MS = 60_000; // 1분
const MM_HIGH_RATE = parseEther("0.15"); // 15%
const MM_LOW_RATE = parseEther("0.02"); // 2%
const USER_INIT_RATE = parseEther("0.05"); // 5%
const RATE_BUFFER = parseEther("0.01"); // 1% 버퍼

// ─── Contracts ───────────────────────────────────────────

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

// ─── ABIs ────────────────────────────────────────────────

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

// ─── Helpers ─────────────────────────────────────────────

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
    args: [0n, rate, numTrials, seed], // branchIdx=0 (wCTC)
  })) as [bigint, bigint, bigint];

  const [upper, lower] = (await publicClient.readContract({
    address: SORTED_TROVES,
    abi: SortedTrovesABI,
    functionName: "findInsertPosition",
    args: [rate, result[0], result[0]],
  })) as [bigint, bigint];

  return { upper, lower };
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

// ─── State Readers ───────────────────────────────────────

interface TroveInfo {
  entireDebt: bigint;
  entireColl: bigint;
  annualInterestRate: bigint;
  lastInterestRateAdjTime: bigint;
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

async function getTroveInfo(troveId: bigint): Promise<TroveInfo | null> {
  const status = (await publicClient.readContract({
    address: TROVE_MANAGER,
    abi: TroveManagerABI,
    functionName: "getTroveStatus",
    args: [troveId],
  })) as number;

  if (status !== 1) return null; // not active

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
    lastInterestRateAdjTime: data.lastInterestRateAdjTime,
  };
}

async function getAllTroveSummary(): Promise<
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
      troves.push({
        id,
        rate: info.annualInterestRate,
        debt: info.entireDebt,
      });
    }
  }
  return troves;
}

// ─── Setup ───────────────────────────────────────────────

async function ensureTrove(
  wallet: WalletClient,
  label: string,
  collAmount: bigint,
  debtAmount: bigint,
  rate: bigint,
): Promise<bigint> {
  const addr = wallet.account!.address;
  const troveId = computeTroveId(addr, 0n);

  const existing = await getTroveInfo(troveId);
  if (existing) {
    console.log(
      `  ${label}: Trove exists (rate: ${fmtRate(existing.annualInterestRate)}, debt: ${fmtDebt(existing.entireDebt)})`,
    );
    return troveId;
  }

  // Check balance
  const bal = (await publicClient.readContract({
    address: WCTC,
    abi: ERC20ABI,
    functionName: "balanceOf",
    args: [addr],
  })) as bigint;

  if (bal < collAmount + GAS_COMP) {
    throw new Error(
      `${label}: wCTC 잔액 부족 — 필요: ${formatEther(collAmount + GAS_COMP)}, 보유: ${formatEther(bal)}`,
    );
  }

  console.log(
    `  ${label}: Opening Trove — ${formatEther(collAmount)} wCTC, ${formatEther(debtAmount)} sbUSD, ${fmtRate(rate)}`,
  );

  // Approve
  const approveTx = await wallet.writeContract({
    address: WCTC,
    abi: ERC20ABI,
    functionName: "approve",
    args: [BORROWER_OPS, collAmount + GAS_COMP],
  });
  await waitTx(approveTx, `${label} approve wCTC`);

  // Open
  const openTx = await wallet.writeContract({
    address: BORROWER_OPS,
    abi: BorrowerOpsABI,
    functionName: "openTrove",
    args: [
      addr,
      0n,
      collAmount,
      debtAmount,
      0n,
      0n,
      rate,
      maxUint256,
      ZERO,
      ZERO,
      ZERO,
    ],
  });
  await waitTx(openTx, `${label} openTrove`);

  return troveId;
}

// ─── Actions ─────────────────────────────────────────────

async function adjustRate(
  wallet: WalletClient,
  troveId: bigint,
  newRate: bigint,
  label: string,
): Promise<void> {
  const { upper, lower } = await findHints(newRate);

  const tx = await wallet.writeContract({
    address: BORROWER_OPS,
    abi: BorrowerOpsABI,
    functionName: "adjustTroveInterestRate",
    args: [troveId, newRate, upper, lower, maxUint256],
  });
  await waitTx(tx, `${label} adjustRate -> ${fmtRate(newRate)}`);
}

// ─── Dashboard ───────────────────────────────────────────

async function printDashboard(
  round: number,
  userTroveId: bigint,
  mmTroveId: bigint,
  action: string,
) {
  const [userData, mmData, avgRate, allTroves] = await Promise.all([
    getTroveInfo(userTroveId),
    getTroveInfo(mmTroveId),
    getAvgRate(),
    getAllTroveSummary(),
  ]);

  const bar = "=".repeat(60);
  const line = "-".repeat(60);

  console.log(`\n${bar}`);
  console.log(`  ROUND ${round} | ${new Date().toLocaleTimeString("ko-KR")}`);
  console.log(bar);
  console.log(
    `  Avg Interest Rate:    ${fmtRate(avgRate)}`,
  );
  console.log(
    `  User (#5) Rate:       ${fmtRate(userData?.annualInterestRate ?? 0n)}  (debt: ${fmtDebt(userData?.entireDebt ?? 0n)})`,
  );
  console.log(
    `  Market Maker (#1):    ${fmtRate(mmData?.annualInterestRate ?? 0n)}  (debt: ${fmtDebt(mmData?.entireDebt ?? 0n)})`,
  );
  console.log(`  Agent Action:         ${action}`);
  console.log(line);
  console.log(`  All Troves (${allTroves.length}):`);
  for (const t of allTroves) {
    const isUser = t.id === userTroveId ? " <-- User" : "";
    const isMM = t.id === mmTroveId ? " <-- MM" : "";
    console.log(
      `    ${fmtRate(t.rate).padEnd(8)} | ${fmtDebt(t.debt).padEnd(16)}${isUser}${isMM}`,
    );
  }
  console.log(`${bar}\n`);
}

// ─── Main ────────────────────────────────────────────────

async function main() {
  console.log("============================================================");
  console.log("  Interest Rate Management Simulation");
  console.log("  Loop: 1min | Branch: wCTC | Agent: auto-adjust rate");
  console.log("============================================================\n");

  const userWallet = makeWallet(accounts.accounts[4].privateKey); // #5
  const mmWallet = makeWallet(accounts.accounts[0].privateKey); // #1

  // ── Setup ──
  console.log("--- Setup ---\n");

  const userTroveId = await ensureTrove(
    userWallet,
    "User(#5)",
    parseEther("500"),
    parseEther("1000"),
    USER_INIT_RATE,
  );
  const mmTroveId = await ensureTrove(
    mmWallet,
    "MarketMaker(#1)",
    parseEther("2000"),
    parseEther("4000"),
    parseEther("0.06"), // 초기 6%
  );

  // Show initial state
  const initAvg = await getAvgRate();
  console.log(`\n  Initial avg rate: ${fmtRate(initAvg)}`);
  console.log("\n--- Starting Loop (every 60s, Ctrl+C to stop) ---");

  // ── Loop ──
  let round = 0;

  async function tick() {
    round++;
    const isHighPhase = round % 2 === 1;

    try {
      // 1. Market Maker: 이자율 진동
      const mmTargetRate = isHighPhase ? MM_HIGH_RATE : MM_LOW_RATE;
      console.log(
        `\n[Round ${round}] MarketMaker -> ${fmtRate(mmTargetRate)} (${isHighPhase ? "HIGH" : "LOW"} phase)`,
      );
      await adjustRate(mmWallet, mmTroveId, mmTargetRate, "MM");

      // 2. 평균 이자율 조회
      const avg = await getAvgRate();

      // 3. User 이자율 조회
      const userData = await getTroveInfo(userTroveId);
      const userRate = userData?.annualInterestRate ?? 0n;

      // 4. Agent 판단: 올리기 or 내리기
      let action = "-- (rate OK, no action)";
      const targetRate = avg + RATE_BUFFER;

      if (userRate < avg) {
        // 평균 밑 → 올리기
        console.log(
          `  Agent: user ${fmtRate(userRate)} < avg ${fmtRate(avg)} -> RAISE to ${fmtRate(targetRate)}`,
        );
        await adjustRate(userWallet, userTroveId, targetRate, "Agent");
        action = `RAISED ${fmtRate(userRate)} -> ${fmtRate(targetRate)}`;
      } else if (userRate > avg + RATE_BUFFER * 2n) {
        // 평균보다 2% 이상 높음 → 내리기 (불필요한 이자 절약)
        console.log(
          `  Agent: user ${fmtRate(userRate)} >> avg ${fmtRate(avg)} -> LOWER to ${fmtRate(targetRate)}`,
        );
        await adjustRate(userWallet, userTroveId, targetRate, "Agent");
        action = `LOWERED ${fmtRate(userRate)} -> ${fmtRate(targetRate)}`;
      } else {
        console.log(
          `  Agent: user ${fmtRate(userRate)} ~ avg ${fmtRate(avg)} -> OK`,
        );
      }

      // 5. Dashboard
      await printDashboard(round, userTroveId, mmTroveId, action);
    } catch (err: any) {
      console.error(
        `  [ERROR] Round ${round}:`,
        err.message?.slice(0, 300) ?? err,
      );
    }
  }

  // 첫 라운드 즉시 실행
  await tick();

  // 이후 1분마다 반복
  while (true) {
    await sleep(LOOP_INTERVAL_MS);
    await tick();
  }
}

main().catch((err) => {
  console.error("FATAL:", err);
  process.exit(1);
});
