/**
 * Aave V3 Reserve 초기화 스크립트
 *
 * 이미 배포된 Aave V3 코어에 4개 자산(wCTC, lstCTC, sbUSD, USDC) 마켓을 활성화한다.
 *
 * Usage: NODE_PATH=packages/integration/node_modules npx tsx scripts/deploy/init-aave-reserves.ts
 */
import {
  createPublicClient, createWalletClient, http, formatEther,
  type Address, type Abi,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { defineChain } from "viem";
import * as fs from "fs";
import * as path from "path";

// ─── .env ───
function loadEnv(): Record<string, string> {
  const envPath = path.join(__dirname, "../../.env");
  const env: Record<string, string> = {};
  for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const idx = t.indexOf("=");
    if (idx === -1) continue;
    env[t.slice(0, idx)] = t.slice(idx + 1);
  }
  return env;
}
const env = loadEnv();

const cc3 = defineChain({
  id: 102031, name: "CC3 Testnet",
  nativeCurrency: { name: "CTC", symbol: "tCTC", decimals: 18 },
  rpcUrls: { default: { http: ["https://rpc.cc3-testnet.creditcoin.network"] } },
});

const account = privateKeyToAccount(env.DEPLOYER_PRIVATE_KEY as `0x${string}`);
const transport = http("https://rpc.cc3-testnet.creditcoin.network");
const pub = createPublicClient({ chain: cc3, transport });
const wallet = createWalletClient({ account, chain: cc3, transport });

// ─── Deployed addresses ───
const TOKENS = {
  wCTC:   "0xca69344e2917f026ef4a5ace5d7b122343fc8528" as Address,
  lstCTC: "0xa768d376272f9216c8c4aa3063391bdafbcad4c2" as Address,
  sbUSD:  "0x8aefed3e2e9a886bdd72ec9cebe27d7aabced2a5" as Address,
  USDC:   "0x60e204104cfe1a93f630ea5ebc0a895cc80ebed9" as Address,
};

const AAVE = {
  pool: "0xff74e97255d2ecd04572f68ee8f38da10f984638" as Address,
  configurator: "0xa59e069d323ad2bf716f10b28e4fb712c3ce8b2e" as Address,
  aclManager: "0x75a40a2d75497927cCC4Fe856F1eb4405Bf0b990" as Address,
  aTokenImpl: "0x69073cea3e729419258d7d4dfAB77bdadEAa752f" as Address,
  stableDebtImpl: "0x883abAc17331D1250ECd14d1b96b7a80385ceD50" as Address,
  variableDebtImpl: "0xc304AEDDB567f5e0Cd7D84Edba6Ab5c2b3A551Dd" as Address,
  rateVolatile: "0x626eA94bcb51BF4eFeC29D9f7B1187C797dAC4E8" as Address,
  rateStable: "0x9B0623a8A26b570edfd5c5324736B60dC0A3673A" as Address,
};

const TREASURY = account.address;
const ZERO = "0x0000000000000000000000000000000000000000" as Address;

// ─── ABI fragments ───
const configuratorAbi = [
  {
    type: "function",
    name: "initReserves",
    inputs: [{
      name: "input",
      type: "tuple[]",
      components: [
        { name: "aTokenImpl", type: "address" },
        { name: "stableDebtTokenImpl", type: "address" },
        { name: "variableDebtTokenImpl", type: "address" },
        { name: "underlyingAssetDecimals", type: "uint8" },
        { name: "interestRateStrategyAddress", type: "address" },
        { name: "underlyingAsset", type: "address" },
        { name: "treasury", type: "address" },
        { name: "incentivesController", type: "address" },
        { name: "aTokenName", type: "string" },
        { name: "aTokenSymbol", type: "string" },
        { name: "variableDebtTokenName", type: "string" },
        { name: "variableDebtTokenSymbol", type: "string" },
        { name: "stableDebtTokenName", type: "string" },
        { name: "stableDebtTokenSymbol", type: "string" },
        { name: "params", type: "bytes" },
      ],
    }],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "configureReserveAsCollateral",
    inputs: [
      { name: "asset", type: "address" },
      { name: "ltv", type: "uint256" },
      { name: "liquidationThreshold", type: "uint256" },
      { name: "liquidationBonus", type: "uint256" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "setReserveBorrowing",
    inputs: [
      { name: "asset", type: "address" },
      { name: "enabled", type: "bool" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "setReserveFactor",
    inputs: [
      { name: "asset", type: "address" },
      { name: "newReserveFactor", type: "uint256" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "setReserveFlashLoaning",
    inputs: [
      { name: "asset", type: "address" },
      { name: "enabled", type: "bool" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
] as const;

async function send(addr: Address, abi: any, fn: string, args: any[], gas = 8_000_000n) {
  const hash = await wallet.writeContract({ address: addr, abi, functionName: fn, args, gas });
  const rx = await pub.waitForTransactionReceipt({ hash });
  if (rx.status !== "success") throw new Error(`TX ${fn} failed`);
  return rx;
}

async function main() {
  const bal = await pub.getBalance({ address: account.address });
  console.log(`Deployer: ${account.address}`);
  console.log(`Balance:  ${formatEther(bal)} CTC\n`);

  // ═══ initReserves ═══
  console.log("=== initReserves (4 assets) ===");

  const reserves = [
    { asset: TOKENS.wCTC,   rate: AAVE.rateVolatile, name: "wCTC",   sym: "sawCTC"    },
    { asset: TOKENS.lstCTC, rate: AAVE.rateVolatile, name: "lstCTC", sym: "salistCTC"  },
    { asset: TOKENS.sbUSD,  rate: AAVE.rateStable,   name: "sbUSD",  sym: "sasbUSD"   },
    { asset: TOKENS.USDC,   rate: AAVE.rateStable,   name: "USDC",   sym: "saUSDC"    },
  ];

  const initInputs = reserves.map(r => ({
    aTokenImpl: AAVE.aTokenImpl,
    stableDebtTokenImpl: AAVE.stableDebtImpl,
    variableDebtTokenImpl: AAVE.variableDebtImpl,
    underlyingAssetDecimals: 18,
    interestRateStrategyAddress: r.rate,
    underlyingAsset: r.asset,
    treasury: TREASURY,
    incentivesController: ZERO,
    aTokenName: `Snowball Aave ${r.name}`,
    aTokenSymbol: r.sym,
    variableDebtTokenName: `Snowball Variable Debt ${r.name}`,
    variableDebtTokenSymbol: `vDebt${r.sym}`,
    stableDebtTokenName: `Snowball Stable Debt ${r.name}`,
    stableDebtTokenSymbol: `sDebt${r.sym}`,
    params: "0x" as `0x${string}`,
  }));

  await send(AAVE.configurator, configuratorAbi, "initReserves", [initInputs]);
  console.log("  initReserves OK");

  // ═══ Enable Borrowing ═══
  console.log("\n=== Enable Borrowing ===");
  for (const r of reserves) {
    await send(AAVE.configurator, configuratorAbi, "setReserveBorrowing", [r.asset, true]);
    console.log(`  ${r.name}: borrowing enabled`);
  }

  // ═══ Collateral Config ═══
  console.log("\n=== Collateral Config ===");
  const configs = [
    { asset: TOKENS.wCTC,   ltv: 6500n, threshold: 7500n, bonus: 11000n, rf: 1000n, name: "wCTC"   },
    { asset: TOKENS.lstCTC, ltv: 7000n, threshold: 8000n, bonus: 10800n, rf: 1000n, name: "lstCTC" },
    { asset: TOKENS.sbUSD,  ltv: 8000n, threshold: 8500n, bonus: 10500n, rf: 1000n, name: "sbUSD"  },
    { asset: TOKENS.USDC,   ltv: 8000n, threshold: 8500n, bonus: 10500n, rf: 1000n, name: "USDC"   },
  ];

  for (const c of configs) {
    await send(AAVE.configurator, configuratorAbi, "configureReserveAsCollateral", [
      c.asset, c.ltv, c.threshold, c.bonus,
    ]);
    await send(AAVE.configurator, configuratorAbi, "setReserveFactor", [c.asset, c.rf]);
    console.log(`  ${c.name}: LTV=${Number(c.ltv)/100}%, LT=${Number(c.threshold)/100}%, Bonus=${Number(c.bonus-10000n)/100}%, RF=${Number(c.rf)/100}%`);
  }

  // ═══ Flash Loans ═══
  console.log("\n=== Enable Flash Loans ===");
  for (const r of reserves) {
    await send(AAVE.configurator, configuratorAbi, "setReserveFlashLoaning", [r.asset, true]);
    console.log(`  ${r.name}: flash loans enabled`);
  }

  console.log("\n═══════════════════════════════════════════");
  console.log("  AAVE V3 RESERVES INITIALIZED");
  console.log("═══════════════════════════════════════════");
  console.log("  wCTC:   LTV 65%, LT 75%, Bonus 10%, RF 10%");
  console.log("  lstCTC: LTV 70%, LT 80%, Bonus 8%,  RF 10%");
  console.log("  sbUSD:  LTV 80%, LT 85%, Bonus 5%,  RF 10%");
  console.log("  USDC:   LTV 80%, LT 85%, Bonus 5%,  RF 10%");
}

main().then(() => process.exit(0)).catch(e => { console.error("\nFAILED:", e.message || e); process.exit(1); });
