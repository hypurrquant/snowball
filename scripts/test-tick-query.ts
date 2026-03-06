/**
 * On-chain tick data query test script
 * wCTC/USDC pool의 tick bitmap → initialized ticks → liquidityNet 조회
 */
import { createPublicClient, http, type Address } from "viem";

// --- Config ---
const RPC_URL = "https://rpc.cc3-testnet.creditcoin.network";
const FACTORY = "0x09616b503326dc860b3c3465525b39fe4fcdd049" as Address;
const WCTC = "0xdb5c8e9d0827c474342bea03e0e35a60d621afea" as Address;
const USDC = "0x3e31b08651644b9e6535f5bf0c7a9e7e6ad92e02" as Address;
const FEE = 3000;

// --- ABIs ---
const FACTORY_ABI = [
  {
    name: "getPool",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "tokenA", type: "address" },
      { name: "tokenB", type: "address" },
      { name: "fee", type: "uint24" },
    ],
    outputs: [{ name: "pool", type: "address" }],
  },
] as const;

const POOL_ABI = [
  {
    name: "slot0",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [
      { name: "sqrtPriceX96", type: "uint160" },
      { name: "tick", type: "int24" },
      { name: "observationIndex", type: "uint16" },
      { name: "observationCardinality", type: "uint16" },
      { name: "observationCardinalityNext", type: "uint16" },
      { name: "feeProtocol", type: "uint8" },
      { name: "unlocked", type: "bool" },
    ],
  },
  {
    name: "liquidity",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint128" }],
  },
  {
    name: "tickSpacing",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "int24" }],
  },
  {
    name: "tickBitmap",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "wordPos", type: "int16" }],
    outputs: [{ name: "bitmap", type: "uint256" }],
  },
  {
    name: "ticks",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "tick", type: "int24" }],
    outputs: [
      { name: "liquidityGross", type: "uint128" },
      { name: "liquidityNet", type: "int128" },
      { name: "feeGrowthOutside0X128", type: "uint256" },
      { name: "feeGrowthOutside1X128", type: "uint256" },
      { name: "tickCumulativeOutside", type: "int56" },
      { name: "secondsPerLiquidityOutsideX128", type: "uint160" },
      { name: "secondsOutside", type: "uint32" },
      { name: "initialized", type: "bool" },
    ],
  },
] as const;

// --- Helpers ---
function alignTickToSpacing(tick: number, spacing: number, roundDown: boolean): number {
  const aligned = Math.floor(tick / spacing) * spacing;
  return roundDown ? aligned : aligned + spacing;
}

function computeWordPositions(minTick: number, maxTick: number, tickSpacing: number): number[] {
  const divisor = tickSpacing * 256;
  const minWord = Math.floor(minTick / divisor);
  const maxWord = Math.floor(maxTick / divisor);
  const positions: number[] = [];
  for (let word = minWord; word <= maxWord; word++) {
    positions.push(word);
  }
  return positions;
}

function extractInitializedTicks(
  bitmap: bigint,
  wordPos: number,
  tickSpacing: number,
  minTick: number,
  maxTick: number,
): number[] {
  const ticks: number[] = [];
  for (let bit = 0; bit < 256; bit++) {
    if (((bitmap >> BigInt(bit)) & 1n) === 0n) continue;
    const tick = (wordPos * 256 + bit) * tickSpacing;
    if (tick >= minTick && tick <= maxTick) {
      ticks.push(tick);
    }
  }
  return ticks;
}

function tickToPrice(tick: number, decimals0: number, decimals1: number): number {
  return Math.pow(1.0001, tick) * Math.pow(10, decimals0 - decimals1);
}

// --- Main ---
async function main() {
  const client = createPublicClient({
    transport: http(RPC_URL),
  });

  console.log("=== Step 1: Get Pool Address ===");
  const poolAddress = await client.readContract({
    address: FACTORY,
    abi: FACTORY_ABI,
    functionName: "getPool",
    args: [WCTC, USDC, FEE],
  });
  console.log("Pool:", poolAddress);

  if (poolAddress === "0x0000000000000000000000000000000000000000") {
    console.error("Pool does not exist!");
    return;
  }

  console.log("\n=== Step 2: Read slot0 + liquidity + tickSpacing ===");
  const [slot0, liquidity, tickSpacing] = await Promise.all([
    client.readContract({ address: poolAddress, abi: POOL_ABI, functionName: "slot0" }),
    client.readContract({ address: poolAddress, abi: POOL_ABI, functionName: "liquidity" }),
    client.readContract({ address: poolAddress, abi: POOL_ABI, functionName: "tickSpacing" }),
  ]);

  const sqrtPriceX96 = slot0[0];
  const currentTick = Number(slot0[1]);
  const spacing = Number(tickSpacing);

  console.log("sqrtPriceX96:", sqrtPriceX96.toString());
  console.log("currentTick:", currentTick);
  console.log("liquidity:", liquidity.toString());
  console.log("tickSpacing:", spacing);

  // Price: token0 is USDC (lower addr), token1 is wCTC
  // 1.0001^tick = USDC per wCTC (token0/token1)
  const rawPrice = Math.pow(1.0001, currentTick);
  console.log("rawPrice (USDC/wCTC):", rawPrice);
  // Both 18 decimals, so decimal adjustment = 1
  console.log("price (USDC per wCTC):", rawPrice.toFixed(6));
  console.log("price (wCTC per USDC):", (1 / rawPrice).toFixed(6));

  console.log("\n=== Step 3: Phase 1 — Tick Bitmap Scan ===");
  const TICK_RANGE = 1200; // ± tickSpacing steps
  const baseTick = alignTickToSpacing(currentTick, spacing, true);
  const minTick = baseTick - TICK_RANGE * spacing;
  const maxTick = baseTick + TICK_RANGE * spacing;
  const wordPositions = computeWordPositions(minTick, maxTick, spacing);

  console.log("baseTick:", baseTick);
  console.log("range:", minTick, "~", maxTick);
  console.log("wordPositions:", wordPositions.length, "words:", wordPositions);

  // Fetch bitmaps
  const bitmapResults = await Promise.all(
    wordPositions.map((wordPos) =>
      client.readContract({
        address: poolAddress,
        abi: POOL_ABI,
        functionName: "tickBitmap",
        args: [wordPos],
      })
    )
  );

  let totalInitialized: number[] = [];
  for (let i = 0; i < wordPositions.length; i++) {
    const bitmap = bitmapResults[i];
    if (bitmap !== 0n) {
      console.log(`  word[${wordPositions[i]}] bitmap: 0x${bitmap.toString(16)}`);
    }
    const ticks = extractInitializedTicks(bitmap, wordPositions[i], spacing, minTick, maxTick);
    totalInitialized.push(...ticks);
  }

  totalInitialized.sort((a, b) => a - b);
  console.log("\nNon-zero bitmaps:", bitmapResults.filter((b) => b !== 0n).length);
  console.log("Initialized ticks:", totalInitialized.length);
  console.log("Tick indices:", totalInitialized);

  if (totalInitialized.length === 0) {
    console.log("\nNo initialized ticks found in range. Nothing more to fetch.");
    return;
  }

  console.log("\n=== Step 4: Phase 2 — Fetch liquidityNet for each tick ===");
  const tickData = await Promise.all(
    totalInitialized.map((tickIdx) =>
      client.readContract({
        address: poolAddress,
        abi: POOL_ABI,
        functionName: "ticks",
        args: [tickIdx],
      })
    )
  );

  console.log("\nTick data:");
  for (let i = 0; i < totalInitialized.length; i++) {
    const [liquidityGross, liquidityNet, , , , , , initialized] = tickData[i];
    const price = tickToPrice(totalInitialized[i], 18, 18);
    console.log(
      `  tick=${totalInitialized[i].toString().padStart(7)}` +
        `  price=${price.toFixed(8).padStart(14)}` +
        `  liqGross=${liquidityGross.toString().padStart(25)}` +
        `  liqNet=${liquidityNet.toString().padStart(26)}` +
        `  init=${initialized}`
    );
  }

  console.log("\n=== Step 5: Reconstruct liquidity distribution ===");
  let cumLiquidity = 0n;
  const tickMap = new Map<number, bigint>();
  for (let i = 0; i < totalInitialized.length; i++) {
    tickMap.set(totalInitialized[i], tickData[i][1]); // liquidityNet
  }

  // Walk from minTick to maxTick, only print ticks with non-zero liquidity
  console.log("\nLiquidity distribution (non-zero ranges):");
  let printCount = 0;
  for (let t = minTick; t < maxTick; t += spacing) {
    if (tickMap.has(t)) {
      cumLiquidity += tickMap.get(t)!;
    }
    if (cumLiquidity !== 0n) {
      const priceLower = tickToPrice(t, 18, 18);
      const priceUpper = tickToPrice(t + spacing, 18, 18);
      const isCurrent = currentTick >= t && currentTick < t + spacing;
      if (printCount < 10 || isCurrent) {
        console.log(
          `  tick=${t.toString().padStart(7)}~${(t + spacing).toString().padStart(7)}` +
            `  price=${priceLower.toFixed(6).padStart(12)}~${priceUpper.toFixed(6).padStart(12)}` +
            `  liq=${cumLiquidity.toString().padStart(25)}` +
            (isCurrent ? "  <<<< CURRENT" : "")
        );
      }
      printCount++;
    }
  }
  if (printCount > 10) {
    console.log(`  ... (${printCount} total ranges with liquidity)`);
  }

  console.log("\nDone!");
}

main().catch(console.error);
