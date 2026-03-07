/**
 * DEX Liquidity Simulation: Add liquidity to all non-sbUSD pools
 * with different distribution shapes (skewness / kurtosis).
 *
 * Pools:
 *   1. wCTC/USDC  — Symmetric normal (bell curve)
 *   2. lstCTC/USDC — Right-skewed (positive skew, long right tail)
 *   3. lstCTC/wCTC — Leptokurtic (peaked, high kurtosis)
 *
 * Each distribution is approximated by 5 LP positions at different
 * tick ranges with varying amounts.
 *
 * Account: #1 Whale LP (designed for LP provision)
 * Rule: max 5% of holdings per action
 */

import {
  createPublicClient, createWalletClient, http, parseEther, formatEther,
  defineChain, type Address,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import accounts from "../simulation-accounts.json";

// ─── Chain ───
const cc3Testnet = defineChain({
  id: 102031, name: "Creditcoin3 Testnet",
  nativeCurrency: { name: "CTC", symbol: "tCTC", decimals: 18 },
  rpcUrls: { default: { http: ["https://rpc.cc3-testnet.creditcoin.network"] } },
});
const transport = http("https://rpc.cc3-testnet.creditcoin.network");
const publicClient = createPublicClient({ chain: cc3Testnet, transport });

// ─── Addresses ───
const TOKENS = {
  wCTC: "0xca69344e2917f026ef4a5ace5d7b122343fc8528" as Address,
  lstCTC: "0xa768d376272f9216c8c4aa3063391bdafbcad4c2" as Address,
  USDC: "0x60e204104cfe1a93f630ea5ebc0a895cc80ebed9" as Address,
};

const DEX = {
  factory: "0x09616b503326dc860b3c3465525b39fe4fcdd049" as Address,
  nonfungiblePositionManager: "0xa28bfaa2e84098de8d654f690e51c265e4ae01c9" as Address,
};

const POOLS: Record<string, { address: Address; fee: number }> = {
  "wCTC/USDC": { address: "0xb6Db55F3d318B6b0C37777A818C2c195181B94C9" as Address, fee: 3000 },
  "lstCTC/USDC": { address: "0x394ECC1c9094F5E3D83a6C9497a33a969e9B136a" as Address, fee: 3000 },
  "lstCTC/wCTC": { address: "0xee0AF4a1Aa3ce7447248f87c384b8bE7de302DA5" as Address, fee: 3000 },
};

// ─── ABIs ───
const ERC20ABI = [
  { type: "function", name: "approve", inputs: [{ name: "spender", type: "address" }, { name: "amount", type: "uint256" }], outputs: [{ type: "bool" }], stateMutability: "nonpayable" },
  { type: "function", name: "balanceOf", inputs: [{ name: "account", type: "address" }], outputs: [{ type: "uint256" }], stateMutability: "view" },
] as const;

const PoolABI = [
  { type: "function", name: "slot0", inputs: [], outputs: [{ name: "sqrtPriceX96", type: "uint160" }, { name: "tick", type: "int24" }, { name: "observationIndex", type: "uint16" }, { name: "observationCardinality", type: "uint16" }, { name: "observationCardinalityNext", type: "uint16" }, { name: "feeProtocol", type: "uint8" }, { name: "unlocked", type: "bool" }], stateMutability: "view" },
  { type: "function", name: "liquidity", inputs: [], outputs: [{ type: "uint128" }], stateMutability: "view" },
  { type: "function", name: "token0", inputs: [], outputs: [{ type: "address" }], stateMutability: "view" },
  { type: "function", name: "token1", inputs: [], outputs: [{ type: "address" }], stateMutability: "view" },
] as const;

const NpmABI = [
  { type: "function", name: "mint", inputs: [{ name: "params", type: "tuple", components: [{ name: "token0", type: "address" }, { name: "token1", type: "address" }, { name: "fee", type: "uint24" }, { name: "tickLower", type: "int24" }, { name: "tickUpper", type: "int24" }, { name: "amount0Desired", type: "uint256" }, { name: "amount1Desired", type: "uint256" }, { name: "amount0Min", type: "uint256" }, { name: "amount1Min", type: "uint256" }, { name: "recipient", type: "address" }, { name: "deadline", type: "uint256" }] }], outputs: [{ name: "tokenId", type: "uint256" }, { name: "liquidity", type: "uint128" }, { name: "amount0", type: "uint256" }, { name: "amount1", type: "uint256" }], stateMutability: "payable" },
] as const;

// ─── Helpers ───
const TICK_SPACING = 60; // fee 3000 → tickSpacing 60

function alignTick(tick: number, direction: "down" | "up"): number {
  if (direction === "down") return Math.floor(tick / TICK_SPACING) * TICK_SPACING;
  return Math.ceil(tick / TICK_SPACING) * TICK_SPACING;
}

async function waitTx(hash: `0x${string}`, label: string) {
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  if (receipt.status === "reverted") throw new Error(`TX REVERTED: ${label}`);
  console.log(`    [OK] ${label}`);
  return receipt;
}

// ─── Distribution generators ───
// Returns array of { tickLower, tickUpper, weight } representing the distribution shape.
// weight is a fraction (sums to ~1.0) controlling how much liquidity goes to each range.

interface DistSlice {
  tickLower: number;
  tickUpper: number;
  weight: number;
}

function symmetricNormal(currentTick: number): DistSlice[] {
  // Bell curve: highest weight at center, decreasing outward
  // 5 slices, weights: [0.10, 0.20, 0.40, 0.20, 0.10]
  const width = 3600; // each slice covers 3600 ticks (60 tick spacings)
  const center = alignTick(currentTick, "down");
  return [
    { tickLower: center - 2 * width, tickUpper: center - width, weight: 0.10 },
    { tickLower: center - width, tickUpper: center, weight: 0.20 },
    { tickLower: center, tickUpper: center + width, weight: 0.40 },
    { tickLower: center + width, tickUpper: center + 2 * width, weight: 0.20 },
    { tickLower: center + 2 * width, tickUpper: center + 3 * width, weight: 0.10 },
  ];
}

function rightSkewed(currentTick: number): DistSlice[] {
  // Positive skew: more weight on left (below current), long right tail
  // 5 slices, weights: [0.05, 0.15, 0.35, 0.30, 0.15]
  const width = 3600;
  const center = alignTick(currentTick, "down");
  return [
    { tickLower: center - 2 * width, tickUpper: center - width, weight: 0.05 },
    { tickLower: center - width, tickUpper: center, weight: 0.15 },
    { tickLower: center, tickUpper: center + width, weight: 0.35 },
    { tickLower: center + width, tickUpper: center + 2 * width, weight: 0.30 },
    { tickLower: center + 2 * width, tickUpper: center + 3 * width, weight: 0.15 },
  ];
}

function leptokurtic(currentTick: number): DistSlice[] {
  // High kurtosis (peaked): most weight concentrated at center, very thin tails
  // 5 slices, weights: [0.03, 0.07, 0.80, 0.07, 0.03]
  const width = 1800; // narrower slices for peakedness
  const center = alignTick(currentTick, "down");
  return [
    { tickLower: center - 2 * width, tickUpper: center - width, weight: 0.03 },
    { tickLower: center - width, tickUpper: center, weight: 0.07 },
    { tickLower: center, tickUpper: center + width, weight: 0.80 },
    { tickLower: center + width, tickUpper: center + 2 * width, weight: 0.07 },
    { tickLower: center + 2 * width, tickUpper: center + 3 * width, weight: 0.03 },
  ];
}

// ─── Pool info ───
async function getPoolInfo(poolName: string) {
  const pool = POOLS[poolName];
  const [slot0Result, liq, token0, token1] = await Promise.all([
    publicClient.readContract({ address: pool.address, abi: PoolABI, functionName: "slot0" }),
    publicClient.readContract({ address: pool.address, abi: PoolABI, functionName: "liquidity" }),
    publicClient.readContract({ address: pool.address, abi: PoolABI, functionName: "token0" }),
    publicClient.readContract({ address: pool.address, abi: PoolABI, functionName: "token1" }),
  ]);
  return {
    sqrtPriceX96: slot0Result[0] as bigint,
    tick: Number(slot0Result[1]),
    liquidity: liq as bigint,
    token0: token0 as Address,
    token1: token1 as Address,
  };
}

// ─── Add liquidity with distribution ───
async function addLiquidityWithDistribution(
  poolName: string,
  distFn: (tick: number) => DistSlice[],
  distLabel: string,
  wallet: any,
  addr: Address,
  totalAmount0: bigint,
  totalAmount1: bigint,
) {
  console.log(`\n=== ${poolName} — ${distLabel} ===\n`);

  const info = await getPoolInfo(poolName);
  console.log(`  Current tick: ${info.tick}`);
  console.log(`  Current liquidity: ${info.liquidity}`);
  console.log(`  token0: ${info.token0}`);
  console.log(`  token1: ${info.token1}`);

  const slices = distFn(info.tick);
  const pool = POOLS[poolName];

  // Approve both tokens to NPM (total amounts)
  console.log(`  Approving tokens...`);
  const tx0 = await wallet.writeContract({
    address: info.token0, abi: ERC20ABI,
    functionName: "approve", args: [DEX.nonfungiblePositionManager, totalAmount0],
  });
  const tx1 = await wallet.writeContract({
    address: info.token1, abi: ERC20ABI,
    functionName: "approve", args: [DEX.nonfungiblePositionManager, totalAmount1],
  });
  await Promise.all([waitTx(tx0, "approve token0"), waitTx(tx1, "approve token1")]);

  // Mint LP positions for each slice
  for (let i = 0; i < slices.length; i++) {
    const s = slices[i];
    const amt0 = (totalAmount0 * BigInt(Math.round(s.weight * 1000))) / 1000n;
    const amt1 = (totalAmount1 * BigInt(Math.round(s.weight * 1000))) / 1000n;

    if (amt0 === 0n && amt1 === 0n) continue;

    console.log(`  Slice ${i + 1}/${slices.length}: ticks [${s.tickLower}, ${s.tickUpper}], weight=${(s.weight * 100).toFixed(0)}%`);

    try {
      const mintTx = await wallet.writeContract({
        address: DEX.nonfungiblePositionManager,
        abi: NpmABI,
        functionName: "mint",
        args: [{
          token0: info.token0,
          token1: info.token1,
          fee: pool.fee,
          tickLower: s.tickLower,
          tickUpper: s.tickUpper,
          amount0Desired: amt0,
          amount1Desired: amt1,
          amount0Min: 0n,
          amount1Min: 0n,
          recipient: addr,
          deadline: BigInt(Math.floor(Date.now() / 1000) + 600),
        }],
      });
      await waitTx(mintTx, `mint LP slice ${i + 1}`);
    } catch (err: any) {
      console.log(`    [WARN] Slice ${i + 1} failed: ${err.shortMessage || err.message}`);
    }
  }

  // Check final pool state
  const finalInfo = await getPoolInfo(poolName);
  console.log(`  Final liquidity: ${finalInfo.liquidity}`);
}

// ─── Main ───
async function main() {
  console.log("DEX Liquidity Simulation — Distribution Shapes\n");
  console.log("Chain: Creditcoin3 Testnet (102031)");
  console.log("Pools: wCTC/USDC, lstCTC/USDC, lstCTC/wCTC (sbUSD excluded)\n");

  // Account #1 — Whale LP
  const persona = accounts.accounts[0];
  const account = privateKeyToAccount(persona.privateKey as `0x${string}`);
  const wallet = createWalletClient({ account, chain: cc3Testnet, transport });
  const addr = wallet.account.address;

  // Check balances
  const [wctcBal, lstctcBal, usdcBal] = await Promise.all([
    publicClient.readContract({ address: TOKENS.wCTC, abi: ERC20ABI, functionName: "balanceOf", args: [addr] }),
    publicClient.readContract({ address: TOKENS.lstCTC, abi: ERC20ABI, functionName: "balanceOf", args: [addr] }),
    publicClient.readContract({ address: TOKENS.USDC, abi: ERC20ABI, functionName: "balanceOf", args: [addr] }),
  ]);
  console.log(`Whale LP (#1) balances:`);
  console.log(`  wCTC: ${formatEther(wctcBal)}`);
  console.log(`  lstCTC: ${formatEther(lstctcBal)}`);
  console.log(`  USDC: ${formatEther(usdcBal)}`);

  // 5% of holdings per pool action
  // wCTC: 10000 * 5% = 500 per pool
  // lstCTC: 10000 * 5% = 500 per pool
  // USDC: 10000 * 5% = 500 per pool
  const amt500 = parseEther("500");

  // Pool 1: wCTC/USDC — Symmetric Normal (bell curve)
  await addLiquidityWithDistribution(
    "wCTC/USDC", symmetricNormal, "Symmetric Normal (bell curve)",
    wallet, addr, amt500, amt500,
  );

  // Pool 2: lstCTC/USDC — Right-skewed (positive skew)
  await addLiquidityWithDistribution(
    "lstCTC/USDC", rightSkewed, "Right-skewed (positive skew)",
    wallet, addr, amt500, amt500,
  );

  // Pool 3: lstCTC/wCTC — Leptokurtic (peaked, high kurtosis)
  await addLiquidityWithDistribution(
    "lstCTC/wCTC", leptokurtic, "Leptokurtic (peaked, high kurtosis)",
    wallet, addr, amt500, amt500,
  );

  console.log("\n=== Final Pool Summary ===\n");
  for (const [name] of Object.entries(POOLS)) {
    const info = await getPoolInfo(name);
    console.log(`  ${name}: tick=${info.tick}, liquidity=${info.liquidity}`);
  }

  console.log("\nDone!");
}

main().catch((err) => {
  console.error("FATAL:", err);
  process.exit(1);
});
