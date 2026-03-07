/**
 * 종합 포지션 조회 — 토큰 잔고 + Morpho + Liquity + DEX LP
 *
 * Usage:
 *   NODE_PATH=apps/web/node_modules npx tsx scripts/sim-check-balances.ts          # 전체
 *   NODE_PATH=apps/web/node_modules npx tsx scripts/sim-check-balances.ts 5        # #5만
 *   NODE_PATH=apps/web/node_modules npx tsx scripts/sim-check-balances.ts 1 5 7    # #1, #5, #7
 *   NODE_PATH=apps/web/node_modules npx tsx scripts/sim-check-balances.ts deployer # deployer만
 */
import {
  createPublicClient,
  http,
  formatEther,
  type Address,
} from "viem";
import accounts from "../simulation-accounts.json";

const RPC = "https://rpc.cc3-testnet.creditcoin.network";
const client = createPublicClient({ transport: http(RPC) });

// ── Token Addresses ──
const TOKENS = {
  wCTC: "0xca69344e2917f026ef4a5ace5d7b122343fc8528" as Address,
  lstCTC: "0xa768d376272f9216c8c4aa3063391bdafbcad4c2" as Address,
  sbUSD: "0x8aefed3e2e9a886bdd72ec9cebe27d7aabced2a5" as Address,
  USDC: "0x60e204104cfe1a93f630ea5ebc0a895cc80ebed9" as Address,
};

// ── Morpho ──
const MORPHO = "0x190a733eda9ba7d2b52d56764c5921d5cd4752ca" as Address;
const ORACLE_SCALE = 10n ** 36n;
const WAD = 10n ** 18n;

const MORPHO_MARKETS = [
  {
    name: "wCTC/sbUSD",
    id: "0x5aa4edaf3dcbf0e54abbf2bb639acbdc95305f61bd4a4f4801d42040998c5752" as `0x${string}`,
    loanSymbol: "sbUSD",
    collSymbol: "wCTC",
    oraclePrice: 5_000000000000000000000000000000000000n,
    lltv: 770000000000000000n,
  },
  {
    name: "lstCTC/sbUSD",
    id: "0x2eea8a6ba032c2af6adef715c6f9ed1068e77782c7d8e127a3975389e8bedd0e" as `0x${string}`,
    loanSymbol: "sbUSD",
    collSymbol: "lstCTC",
    oraclePrice: 5_200000000000000000000000000000000000n,
    lltv: 770000000000000000n,
  },
  {
    name: "sbUSD/USDC",
    id: "0x3a94c96ec40aa5fe54bcd20ecbcd733497e4f4f2c8d31ae4862951b20f992a0c" as `0x${string}`,
    loanSymbol: "USDC",
    collSymbol: "sbUSD",
    oraclePrice: 1_000000000000000000000000000000000000n,
    lltv: 900000000000000000n,
  },
];

// ── Liquity ──
const LIQUITY_BRANCHES = [
  {
    name: "wCTC",
    troveManager: "0xa20f9dfeb110e11c89147b9db5adb98a7d91e70e" as Address,
    troveNFT: "0x72e383eff50893e2b2edeb711a81c3a812dcd2f9" as Address,
  },
  {
    name: "lstCTC",
    troveManager: "0x83715c7e9873b0b8208adbbf8e07f31e83b94aed" as Address,
    troveNFT: "0x51a90151e0dd1348e77ee6bcc30278ee311f29a8" as Address,
  },
];

// ── DEX ──
const NPM = "0xa28bfaa2e84098de8d654f690e51c265e4ae01c9" as Address;

// ── ABIs ──
const ERC20_ABI = [
  { type: "function", name: "balanceOf", inputs: [{ type: "address" }], outputs: [{ type: "uint256" }], stateMutability: "view" },
] as const;

const ERC721_ABI = [
  { type: "function", name: "balanceOf", inputs: [{ name: "owner", type: "address" }], outputs: [{ type: "uint256" }], stateMutability: "view" },
  { type: "function", name: "tokenOfOwnerByIndex", inputs: [{ type: "address" }, { type: "uint256" }], outputs: [{ type: "uint256" }], stateMutability: "view" },
] as const;

const MORPHO_ABI = [
  { type: "function", name: "position", inputs: [{ name: "id", type: "bytes32" }, { name: "user", type: "address" }], outputs: [{ name: "supplyShares", type: "uint256" }, { name: "borrowShares", type: "uint128" }, { name: "collateral", type: "uint128" }], stateMutability: "view" },
  { type: "function", name: "market", inputs: [{ name: "id", type: "bytes32" }], outputs: [{ name: "totalSupplyAssets", type: "uint128" }, { name: "totalSupplyShares", type: "uint128" }, { name: "totalBorrowAssets", type: "uint128" }, { name: "totalBorrowShares", type: "uint128" }, { name: "lastUpdate", type: "uint128" }, { name: "fee", type: "uint128" }], stateMutability: "view" },
] as const;

const TROVE_MANAGER_ABI = [
  { type: "function", name: "getLatestTroveData", inputs: [{ type: "uint256" }], outputs: [{ type: "tuple", components: [{ name: "entireDebt", type: "uint256" }, { name: "entireColl", type: "uint256" }, { name: "redistBoldDebtGain", type: "uint256" }, { name: "redistCollGain", type: "uint256" }, { name: "accruedInterest", type: "uint256" }, { name: "recordedDebt", type: "uint256" }, { name: "annualInterestRate", type: "uint256" }, { name: "weightedRecordedDebt", type: "uint256" }, { name: "accruedBatchManagementFee", type: "uint256" }, { name: "lastInterestRateAdjTime", type: "uint256" }] }], stateMutability: "view" },
] as const;

// ── Helpers ──
function fmt(v: bigint, decimals = 2): string {
  const n = Number(formatEther(v));
  if (n === 0) return "0";
  if (n < 0.01) return "<0.01";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toFixed(decimals);
}

function toAssetsDown(shares: bigint, totalAssets: bigint, totalShares: bigint): bigint {
  if (totalShares === 0n) return 0n;
  return (shares * totalAssets) / totalShares;
}

// ── Market data cache ──
let marketDataCache: Map<string, readonly [bigint, bigint, bigint, bigint, bigint, bigint]> | null = null;

async function getMarketData() {
  if (marketDataCache) return marketDataCache;
  marketDataCache = new Map();
  for (const m of MORPHO_MARKETS) {
    const data = await client.readContract({
      address: MORPHO, abi: MORPHO_ABI, functionName: "market", args: [m.id],
    });
    marketDataCache.set(m.id, data);
  }
  return marketDataCache;
}

// ── Per-account query ──
async function queryAccount(label: string, addr: Address) {
  console.log(`\n${"═".repeat(70)}`);
  console.log(`  ${label}  (${addr})`);
  console.log(`${"═".repeat(70)}`);

  // ── Tokens ──
  const [ctc, wctc, lstctc, sbusd, usdc] = await Promise.all([
    client.getBalance({ address: addr }),
    client.readContract({ address: TOKENS.wCTC, abi: ERC20_ABI, functionName: "balanceOf", args: [addr] }),
    client.readContract({ address: TOKENS.lstCTC, abi: ERC20_ABI, functionName: "balanceOf", args: [addr] }),
    client.readContract({ address: TOKENS.sbUSD, abi: ERC20_ABI, functionName: "balanceOf", args: [addr] }),
    client.readContract({ address: TOKENS.USDC, abi: ERC20_ABI, functionName: "balanceOf", args: [addr] }),
  ]);

  console.log(`\n  Tokens:`);
  console.log(`    CTC: ${fmt(ctc)} | wCTC: ${fmt(wctc)} | lstCTC: ${fmt(lstctc)} | sbUSD: ${fmt(sbusd)} | USDC: ${fmt(usdc)}`);

  // ── Morpho Positions ──
  const marketData = await getMarketData();
  const morphoPositions: string[] = [];

  for (const m of MORPHO_MARKETS) {
    const pos = await client.readContract({
      address: MORPHO, abi: MORPHO_ABI, functionName: "position", args: [m.id, addr],
    });
    const [supplyShares, borrowShares, collateral] = pos;

    if (supplyShares === 0n && borrowShares === 0n && collateral === 0n) continue;

    const md = marketData.get(m.id)!;
    const supplyAssets = toAssetsDown(supplyShares, md[0], md[1]);
    const borrowAssets = toAssetsDown(borrowShares, md[2], md[3]);

    // HF calculation
    let hfStr = "∞";
    if (borrowAssets > 0n && collateral > 0n) {
      const collValue = (collateral * m.oraclePrice) / ORACLE_SCALE;
      const maxBorrow = (collValue * m.lltv) / WAD;
      const hf = Number((maxBorrow * WAD) / borrowAssets) / 1e18;
      hfStr = hf.toFixed(2);
    }

    const parts: string[] = [];
    if (supplyAssets > 0n) parts.push(`supply=${fmt(supplyAssets)} ${m.loanSymbol}`);
    if (collateral > 0n) parts.push(`coll=${fmt(collateral)} ${m.collSymbol}`);
    if (borrowAssets > 0n) parts.push(`borrow=${fmt(borrowAssets)} ${m.loanSymbol}`);
    if (borrowAssets > 0n) parts.push(`HF=${hfStr}`);

    morphoPositions.push(`    ${m.name.padEnd(14)} ${parts.join(" | ")}`);
  }

  if (morphoPositions.length > 0) {
    console.log(`\n  Morpho (SnowballLend):`);
    morphoPositions.forEach((l) => console.log(l));
  }

  // ── Liquity Troves ──
  const troveLines: string[] = [];
  for (const branch of LIQUITY_BRANCHES) {
    try {
      const nftCount = await client.readContract({
        address: branch.troveNFT, abi: ERC721_ABI, functionName: "balanceOf", args: [addr],
      });

      if (nftCount === 0n) continue;

      // Get first trove
      const troveId = await client.readContract({
        address: branch.troveNFT, abi: ERC721_ABI, functionName: "tokenOfOwnerByIndex", args: [addr, 0n],
      });

      const troveData = await client.readContract({
        address: branch.troveManager, abi: TROVE_MANAGER_ABI, functionName: "getLatestTroveData", args: [troveId],
      });

      const debt = troveData.entireDebt;
      const coll = troveData.entireColl;
      const rate = Number(troveData.annualInterestRate) / 1e18 * 100;

      troveLines.push(
        `    ${branch.name.padEnd(8)} coll=${fmt(coll)} ${branch.name} | debt=${fmt(debt)} sbUSD | rate=${rate.toFixed(1)}%`
      );
    } catch {
      // No trove or error — skip
    }
  }

  if (troveLines.length > 0) {
    console.log(`\n  Liquity Troves:`);
    troveLines.forEach((l) => console.log(l));
  }

  // ── DEX LP ──
  try {
    const lpCount = await client.readContract({
      address: NPM, abi: ERC721_ABI, functionName: "balanceOf", args: [addr],
    });
    if (lpCount > 0n) {
      console.log(`\n  DEX LP: ${lpCount} position${lpCount > 1n ? "s" : ""}`);
    }
  } catch {
    // NPM not available — skip
  }
}

// ── Main ──
async function main() {
  const args = process.argv.slice(2);

  // Build account list
  const allAccounts = [
    { label: "Deployer", address: accounts.deployer.address, index: "deployer" },
    ...accounts.accounts.map((a) => ({
      label: `#${a.index} ${a.label}`,
      address: a.address,
      index: String(a.index),
    })),
    ...((accounts as any).readonly ?? []).map((a: any, i: number) => ({
      label: `[RO] ${a.label}`,
      address: a.address,
      index: `ro${i + 1}`,
    })),
  ];

  let selected = allAccounts;
  if (args.length > 0) {
    selected = allAccounts.filter((a) =>
      args.some((arg) => arg.toLowerCase() === a.index.toLowerCase())
    );
    if (selected.length === 0) {
      console.error(`No accounts matching: ${args.join(", ")}`);
      console.error(`Valid: deployer, 1-8, ro1`);
      process.exit(1);
    }
  }

  console.log(`=== Snowball Protocol — Position Overview ===`);
  console.log(`Network: Creditcoin Testnet (102031)`);
  console.log(`Querying ${selected.length} account(s)...`);

  for (const acct of selected) {
    await queryAccount(acct.label, acct.address as Address);
  }

  // ── Market summary ──
  console.log(`\n${"═".repeat(70)}`);
  console.log(`  MORPHO MARKET SUMMARY`);
  console.log(`${"═".repeat(70)}`);

  const marketData = await getMarketData();
  for (const m of MORPHO_MARKETS) {
    const md = marketData.get(m.id)!;
    const supply = md[0];
    const borrow = md[2];
    const util = supply > 0n ? Number(borrow * 10000n / supply) / 100 : 0;
    console.log(
      `  ${m.name.padEnd(14)} supply=${fmt(supply).padStart(8)} ${m.loanSymbol} | borrow=${fmt(borrow).padStart(8)} ${m.loanSymbol} | util=${util.toFixed(1)}%`
    );
  }

  console.log();
}

main().catch(console.error);
