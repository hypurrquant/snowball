/**
 * MM Rebalance Monitor — LP Pool Status Reporter
 * Phase 1: Monitoring only. Reports pool TVL and flags under-threshold pools.
 * Actual LP add is a separate manual step.
 *
 * Usage: NODE_PATH=apps/web/node_modules npx tsx scripts/ops/mm-rebalance.ts
 */
import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config({ path: path.join(__dirname, "../../.env") });

// ─── Config ───
const API_BASE = process.env.API_BASE_URL || "http://localhost:3001";
const TVL_THRESHOLD_USD = 100; // Flag pools below this TVL

// ─── Pool definitions (from DEX_POOLS) ───
const DEX_POOLS = [
  { poolAddress: "0xb6Db55F3d318B6b0C37777A818C2c195181B94C9", name: "wCTC / USDC", fee: 3000 },
  { poolAddress: "0x23e6152CC07d4DEBA597c9e975986E2B307E8874", name: "wCTC / sbUSD", fee: 3000 },
  { poolAddress: "0xe70647BF2baB8282B65f674b0DF8B7f0bb658859", name: "sbUSD / USDC", fee: 500 },
  { poolAddress: "0xee0AF4a1Aa3ce7447248f87c384b8bE7de302DA5", name: "lstCTC / wCTC", fee: 3000 },
  { poolAddress: "0x394ECC1c9094F5E3D83a6C9497a33a969e9B136a", name: "lstCTC / USDC", fee: 3000 },
];

interface PoolApiResponse {
  poolAddress?: string;
  address?: string;
  name?: string;
  tvlUsd?: number;
  tvl?: number;
  currentPrice?: number;
  price?: number;
  token0Price?: number;
  token1Price?: number;
  liquidity?: string;
  feeTier?: number;
}

interface PoolStatus {
  poolAddress: string;
  name: string;
  fee: number;
  tvlUsd: number | null;
  currentPrice: number | null;
  belowThreshold: boolean;
  apiError: boolean;
}

async function fetchPoolsFromApi(): Promise<PoolApiResponse[]> {
  const url = `${API_BASE}/api/pools`;
  const response = await fetch(url, {
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) {
    throw new Error(`API responded with ${response.status}: ${response.statusText}`);
  }
  const data = await response.json();
  // Handle both array and wrapped { pools: [...] } shapes
  if (Array.isArray(data)) return data;
  if (data.pools && Array.isArray(data.pools)) return data.pools;
  return [];
}

function extractTvl(apiPool: PoolApiResponse): number | null {
  if (typeof apiPool.tvlUsd === "number") return apiPool.tvlUsd;
  if (typeof apiPool.tvl === "number") return apiPool.tvl;
  return null;
}

function extractPrice(apiPool: PoolApiResponse): number | null {
  if (typeof apiPool.currentPrice === "number") return apiPool.currentPrice;
  if (typeof apiPool.price === "number") return apiPool.price;
  if (typeof apiPool.token0Price === "number") return apiPool.token0Price;
  return null;
}

function matchApiPool(
  localPool: (typeof DEX_POOLS)[number],
  apiPools: PoolApiResponse[]
): PoolApiResponse | undefined {
  const addr = localPool.poolAddress.toLowerCase();
  return apiPools.find((p) => {
    const a = (p.poolAddress ?? p.address ?? "").toLowerCase();
    return a === addr;
  });
}

async function main() {
  console.log("=== MM Rebalance Monitor ===");
  console.log(`Timestamp: ${new Date().toISOString()}`);
  console.log(`API: ${API_BASE}/api/pools`);
  console.log(`TVL threshold: $${TVL_THRESHOLD_USD}\n`);

  // Fetch all pools from server API
  let apiPools: PoolApiResponse[] = [];
  let apiFailed = false;
  try {
    apiPools = await fetchPoolsFromApi();
    console.log(`Fetched ${apiPools.length} pools from API\n`);
  } catch (err) {
    apiFailed = true;
    console.warn(`WARNING: API unavailable — ${(err as Error).message}`);
    console.warn("Reporting pools without live data\n");
  }

  // Build status for each known pool
  const statuses: PoolStatus[] = DEX_POOLS.map((pool) => {
    if (apiFailed) {
      return {
        poolAddress: pool.poolAddress,
        name: pool.name,
        fee: pool.fee,
        tvlUsd: null,
        currentPrice: null,
        belowThreshold: false,
        apiError: true,
      };
    }

    const apiPool = matchApiPool(pool, apiPools);
    const tvlUsd = apiPool ? extractTvl(apiPool) : null;
    const currentPrice = apiPool ? extractPrice(apiPool) : null;
    const belowThreshold = tvlUsd !== null && tvlUsd < TVL_THRESHOLD_USD;

    return {
      poolAddress: pool.poolAddress,
      name: pool.name,
      fee: pool.fee,
      tvlUsd,
      currentPrice,
      belowThreshold,
      apiError: !apiPool,
    };
  });

  // Print report
  console.log("─".repeat(72));
  console.log(
    `${"Pool".padEnd(22)} ${"Fee".padEnd(6)} ${"TVL (USD)".padStart(14)} ${"Price".padStart(12)} Status`
  );
  console.log("─".repeat(72));

  const flagged: PoolStatus[] = [];
  for (const s of statuses) {
    const feeStr = `${s.fee / 10000}%`;
    const tvlStr = s.tvlUsd !== null ? `$${s.tvlUsd.toFixed(2)}` : "N/A";
    const priceStr = s.currentPrice !== null ? s.currentPrice.toFixed(6) : "N/A";
    let statusStr = "OK";
    if (s.apiError && !apiFailed) statusStr = "NOT IN API";
    else if (apiFailed) statusStr = "API ERR";
    else if (s.belowThreshold) statusStr = "LOW TVL";

    console.log(
      `${s.name.padEnd(22)} ${feeStr.padEnd(6)} ${tvlStr.padStart(14)} ${priceStr.padStart(12)} ${statusStr}`
    );

    if (s.belowThreshold) flagged.push(s);
  }
  console.log("─".repeat(72));

  // Flag summary
  if (flagged.length > 0) {
    console.log(`\nFLAGGED POOLS (TVL < $${TVL_THRESHOLD_USD}) — manual LP add recommended:`);
    for (const s of flagged) {
      console.log(
        `  [!] ${s.name} (${s.poolAddress}) — TVL: $${s.tvlUsd?.toFixed(2)}`
      );
    }
  } else if (!apiFailed) {
    console.log("\nAll pools above TVL threshold. No action needed.");
  }

  console.log("\nPhase 1: monitoring only. Actual LP rebalance is a manual step.");
  console.log(`Report complete: ${new Date().toISOString()}`);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error("\nFAILED:", e.message || e);
    process.exit(1);
  });
