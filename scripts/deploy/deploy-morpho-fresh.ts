/**
 * Fresh Morpho (SnowballLend) Deployment
 * Deploys: Morpho + AdaptiveCurveIRM + 3 CreditcoinOracles + 3 Markets
 *
 * Usage: cd packages/morpho && npx tsx ../../scripts/deploy-morpho-fresh.ts
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

// Existing tokens (from full-redeploy)
const TOKENS = {
  wCTC: "0xca69344e2917f026ef4a5ace5d7b122343fc8528" as Address,
  lstCTC: "0xa768d376272f9216c8c4aa3063391bdafbcad4c2" as Address,
  sbUSD: "0x8aefed3e2e9a886bdd72ec9cebe27d7aabced2a5" as Address,
  USDC: "0x60e204104cfe1a93f630ea5ebc0a895cc80ebed9" as Address,
};

const MORPHO_OUT = path.join(__dirname, "../../packages/morpho/out");

function loadArtifact(name: string, subdir: string): { abi: Abi; bytecode: `0x${string}` } {
  const p = path.join(MORPHO_OUT, `${subdir}/${name}.json`);
  if (!fs.existsSync(p)) throw new Error(`Artifact not found: ${p}`);
  const a = JSON.parse(fs.readFileSync(p, "utf8"));
  return { abi: a.abi, bytecode: (a.bytecode?.object ?? a.bytecode) as `0x${string}` };
}

async function deploy(name: string, subdir: string, args: any[] = []): Promise<{ address: Address; abi: Abi }> {
  const { abi, bytecode } = loadArtifact(name, `${subdir}.sol`);
  const hash = await wallet.deployContract({ abi, bytecode, args, gas: 8_000_000n });
  const rx = await pub.waitForTransactionReceipt({ hash });
  if (rx.status !== "success") throw new Error(`Deploy ${name} reverted`);
  console.log(`  ${name}: ${rx.contractAddress}`);
  return { address: rx.contractAddress!, abi };
}

async function send(addr: Address, abi: Abi, fn: string, args: any[] = []) {
  const hash = await wallet.writeContract({ address: addr, abi, functionName: fn, args, gas: 3_000_000n });
  const rx = await pub.waitForTransactionReceipt({ hash });
  if (rx.status !== "success") throw new Error(`TX ${fn} reverted`);
  return hash;
}

const LLTV_77 = 770000000000000000n;
const LLTV_90 = 900000000000000000n;

// Oracle prices at 1e36 scale (Morpho Blue standard)
const PRICE_WCTC = 5000000000000000000000000000000000000n;   // $5
const PRICE_LSTCTC = 5200000000000000000000000000000000000n; // $5.20
const PRICE_SBUSD = 1000000000000000000000000000000000000n;  // $1

async function main() {
  const bal = await pub.getBalance({ address: account.address });
  console.log(`Deployer: ${account.address}`);
  console.log(`Balance: ${formatEther(bal)} CTC\n`);

  // === 1. Deploy Core ===
  console.log("=== 1. Deploy Morpho (SnowballLend) ===");
  const morpho = await deploy("Morpho", "Morpho", [account.address]);

  console.log("\n=== 2. Deploy AdaptiveCurveIRM ===");
  const irm = await deploy("AdaptiveCurveIrm", "AdaptiveCurveIrm", [morpho.address]);

  // === 3. Deploy Oracles (1e36 scale) ===
  console.log("\n=== 3. Deploy CreditcoinOracles (1e36 scale) ===");
  const oracleWCTC = await deploy("CreditcoinOracle", "CreditcoinOracle", [PRICE_WCTC]);
  const oracleLstCTC = await deploy("CreditcoinOracle", "CreditcoinOracle", [PRICE_LSTCTC]);
  const oracleSbUSD = await deploy("CreditcoinOracle", "CreditcoinOracle", [PRICE_SBUSD]);

  // === 4. Configure ===
  console.log("\n=== 4. Enable IRM + LLTVs ===");
  await send(morpho.address, morpho.abi, "enableIrm", [irm.address]);
  console.log("  IRM enabled");
  await send(morpho.address, morpho.abi, "enableLltv", [LLTV_77]);
  console.log("  LLTV 77% enabled");
  await send(morpho.address, morpho.abi, "enableLltv", [LLTV_90]);
  console.log("  LLTV 90% enabled");

  // === 5. Create Markets ===
  console.log("\n=== 5. Create Markets ===");
  const createMarketAbi = [{
    type: "function", name: "createMarket",
    inputs: [{ name: "marketParams", type: "tuple", components: [
      { name: "loanToken", type: "address" }, { name: "collateralToken", type: "address" },
      { name: "oracle", type: "address" }, { name: "irm", type: "address" }, { name: "lltv", type: "uint256" },
    ]}],
    outputs: [], stateMutability: "nonpayable",
  }] as const;

  const markets = [
    { name: "wCTC/sbUSD", loan: TOKENS.sbUSD, coll: TOKENS.wCTC, oracle: oracleWCTC.address, lltv: LLTV_77, loanSymbol: "sbUSD", collSymbol: "wCTC" },
    { name: "lstCTC/sbUSD", loan: TOKENS.sbUSD, coll: TOKENS.lstCTC, oracle: oracleLstCTC.address, lltv: LLTV_77, loanSymbol: "sbUSD", collSymbol: "lstCTC" },
    { name: "sbUSD/USDC", loan: TOKENS.USDC, coll: TOKENS.sbUSD, oracle: oracleSbUSD.address, lltv: LLTV_90, loanSymbol: "USDC", collSymbol: "sbUSD" },
  ];

  const marketIds: string[] = [];
  for (const m of markets) {
    const h = await wallet.writeContract({
      address: morpho.address, abi: createMarketAbi, functionName: "createMarket",
      args: [{ loanToken: m.loan, collateralToken: m.coll, oracle: m.oracle, irm: irm.address, lltv: m.lltv }],
      gas: 1_000_000n,
    });
    await pub.waitForTransactionReceipt({ hash: h });
    const id = keccak256(encodeAbiParameters(
      parseAbiParameters("address, address, address, address, uint256"),
      [m.loan, m.coll, m.oracle, irm.address, m.lltv],
    ));
    marketIds.push(id);
    console.log(`  ${m.name}: ${id.slice(0, 18)}... (LLTV ${Number(m.lltv) / 1e16}%)`);
  }

  // === 6. Verify ===
  console.log("\n=== 6. Verify ===");
  const ownerResult = await pub.readContract({ address: morpho.address, abi: morpho.abi, functionName: "owner", args: [] });
  console.log(`  Owner: ${ownerResult}`);

  for (let i = 0; i < marketIds.length; i++) {
    const mkt = await pub.readContract({
      address: morpho.address, abi: morpho.abi, functionName: "market", args: [marketIds[i] as `0x${string}`],
    }) as any;
    console.log(`  ${markets[i].name} lastUpdate: ${mkt[4]} ${Number(mkt[4]) > 0 ? "OK" : "FAIL"}`);
  }

  // === 7. Output ===
  const result = {
    snowballLend: morpho.address,
    adaptiveCurveIRM: irm.address,
    oracles: { wCTC: oracleWCTC.address, lstCTC: oracleLstCTC.address, sbUSD: oracleSbUSD.address },
    markets: markets.map((m, i) => ({
      id: marketIds[i], name: m.name,
      loanToken: m.loan, collateralToken: m.coll,
      loanSymbol: m.loanSymbol, collSymbol: m.collSymbol,
      lltv: m.lltv.toString(),
    })),
  };

  console.log("\n=== RESULT ===");
  console.log(JSON.stringify(result, null, 2));

  const outPath = path.join(__dirname, "../morpho-deploy-result.json");
  fs.writeFileSync(outPath, JSON.stringify(result, null, 2));
  console.log(`\nSaved to: ${outPath}`);
}

main().then(() => process.exit(0)).catch(e => { console.error("\nFAILED:", e.message || e); process.exit(1); });
