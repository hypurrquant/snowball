/**
 * Simulation: Account #2 (Active Trader) mints 12 LP positions
 * on wCTC/USDC pool with varying ranges to create interesting
 * liquidity distribution around current tick.
 *
 * Pool: wCTC/USDC (0xb03e78c86eAfd218900904dc01149780E5dDdA16)
 * token0 = USDC (0x3e31...), token1 = wCTC (0xdb5c...)
 * Current tick ≈ -9539, tick spacing = 60
 */

import {
  createPublicClient,
  createWalletClient,
  http,
  parseEther,
  formatEther,
  type Address,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { defineChain } from "viem";

// ─── Chain ───
const cc3Testnet = defineChain({
  id: 102031,
  name: "Creditcoin3 Testnet",
  nativeCurrency: { name: "CTC", symbol: "tCTC", decimals: 18 },
  rpcUrls: { default: { http: ["https://rpc.cc3-testnet.creditcoin.network"] } },
});
const transport = http("https://rpc.cc3-testnet.creditcoin.network");
const publicClient = createPublicClient({ chain: cc3Testnet, transport });

// ─── Account #2 ───
const account = privateKeyToAccount("0xdaec60950d5bd88da044e660e4728e47260f891a868ae97d06dd40d7fe293ea2");
const walletClient = createWalletClient({ account, chain: cc3Testnet, transport });

// ─── Addresses ───
const USDC = "0x3e31b08651644b9e6535f5bf0c7a9e7e6ad92e02" as Address; // token0
const wCTC = "0xdb5c8e9d0827c474342bea03e0e35a60d621afea" as Address; // token1
const POOL = "0xb03e78c86eAfd218900904dc01149780E5dDdA16" as Address;
const NPM = "0xa28bfaa2e84098de8d654f690e51c265e4ae01c9" as Address;

// ─── ABIs ───
const ERC20_ABI = [
  { type: "function", name: "approve", inputs: [{ name: "spender", type: "address" }, { name: "amount", type: "uint256" }], outputs: [{ type: "bool" }], stateMutability: "nonpayable" },
  { type: "function", name: "balanceOf", inputs: [{ name: "account", type: "address" }], outputs: [{ type: "uint256" }], stateMutability: "view" },
] as const;

const POOL_ABI = [
  { type: "function", name: "slot0", inputs: [], outputs: [{ type: "uint160" }, { type: "int24" }, { type: "uint16" }, { type: "uint16" }, { type: "uint16" }, { type: "uint8" }, { type: "bool" }], stateMutability: "view" },
] as const;

const NPM_ABI = [
  {
    type: "function", name: "mint",
    inputs: [{
      type: "tuple", name: "params",
      components: [
        { name: "token0", type: "address" },
        { name: "token1", type: "address" },
        { name: "fee", type: "uint24" },
        { name: "tickLower", type: "int24" },
        { name: "tickUpper", type: "int24" },
        { name: "amount0Desired", type: "uint256" },
        { name: "amount1Desired", type: "uint256" },
        { name: "amount0Min", type: "uint256" },
        { name: "amount1Min", type: "uint256" },
        { name: "recipient", type: "address" },
        { name: "deadline", type: "uint256" },
      ],
    }],
    outputs: [{ type: "uint256" }, { type: "uint128" }, { type: "uint256" }, { type: "uint256" }],
    stateMutability: "payable",
  },
] as const;

const TICK_SPACING = 60;

function alignTick(tick: number, spacing: number): number {
  return Math.floor(tick / spacing) * spacing;
}

// ─── Position Definitions ───
// Each position: [label, tickLowerOffset, tickUpperOffset, usdcAmount, wctcAmount]
// Offsets are from current tick, amounts in ether
const POSITIONS: [string, number, number, string, string][] = [
  // Symmetric positions around current tick
  ["Ultra-tight ±60",     -60,   60,   "8",   "8"],
  ["Tight ±120",          -120,  120,  "15",  "15"],
  ["Narrow ±180",         -180,  180,  "12",  "12"],
  ["Medium ±300",         -300,  300,  "20",  "20"],
  ["Medium ±360",         -360,  360,  "10",  "10"],
  ["Wide ±600",           -600,  600,  "18",  "18"],
  ["Wider ±1200",         -1200, 1200, "10",  "10"],
  ["Very wide ±2400",     -2400, 2400, "5",   "5"],

  // Asymmetric positions
  ["Below bias -600/-60", -600,  -60,  "25",  "0"],   // only USDC (below current)
  ["Above bias +60/+600", 60,    600,  "0",   "25"],   // only wCTC (above current)
  ["Slight below -300/+60", -300, 60,  "18",  "5"],
  ["Slight above -60/+300", -60,  300, "5",   "18"],
];

async function main() {
  // Get current tick
  const slot0 = await publicClient.readContract({ address: POOL, abi: POOL_ABI, functionName: "slot0" });
  const currentTick = Number(slot0[1]);
  const alignedTick = alignTick(currentTick, TICK_SPACING);
  console.log(`Current tick: ${currentTick}, aligned: ${alignedTick}`);

  // Check balances
  const usdcBal = await publicClient.readContract({ address: USDC, abi: ERC20_ABI, functionName: "balanceOf", args: [account.address] });
  const wctcBal = await publicClient.readContract({ address: wCTC, abi: ERC20_ABI, functionName: "balanceOf", args: [account.address] });
  console.log(`USDC balance: ${formatEther(usdcBal)}`);
  console.log(`wCTC balance: ${formatEther(wctcBal)}`);

  // Approve max for both tokens → NPM (one-time)
  console.log("\n--- Approving tokens ---");
  const maxUint = BigInt("0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff");

  const h1 = await walletClient.writeContract({ address: USDC, abi: ERC20_ABI, functionName: "approve", args: [NPM, maxUint] });
  await publicClient.waitForTransactionReceipt({ hash: h1 });
  console.log("USDC approved");

  const h2 = await walletClient.writeContract({ address: wCTC, abi: ERC20_ABI, functionName: "approve", args: [NPM, maxUint] });
  await publicClient.waitForTransactionReceipt({ hash: h2 });
  console.log("wCTC approved");

  // Mint each position
  console.log(`\n--- Minting ${POSITIONS.length} positions ---`);
  const deadline = BigInt(Math.floor(Date.now() / 1000) + 600);

  for (let i = 0; i < POSITIONS.length; i++) {
    const [label, lowerOff, upperOff, usdcAmt, wctcAmt] = POSITIONS[i];
    const tickLower = alignTick(alignedTick + lowerOff, TICK_SPACING);
    const tickUpper = alignTick(alignedTick + upperOff, TICK_SPACING);

    // Ensure tickLower < tickUpper
    if (tickLower >= tickUpper) {
      console.log(`  [${i + 1}] ${label}: SKIP (tickLower=${tickLower} >= tickUpper=${tickUpper})`);
      continue;
    }

    const amount0 = parseEther(usdcAmt);  // token0 = USDC
    const amount1 = parseEther(wctcAmt);  // token1 = wCTC

    console.log(`  [${i + 1}] ${label}: ticks [${tickLower}, ${tickUpper}], USDC=${usdcAmt}, wCTC=${wctcAmt}`);

    try {
      const hash = await walletClient.writeContract({
        address: NPM,
        abi: NPM_ABI,
        functionName: "mint",
        args: [{
          token0: USDC,
          token1: wCTC,
          fee: 3000,
          tickLower,
          tickUpper,
          amount0Desired: amount0,
          amount1Desired: amount1,
          amount0Min: 0n,
          amount1Min: 0n,
          recipient: account.address,
          deadline,
        }],
      });
      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      console.log(`       ✅ tx: ${receipt.transactionHash.slice(0, 18)}... gas: ${receipt.gasUsed}`);
    } catch (err: any) {
      console.log(`       ❌ FAILED: ${err.message?.slice(0, 100)}`);
    }
  }

  // Final balances
  const usdcEnd = await publicClient.readContract({ address: USDC, abi: ERC20_ABI, functionName: "balanceOf", args: [account.address] });
  const wctcEnd = await publicClient.readContract({ address: wCTC, abi: ERC20_ABI, functionName: "balanceOf", args: [account.address] });
  console.log(`\n--- Final Balances ---`);
  console.log(`USDC: ${formatEther(usdcEnd)} (used: ${formatEther(usdcBal - usdcEnd)})`);
  console.log(`wCTC: ${formatEther(wctcEnd)} (used: ${formatEther(wctcBal - wctcEnd)})`);

  // Re-check pool liquidity
  const slot0End = await publicClient.readContract({ address: POOL, abi: POOL_ABI, functionName: "slot0" });
  console.log(`Pool tick after: ${Number(slot0End[1])}`);
}

main().catch(console.error);
