/**
 * Liquity Simulation: Trove 열기 + Stability Pool 공급
 *
 * 시나리오:
 * 1. Account #5 (Moderate Borrower) — wCTC Trove 열기, sbUSD 차입
 * 2. Account #4 (Conservative Lender) — Stability Pool에 sbUSD 공급
 * 3. Account #6 (Aggressive Borrower) — lstCTC Trove 열기, 공격적 차입
 */

import {
  createPublicClient,
  createWalletClient,
  http,
  parseEther,
  formatEther,
  defineChain,
  maxUint256,
  type Address,
  type WalletClient,
  type PublicClient,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import accounts from "../simulation-accounts.json";

// ─── Chain ───
const cc3Testnet = defineChain({
  id: 102031,
  name: "Creditcoin3 Testnet",
  nativeCurrency: { name: "CTC", symbol: "tCTC", decimals: 18 },
  rpcUrls: { default: { http: ["https://rpc.cc3-testnet.creditcoin.network"] } },
});

const transport = http("https://rpc.cc3-testnet.creditcoin.network");
const publicClient = createPublicClient({ chain: cc3Testnet, transport });

// ─── Addresses ───
const TOKENS = {
  wCTC: "0xca69344e2917f026ef4a5ace5d7b122343fc8528" as Address,
  lstCTC: "0xa768d376272f9216c8c4aa3063391bdafbcad4c2" as Address,
  sbUSD: "0x8aefed3e2e9a886bdd72ec9cebe27d7aabced2a5" as Address,
};

const LIQUITY = {
  wCTC: {
    borrowerOperations: "0xb637f375cbbd278ace5fdba53ad868ae7cb186ea" as Address,
    troveManager: "0xa20f9dfeb110e11c89147b9db5adb98a7d91e70e" as Address,
    stabilityPool: "0xf1654541efb7a3c34a9255464ebb2294fa1a43f3" as Address,
    sortedTroves: "0xf5ef344759df7786cda9d2133e4d1e10e3b43f9f" as Address,
    priceFeed: "0xca9341894230b84fdff429ff43e83cc8f8990342" as Address,
  },
  lstCTC: {
    borrowerOperations: "0x8700ed43989e2f935ab8477dd8b2822cae7f60ca" as Address,
    troveManager: "0x83715c7e9873b0b8208adbbf8e07f31e83b94aed" as Address,
    stabilityPool: "0xec700d805b5de3bf988401af44b1b384b136c41b" as Address,
    sortedTroves: "0x25aa78c7b0dbc736ae23a316ab44579467ba9507" as Address,
    priceFeed: "0xa12ed39d24d4bbc100d310ae1cbf10b4c67e4a08" as Address,
  },
  shared: {
    hintHelpers: "0x6ee9850b0915763bdc0c7edca8b66189449a447f" as Address,
  },
};

// ─── ABIs ───
const ERC20ABI = [
  { type: "function", name: "approve", inputs: [{ name: "spender", type: "address" }, { name: "amount", type: "uint256" }], outputs: [{ type: "bool" }], stateMutability: "nonpayable" },
  { type: "function", name: "balanceOf", inputs: [{ name: "account", type: "address" }], outputs: [{ type: "uint256" }], stateMutability: "view" },
] as const;

const BorrowerOperationsABI = [
  { type: "function", name: "openTrove", inputs: [{ name: "owner", type: "address" }, { name: "ownerIndex", type: "uint256" }, { name: "collAmount", type: "uint256" }, { name: "boldAmount", type: "uint256" }, { name: "upperHint", type: "uint256" }, { name: "lowerHint", type: "uint256" }, { name: "annualInterestRate", type: "uint256" }, { name: "maxUpfrontFee", type: "uint256" }, { name: "addManager", type: "address" }, { name: "removeManager", type: "address" }, { name: "receiver", type: "address" }], outputs: [{ name: "troveId", type: "uint256" }], stateMutability: "nonpayable" },
] as const;

const TroveManagerABI = [
  { type: "function", name: "getLatestTroveData", inputs: [{ name: "troveId", type: "uint256" }], outputs: [{ name: "trove", type: "tuple", components: [{ name: "entireDebt", type: "uint256" }, { name: "entireColl", type: "uint256" }, { name: "redistBoldDebtGain", type: "uint256" }, { name: "redistCollGain", type: "uint256" }, { name: "accruedInterest", type: "uint256" }, { name: "recordedDebt", type: "uint256" }, { name: "annualInterestRate", type: "uint256" }, { name: "weightedRecordedDebt", type: "uint256" }, { name: "accruedBatchManagementFee", type: "uint256" }, { name: "lastInterestRateAdjTime", type: "uint256" }] }], stateMutability: "view" },
  { type: "function", name: "getTroveIdsCount", inputs: [], outputs: [{ type: "uint256" }], stateMutability: "view" },
] as const;

const StabilityPoolABI = [
  { type: "function", name: "provideToSP", inputs: [{ name: "amount", type: "uint256" }, { name: "doClaim", type: "bool" }], outputs: [], stateMutability: "nonpayable" },
  { type: "function", name: "getCompoundedBoldDeposit", inputs: [{ name: "depositor", type: "address" }], outputs: [{ type: "uint256" }], stateMutability: "view" },
  { type: "function", name: "getTotalBoldDeposits", inputs: [], outputs: [{ type: "uint256" }], stateMutability: "view" },
] as const;

const PriceFeedABI = [
  { type: "function", name: "lastGoodPrice", inputs: [], outputs: [{ type: "uint256" }], stateMutability: "view" },
] as const;

const SortedTrovesABI = [
  { type: "function", name: "getSize", inputs: [], outputs: [{ type: "uint256" }], stateMutability: "view" },
] as const;

// ─── Helpers ───
const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000" as Address;
const ETH_GAS_COMPENSATION = parseEther("0.2"); // 0.2 CTC collateral token taken as gas compensation

function makeWallet(privateKey: string) {
  const account = privateKeyToAccount(privateKey as `0x${string}`);
  return createWalletClient({ account, chain: cc3Testnet, transport });
}

async function waitTx(hash: `0x${string}`, label: string) {
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  if (receipt.status === "reverted") throw new Error(`TX REVERTED: ${label} — ${hash}`);
  console.log(`  [OK] ${label} — ${hash}`);
  return receipt;
}

async function getBalance(token: Address, owner: Address): Promise<bigint> {
  return publicClient.readContract({ address: token, abi: ERC20ABI, functionName: "balanceOf", args: [owner] });
}

// ─── Step 1: Open wCTC Trove (Account #5 — Moderate Borrower) ───
async function openWctcTrove() {
  console.log("\n=== Step 1: Open wCTC Trove (Account #5 — Moderate Borrower) ===\n");

  const persona = accounts.accounts[4]; // index 5
  const wallet = makeWallet(persona.privateKey);
  const addr = wallet.account.address;
  const branch = LIQUITY.wCTC;

  // Check balances
  const wctcBal = await getBalance(TOKENS.wCTC, addr);
  console.log(`  wCTC balance: ${formatEther(wctcBal)}`);

  // Parameters: 500 wCTC collateral (5% of 10,000), borrow 1000 sbUSD
  // Price = $5, CR = (500 * 5) / 1000 = 250% (safe, MCR=110%)
  const collAmount = parseEther("500");
  const boldAmount = parseEther("1000");
  const annualInterestRate = parseEther("0.05"); // 5%

  if (wctcBal < collAmount) {
    console.log(`  ERROR: Insufficient wCTC. Need 500, have ${formatEther(wctcBal)}`);
    return null;
  }

  // 1. Approve wCTC to BorrowerOperations (collAmount + gas compensation)
  const approveAmount = collAmount + ETH_GAS_COMPENSATION;
  console.log("  Approving wCTC...");
  const approveTx = await wallet.writeContract({
    address: TOKENS.wCTC,
    abi: ERC20ABI,
    functionName: "approve",
    args: [branch.borrowerOperations, approveAmount],
  });
  await waitTx(approveTx, "approve wCTC → BorrowerOps");

  // 2. Open Trove
  // Hints: 0,0 works when list is empty or small
  console.log(`  Opening Trove: 500 wCTC collateral, 1000 sbUSD debt, 5% interest...`);
  const openTx = await wallet.writeContract({
    address: branch.borrowerOperations,
    abi: BorrowerOperationsABI,
    functionName: "openTrove",
    args: [
      addr,          // owner
      0n,            // ownerIndex (first trove)
      collAmount,    // collAmount
      boldAmount,    // boldAmount (sbUSD to borrow)
      0n,            // upperHint
      0n,            // lowerHint
      annualInterestRate,
      maxUint256,    // maxUpfrontFee
      ZERO_ADDRESS,  // addManager
      ZERO_ADDRESS,  // removeManager
      ZERO_ADDRESS,  // receiver
    ],
  });
  await waitTx(openTx, "openTrove (wCTC branch)");

  // Verify
  const sbUsdBal = await getBalance(TOKENS.sbUSD, addr);
  console.log(`  sbUSD balance after borrow: ${formatEther(sbUsdBal)}`);

  const troveCount = await publicClient.readContract({
    address: branch.troveManager, abi: TroveManagerABI,
    functionName: "getTroveIdsCount",
  });
  console.log(`  Total troves in wCTC branch: ${troveCount}`);

  return { address: addr, sbUsdBalance: sbUsdBal };
}

// ─── Step 2: Stability Pool Deposit (Account #4 — Conservative Lender) ───
async function depositToStabilityPool() {
  console.log("\n=== Step 2: Stability Pool Deposit (Account #4 — Conservative Lender) ===\n");

  // First, account #4 needs sbUSD. Let's open a small trove for them too.
  const persona = accounts.accounts[3]; // index 4
  const wallet = makeWallet(persona.privateKey);
  const addr = wallet.account.address;
  const branch = LIQUITY.wCTC;

  const wctcBal = await getBalance(TOKENS.wCTC, addr);
  console.log(`  wCTC balance: ${formatEther(wctcBal)}`);

  // Open trove: 400 wCTC, borrow 800 sbUSD (CR=250%)
  const collAmount = parseEther("400");
  const boldAmount = parseEther("800");

  if (wctcBal < collAmount) {
    console.log(`  ERROR: Insufficient wCTC. Need 400, have ${formatEther(wctcBal)}`);
    return;
  }

  // Approve & open trove (collAmount + gas compensation)
  console.log("  Approving wCTC...");
  let tx = await wallet.writeContract({
    address: TOKENS.wCTC, abi: ERC20ABI,
    functionName: "approve", args: [branch.borrowerOperations, collAmount + ETH_GAS_COMPENSATION],
  });
  await waitTx(tx, "approve wCTC → BorrowerOps");

  console.log(`  Opening Trove: 400 wCTC collateral, 800 sbUSD debt, 4% interest...`);
  tx = await wallet.writeContract({
    address: branch.borrowerOperations,
    abi: BorrowerOperationsABI,
    functionName: "openTrove",
    args: [
      addr, 0n, collAmount, boldAmount,
      0n, 0n,
      parseEther("0.04"), // 4% annual interest
      maxUint256,
      ZERO_ADDRESS, ZERO_ADDRESS, ZERO_ADDRESS,
    ],
  });
  await waitTx(tx, "openTrove (wCTC branch)");

  // Now deposit sbUSD into Stability Pool
  const sbUsdBal = await getBalance(TOKENS.sbUSD, addr);
  const depositAmount = sbUsdBal / 2n; // deposit half
  console.log(`  sbUSD balance: ${formatEther(sbUsdBal)}`);
  console.log(`  Depositing ${formatEther(depositAmount)} sbUSD to Stability Pool...`);

  // Approve sbUSD → StabilityPool
  tx = await wallet.writeContract({
    address: TOKENS.sbUSD, abi: ERC20ABI,
    functionName: "approve", args: [branch.stabilityPool, depositAmount],
  });
  await waitTx(tx, "approve sbUSD → StabilityPool");

  // provideToSP
  tx = await wallet.writeContract({
    address: branch.stabilityPool,
    abi: StabilityPoolABI,
    functionName: "provideToSP",
    args: [depositAmount, false], // doClaim=false
  });
  await waitTx(tx, "provideToSP");

  // Verify
  const spDeposit = await publicClient.readContract({
    address: branch.stabilityPool, abi: StabilityPoolABI,
    functionName: "getCompoundedBoldDeposit", args: [addr],
  });
  const totalSP = await publicClient.readContract({
    address: branch.stabilityPool, abi: StabilityPoolABI,
    functionName: "getTotalBoldDeposits",
  });
  console.log(`  My SP deposit: ${formatEther(spDeposit)} sbUSD`);
  console.log(`  Total SP deposits: ${formatEther(totalSP)} sbUSD`);
}

// ─── Step 3: Aggressive lstCTC Trove (Account #6) ───
async function openLstctcTroveAggressive() {
  console.log("\n=== Step 3: Open lstCTC Trove (Account #6 — Aggressive Borrower) ===\n");

  const persona = accounts.accounts[5]; // index 6
  const wallet = makeWallet(persona.privateKey);
  const addr = wallet.account.address;
  const branch = LIQUITY.lstCTC;

  const lstctcBal = await getBalance(TOKENS.lstCTC, addr);
  console.log(`  lstCTC balance: ${formatEther(lstctcBal)}`);

  // Aggressive: 300 lstCTC, borrow near CCR limit
  // lstCTC price = $5.20, CCR=160%
  // Max debt at CCR = (300 * 5.20) / 1.60 = 975 sbUSD
  // Target CR ~173% (just above CCR) → 900 sbUSD
  const collAmount = parseEther("300");
  const boldAmount = parseEther("900");

  if (lstctcBal < collAmount) {
    console.log(`  ERROR: Insufficient lstCTC. Need 300, have ${formatEther(lstctcBal)}`);
    return;
  }

  // Approve collateral (lstCTC) + gas compensation (wCTC = WETH for all branches)
  console.log("  Approving lstCTC (collateral)...");
  let tx = await wallet.writeContract({
    address: TOKENS.lstCTC, abi: ERC20ABI,
    functionName: "approve", args: [branch.borrowerOperations, collAmount],
  });
  await waitTx(tx, "approve lstCTC → BorrowerOps");

  console.log("  Approving wCTC (gas compensation)...");
  tx = await wallet.writeContract({
    address: TOKENS.wCTC, abi: ERC20ABI,
    functionName: "approve", args: [branch.borrowerOperations, ETH_GAS_COMPENSATION],
  });
  await waitTx(tx, "approve wCTC → lstCTC BorrowerOps (gas comp)");

  console.log(`  Opening Trove: 300 lstCTC collateral, 900 sbUSD debt, 7% interest...`);
  tx = await wallet.writeContract({
    address: branch.borrowerOperations,
    abi: BorrowerOperationsABI,
    functionName: "openTrove",
    args: [
      addr, 0n, collAmount, boldAmount,
      0n, 0n,
      parseEther("0.07"), // 7% annual interest (aggressive pays more)
      maxUint256,
      ZERO_ADDRESS, ZERO_ADDRESS, ZERO_ADDRESS,
    ],
  });
  await waitTx(tx, "openTrove (lstCTC branch)");

  const sbUsdBal = await getBalance(TOKENS.sbUSD, addr);
  console.log(`  sbUSD balance after borrow: ${formatEther(sbUsdBal)}`);

  // Also deposit some to lstCTC stability pool
  const depositAmount = parseEther("200");
  if (sbUsdBal >= depositAmount) {
    console.log(`  Depositing 200 sbUSD to lstCTC Stability Pool...`);
    tx = await wallet.writeContract({
      address: TOKENS.sbUSD, abi: ERC20ABI,
      functionName: "approve", args: [branch.stabilityPool, depositAmount],
    });
    await waitTx(tx, "approve sbUSD → lstCTC StabilityPool");

    tx = await wallet.writeContract({
      address: branch.stabilityPool, abi: StabilityPoolABI,
      functionName: "provideToSP", args: [depositAmount, false],
    });
    await waitTx(tx, "provideToSP (lstCTC branch)");

    const totalSP = await publicClient.readContract({
      address: branch.stabilityPool, abi: StabilityPoolABI,
      functionName: "getTotalBoldDeposits",
    });
    console.log(`  lstCTC SP total deposits: ${formatEther(totalSP)} sbUSD`);
  }
}

// ─── Summary ───
async function printSummary() {
  console.log("\n=== Summary ===\n");

  // wCTC branch
  const wctcTroves = await publicClient.readContract({
    address: LIQUITY.wCTC.troveManager, abi: TroveManagerABI,
    functionName: "getTroveIdsCount",
  });
  const wctcSP = await publicClient.readContract({
    address: LIQUITY.wCTC.stabilityPool, abi: StabilityPoolABI,
    functionName: "getTotalBoldDeposits",
  });
  const wctcPrice = await publicClient.readContract({
    address: LIQUITY.wCTC.priceFeed, abi: PriceFeedABI,
    functionName: "lastGoodPrice",
  });

  // lstCTC branch
  const lstctcTroves = await publicClient.readContract({
    address: LIQUITY.lstCTC.troveManager, abi: TroveManagerABI,
    functionName: "getTroveIdsCount",
  });
  const lstctcSP = await publicClient.readContract({
    address: LIQUITY.lstCTC.stabilityPool, abi: StabilityPoolABI,
    functionName: "getTotalBoldDeposits",
  });
  const lstctcPrice = await publicClient.readContract({
    address: LIQUITY.lstCTC.priceFeed, abi: PriceFeedABI,
    functionName: "lastGoodPrice",
  });

  console.log(`  wCTC Branch:`);
  console.log(`    Price: $${formatEther(wctcPrice)}`);
  console.log(`    Troves: ${wctcTroves}`);
  console.log(`    Stability Pool: ${formatEther(wctcSP)} sbUSD`);
  console.log();
  console.log(`  lstCTC Branch:`);
  console.log(`    Price: $${formatEther(lstctcPrice)}`);
  console.log(`    Troves: ${lstctcTroves}`);
  console.log(`    Stability Pool: ${formatEther(lstctcSP)} sbUSD`);
}

// ─── Main ───
async function main() {
  console.log("Liquity V2 Simulation — Trove + Stability Pool\n");
  console.log("Chain: Creditcoin3 Testnet (102031)");
  console.log("Protocols: wCTC branch + lstCTC branch\n");

  // Check existing trove counts to skip already-completed steps
  const wctcTroveCount = await publicClient.readContract({
    address: LIQUITY.wCTC.troveManager, abi: TroveManagerABI,
    functionName: "getTroveIdsCount",
  });
  const lstctcTroveCount = await publicClient.readContract({
    address: LIQUITY.lstCTC.troveManager, abi: TroveManagerABI,
    functionName: "getTroveIdsCount",
  });

  if (wctcTroveCount === 0n) {
    await openWctcTrove();
    await depositToStabilityPool();
  } else {
    console.log(`  Skipping wCTC steps (${wctcTroveCount} troves already exist)\n`);
  }

  if (lstctcTroveCount === 0n) {
    await openLstctcTroveAggressive();
  } else {
    console.log(`  Skipping lstCTC steps (${lstctcTroveCount} troves already exist)\n`);
  }

  await printSummary();
  console.log("\nDone!");
}

main().catch((err) => {
  console.error("FATAL:", err);
  process.exit(1);
});
