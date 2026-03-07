/**
 * Yield Vaults 배포 스크립트
 *
 * 4개 볼트 + 4개 전략을 새 프로토콜 주소에 맞춰 재배포.
 * - Vault 1: Stability Pool (sbUSD → Liquity StabilityPool)
 * - Vault 2: Morpho sbUSD (sbUSD → SnowballLend supply)
 * - Vault 3: Morpho wCTC  (wCTC → SnowballLend supply)
 * - Vault 4: Morpho USDC  (USDC → SnowballLend supply)
 *
 * Usage: NODE_PATH=apps/web/node_modules npx tsx scripts/deploy/deploy-yield.ts
 */
import {
  createPublicClient, createWalletClient, http, formatEther,
  encodeAbiParameters, parseAbiParameters, keccak256,
  type Address, type Abi,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { defineChain } from "viem";
import * as fs from "fs";
import * as path from "path";

const cc3 = defineChain({
  id: 102031, name: "CC3 Testnet",
  nativeCurrency: { name: "CTC", symbol: "tCTC", decimals: 18 },
  rpcUrls: { default: { http: ["https://rpc.cc3-testnet.creditcoin.network"] } },
});

const accts = JSON.parse(fs.readFileSync(path.join(__dirname, "../simulation-accounts.json"), "utf8"));
const account = privateKeyToAccount(accts.deployer.privateKey as `0x${string}`);
const transport = http("https://rpc.cc3-testnet.creditcoin.network");
const pub = createPublicClient({ chain: cc3, transport });
const wallet = createWalletClient({ account, chain: cc3, transport });

// ─── Current deployed addresses (v2 Full Redeploy) ───
const TOKENS = {
  wCTC: "0xca69344e2917f026ef4a5ace5d7b122343fc8528" as Address,
  sbUSD: "0x8aefed3e2e9a886bdd72ec9cebe27d7aabced2a5" as Address,
  USDC: "0x60e204104cfe1a93f630ea5ebc0a895cc80ebed9" as Address,
};

const LEND = {
  snowballLend: "0x190a733eda9ba7d2b52d56764c5921d5cd4752ca" as Address,
  adaptiveCurveIRM: "0xc4c694089af9bab4c6151663ae8424523fce32a8" as Address,
  oracles: {
    wCTC: "0xbd2c8afda5fa753669c5dd03885a45a3612171af" as Address,
    sbUSD: "0xf82396f39e93d77802bfecc33344faafc4df50f2" as Address,
  },
};

const DEX = {
  swapRouter: "0xec48ed2e9c81b77ab6f8e79c257f9d0c21074154" as Address,
};

const LIQUITY = {
  stabilityPoolWCTC: "0xf1654541efb7a3c34a9255464ebb2294fa1a43f3" as Address,
};

// Morpho MarketParams for each market
const MARKET_PARAMS = {
  // wCTC/sbUSD — collateral=wCTC, loan=sbUSD
  wCTC_sbUSD: {
    loanToken: TOKENS.sbUSD,
    collateralToken: TOKENS.wCTC,
    oracle: LEND.oracles.wCTC,
    irm: LEND.adaptiveCurveIRM,
    lltv: 770000000000000000n,
  },
  // sbUSD/USDC — collateral=sbUSD, loan=USDC
  sbUSD_USDC: {
    loanToken: TOKENS.USDC,
    collateralToken: TOKENS.sbUSD,
    oracle: LEND.oracles.sbUSD,
    irm: LEND.adaptiveCurveIRM,
    lltv: 900000000000000000n,
  },
};

const SWAP_FEE = 3000; // 0.3% Uniswap V3 fee tier

// ─── Artifact loaders ───
const YIELD_OUT = path.join(__dirname, "../../packages/yield/out");
const MORPHO_OUT = path.join(__dirname, "../../packages/morpho/out");

function loadArtifact(contractName: string, fileName?: string): { abi: Abi; bytecode: `0x${string}` } {
  const solFile = fileName || `${contractName}.sol`;
  const p = path.join(YIELD_OUT, solFile, `${contractName}.json`);
  if (!fs.existsSync(p)) throw new Error(`Artifact not found: ${p}`);
  const a = JSON.parse(fs.readFileSync(p, "utf8"));
  return { abi: a.abi, bytecode: (a.bytecode?.object ?? a.bytecode) as `0x${string}` };
}

const LIQUITY_OUT = path.join(__dirname, "../../packages/liquity/out");

function loadLiquityArtifact(contractName: string): { abi: Abi; bytecode: `0x${string}` } {
  const p = path.join(LIQUITY_OUT, `${contractName}.sol`, `${contractName}.json`);
  if (!fs.existsSync(p)) throw new Error(`Liquity artifact not found: ${p}`);
  const a = JSON.parse(fs.readFileSync(p, "utf8"));
  return { abi: a.abi, bytecode: (a.bytecode?.object ?? a.bytecode) as `0x${string}` };
}

async function deploy(contractName: string, args: any[] = [], fileName?: string): Promise<{ address: Address; abi: Abi }> {
  const { abi, bytecode } = loadArtifact(contractName, fileName);
  const hash = await wallet.deployContract({ abi, bytecode, args, gas: 8_000_000n });
  const rx = await pub.waitForTransactionReceipt({ hash });
  if (rx.status !== "success") throw new Error(`Deploy ${contractName} reverted: ${hash}`);
  console.log(`  ${contractName}: ${rx.contractAddress}`);
  return { address: rx.contractAddress!, abi };
}

async function send(addr: Address, abi: Abi, fn: string, args: any[] = []) {
  const hash = await wallet.writeContract({ address: addr, abi, functionName: fn, args, gas: 5_000_000n });
  const rx = await pub.waitForTransactionReceipt({ hash });
  if (rx.status !== "success") throw new Error(`TX ${fn} on ${addr} reverted`);
  return hash;
}

// setStrategy ABI fragment
const setStrategyAbi = [{
  type: "function", name: "setStrategy",
  inputs: [{ name: "_strategy", type: "address" }],
  outputs: [], stateMutability: "nonpayable",
}] as const;

async function main() {
  const bal = await pub.getBalance({ address: account.address });
  console.log(`Deployer: ${account.address}`);
  console.log(`Balance: ${formatEther(bal)} CTC\n`);

  // ══════════════════════════════════════════════════════════════
  // Vault 1: Stability Pool (sbUSD)
  // ══════════════════════════════════════════════════════════════
  console.log("=== Vault 1: Stability Pool (sbUSD) ===");
  const vault1 = await deploy("SnowballYieldVault", [
    TOKENS.sbUSD, "Moo Snowball StabilityPool sbUSD", "mooSnowSP-sbUSD",
  ]);
  const strat1 = await deploy("StrategySbUSDStabilityPool", [
    vault1.address,        // _vault
    TOKENS.sbUSD,          // _want (sbUSD)
    TOKENS.wCTC,           // _native (wCTC)
    DEX.swapRouter,        // _swapRouter
    SWAP_FEE,              // _swapFee
    account.address,       // _strategist
    account.address,       // _treasury
    LIQUITY.stabilityPoolWCTC, // _stabilityPool
  ]);
  await send(vault1.address, setStrategyAbi as any, "setStrategy", [strat1.address]);
  console.log("  → setStrategy ✓\n");

  // ══════════════════════════════════════════════════════════════
  // Vault 2: Morpho sbUSD
  // ══════════════════════════════════════════════════════════════
  console.log("=== Vault 2: Morpho sbUSD ===");
  const vault2 = await deploy("SnowballYieldVault", [
    TOKENS.sbUSD, "Moo Snowball Morpho sbUSD", "mooSnowM-sbUSD",
  ]);
  const strat2 = await deploy("StrategySbUSDMorpho", [
    vault2.address,
    TOKENS.sbUSD,
    TOKENS.wCTC,
    DEX.swapRouter,
    SWAP_FEE,
    account.address,
    account.address,
    LEND.snowballLend,
    MARKET_PARAMS.wCTC_sbUSD, // MarketParams (wCTC/sbUSD market — loan=sbUSD)
  ]);
  await send(vault2.address, setStrategyAbi as any, "setStrategy", [strat2.address]);
  console.log("  → setStrategy ✓\n");

  // ══════════════════════════════════════════════════════════════
  // Vault 3: Morpho wCTC
  // ══════════════════════════════════════════════════════════════
  console.log("=== Vault 3: Morpho wCTC ===");
  const vault3 = await deploy("SnowballYieldVault", [
    TOKENS.wCTC, "Moo Snowball Morpho wCTC", "mooSnowM-wCTC",
  ]);

  // wCTC Morpho strategy needs a market where wCTC is the loan token.
  // But in current markets, wCTC is collateral, not loan token.
  // The StrategyWCTCMorpho supplies wCTC as loanToken — so we need the wCTC/sbUSD market
  // where this strategy supplies the loan side (sbUSD is loan, wCTC is collateral).
  // Wait — StrategyWCTCMorpho does lend.supply(marketParams, _amount) where want=wCTC.
  // This means it supplies wCTC as the loan token. But our market has sbUSD as loan token.
  // Actually looking at the code again: it calls supply() which supplies the loanToken.
  // So for wCTC strategy, we need a market where loanToken=wCTC... which doesn't exist.
  // The old deploy must have had this. Let's check if there's a different approach.
  // Actually: supply() in Morpho Blue supplies the loanToken. The strategy supplies want as loanToken.
  // So for StrategyWCTCMorpho (want=wCTC), we'd need a market with loanToken=wCTC.
  // We don't currently have that market. We need to create one.

  // Create a new market: loanToken=wCTC, collateralToken=sbUSD, oracle=sbUSD oracle
  // Actually this doesn't make economic sense. Let's look at this differently.
  // In the previous deploy, this vault existed. The strategy just supplies wCTC into Morpho.
  // For this to work we need to create a market with wCTC as loanToken.
  // Let's create: wCTC(loan) / sbUSD(collateral) market.

  console.log("  Creating wCTC loan market on Morpho...");
  const enableLltvAbi = [{ type: "function", name: "enableLltv", inputs: [{ name: "lltv", type: "uint256" }], outputs: [], stateMutability: "nonpayable" }] as const;
  const createMarketAbi = [{
    type: "function", name: "createMarket",
    inputs: [{ name: "marketParams", type: "tuple", components: [
      { name: "loanToken", type: "address" }, { name: "collateralToken", type: "address" },
      { name: "oracle", type: "address" }, { name: "irm", type: "address" }, { name: "lltv", type: "uint256" },
    ]}],
    outputs: [{ name: "id", type: "bytes32" }], stateMutability: "nonpayable",
  }] as const;

  // Market: wCTC(loan) / sbUSD(collateral), oracle=sbUSD (price of collateral in loan terms)
  // For this we need an oracle that gives price(sbUSD) in wCTC terms = 1/5 = 0.2
  // But our oracle gives 1e36 scale. sbUSD oracle returns 1e36 (=$1).
  // Morpho oracle: price = collateralToken price / loanToken price (in 1e36 scale)
  // Actually Morpho oracle.price() returns collateral/loan price ratio.
  // For wCTC(loan)/sbUSD(collateral): oracle should return sbUSD_price/wCTC_price = 1/5 = 0.2e36
  // Our sbUSD oracle returns 1e36 which would be interpreted as collateral worth 1x loan... not right.
  // We need a dedicated oracle for this pair. Let's deploy one.

  // Actually, let me reconsider. The Morpho oracle for market (loan=A, coll=B) is expected to return:
  // price = (1 unit of collateral in loan token terms) * 1e36
  // So for loan=wCTC, coll=sbUSD: how many wCTC is 1 sbUSD worth? = $1 / $5 = 0.2 wCTC → 0.2e36

  // Deploy a new oracle with price = 0.2e36
  const { abi: oracleAbi, bytecode: oracleBytecode } = loadLiquityArtifact("MockOracle");
  // 0.2e36 = 200000000000000000000000000000000000n
  const price_02 = 200000000000000000000000000000000000n; // 0.2e36
  const oracleHash = await wallet.deployContract({
    abi: oracleAbi, bytecode: oracleBytecode,
    args: [price_02], gas: 5_000_000n,
  });
  const oracleRx = await pub.waitForTransactionReceipt({ hash: oracleHash });
  if (oracleRx.status !== "success") throw new Error("Oracle deploy failed");
  const oracleSbUSDInWCTC = oracleRx.contractAddress!;
  console.log(`  Oracle (sbUSD/wCTC, 0.2e36): ${oracleSbUSDInWCTC}`);

  const wCTCLoanMarketParams = {
    loanToken: TOKENS.wCTC,
    collateralToken: TOKENS.sbUSD,
    oracle: oracleSbUSDInWCTC,
    irm: LEND.adaptiveCurveIRM,
    lltv: 770000000000000000n,
  };

  try {
    const mh = await wallet.writeContract({
      address: LEND.snowballLend, abi: createMarketAbi, functionName: "createMarket",
      args: [wCTCLoanMarketParams], gas: 1_000_000n,
    });
    await pub.waitForTransactionReceipt({ hash: mh });
    const mktId = keccak256(encodeAbiParameters(
      parseAbiParameters("address, address, address, address, uint256"),
      [wCTCLoanMarketParams.loanToken, wCTCLoanMarketParams.collateralToken,
       wCTCLoanMarketParams.oracle, wCTCLoanMarketParams.irm, wCTCLoanMarketParams.lltv],
    ));
    console.log(`  Market wCTC(loan)/sbUSD(coll): ${mktId.slice(0, 18)}... ✓`);
  } catch (e: any) {
    console.log(`  Market creation: ${e.shortMessage?.slice(0, 100) || e.message?.slice(0, 100)}`);
    console.log("  (May already exist, continuing...)");
  }

  const strat3 = await deploy("StrategyWCTCMorpho", [
    vault3.address,
    TOKENS.wCTC,
    TOKENS.wCTC,           // _native = wCTC (same as want)
    DEX.swapRouter,
    SWAP_FEE,
    account.address,
    account.address,
    LEND.snowballLend,
    wCTCLoanMarketParams,
  ]);
  await send(vault3.address, setStrategyAbi as any, "setStrategy", [strat3.address]);
  console.log("  → setStrategy ✓\n");

  // ══════════════════════════════════════════════════════════════
  // Vault 4: Morpho USDC
  // ══════════════════════════════════════════════════════════════
  console.log("=== Vault 4: Morpho USDC ===");
  const vault4 = await deploy("SnowballYieldVault", [
    TOKENS.USDC, "Moo Snowball Morpho USDC", "mooSnowM-USDC",
  ]);
  const strat4 = await deploy("StrategyUSDCMorpho", [
    vault4.address,
    TOKENS.USDC,
    TOKENS.wCTC,
    DEX.swapRouter,
    SWAP_FEE,
    account.address,
    account.address,
    LEND.snowballLend,
    MARKET_PARAMS.sbUSD_USDC, // sbUSD/USDC market — loan=USDC
  ]);
  await send(vault4.address, setStrategyAbi as any, "setStrategy", [strat4.address]);
  console.log("  → setStrategy ✓\n");

  // ══════════════════════════════════════════════════════════════
  // Summary
  // ══════════════════════════════════════════════════════════════
  console.log("═══════════════════════════════════════════");
  console.log("  YIELD VAULT DEPLOYMENT COMPLETE");
  console.log("═══════════════════════════════════════════");

  const result = {
    vaults: [
      {
        name: "Stability Pool",
        description: "Liquity 청산 수익 자동 복리",
        wantSymbol: "sbUSD",
        want: TOKENS.sbUSD,
        address: vault1.address,
        strategy: strat1.address,
      },
      {
        name: "Morpho sbUSD",
        description: "SnowballLend sbUSD 공급 이자",
        wantSymbol: "sbUSD",
        want: TOKENS.sbUSD,
        address: vault2.address,
        strategy: strat2.address,
      },
      {
        name: "Morpho wCTC",
        description: "SnowballLend wCTC 공급 이자",
        wantSymbol: "wCTC",
        want: TOKENS.wCTC,
        address: vault3.address,
        strategy: strat3.address,
      },
      {
        name: "Morpho USDC",
        description: "SnowballLend USDC 공급 이자",
        wantSymbol: "USDC",
        want: TOKENS.USDC,
        address: vault4.address,
        strategy: strat4.address,
      },
    ],
    oracles: {
      sbUSDInWCTC: oracleSbUSDInWCTC,
    },
  };

  console.log("\n" + JSON.stringify(result, null, 2));

  // Print addresses.ts update snippet
  console.log("\n═══ addresses.ts YIELD 업데이트 ═══");
  console.log(`export const YIELD = {
  vaults: [`);
  for (const v of result.vaults) {
    console.log(`    {
      address: "${v.address.toLowerCase()}" as Address,
      strategy: "${v.strategy.toLowerCase()}" as Address,
      want: TOKENS.${v.wantSymbol},
      wantSymbol: "${v.wantSymbol}",
      name: "${v.name}",
      description: "${v.description}",
    },`);
  }
  console.log(`  ],
} as const;`);
}

main().then(() => process.exit(0)).catch(e => { console.error("\n❌", e.message || e); process.exit(1); });
