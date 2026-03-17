/**
 * Forward Exchange (ForwardX) 전체 배포 스크립트
 *
 * UUPS 프록시 패턴으로 코어 인프라 + CRE 헬퍼를 배포하고 역할/마켓을 설정한다.
 *
 * 배포 순서:
 *   1. Vault (UUPS)
 *   2. RiskManager (UUPS)
 *   3. StubOracleAdapter → OracleGuard
 *   4. Forward (UUPS)
 *   5. SettlementEngine (UUPS)
 *   6. ForwardSettlementConsumer (UUPS)
 *   7. Marketplace (UUPS)
 *   8. ForwardViewHelper (view-only, no proxy)
 *   9. Role wiring + market config
 *
 * Usage: NODE_PATH=packages/integration/node_modules npx tsx scripts/deploy/deploy-forward-exchange.ts
 */
import {
  createPublicClient,
  createWalletClient,
  http,
  formatEther,
  encodeFunctionData,
  keccak256,
  toHex,
  type Address,
  type Abi,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { defineChain } from "viem";
import * as fs from "fs";
import * as path from "path";

// ─── .env 로드 ───
function loadEnv(): Record<string, string> {
  const envPath = path.join(__dirname, "../../.env");
  if (!fs.existsSync(envPath)) throw new Error(`.env not found at ${envPath}`);
  const env: Record<string, string> = {};
  for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const idx = trimmed.indexOf("=");
    if (idx === -1) continue;
    env[trimmed.slice(0, idx)] = trimmed.slice(idx + 1);
  }
  return env;
}
const env = loadEnv();

// ─── Chain ───
const cc3 = defineChain({
  id: 102031,
  name: "CC3 Testnet",
  nativeCurrency: { name: "CTC", symbol: "tCTC", decimals: 18 },
  rpcUrls: { default: { http: ["https://rpc.cc3-testnet.creditcoin.network"] } },
});

// ─── Accounts ───
const DEPLOYER_KEY = env.DEPLOYER_PRIVATE_KEY;
if (!DEPLOYER_KEY) throw new Error("DEPLOYER_PRIVATE_KEY not set in .env");
const account = privateKeyToAccount(DEPLOYER_KEY as `0x${string}`);
const transport = http("https://rpc.cc3-testnet.creditcoin.network");
const pub = createPublicClient({ chain: cc3, transport });
const wallet = createWalletClient({ account, chain: cc3, transport });

// ─── Existing tokens ───
const USDC = "0x60e204104cfe1a93f630ea5ebc0a895cc80ebed9" as Address;

// ─── CRE feed IDs (keccak256 of pair name, used as market IDs) ───
const USD_KRW_FEED_ID = "0xe539120487c29b4defdf9a53d337316ea022a2688978a468f9efd847201be7e3" as `0x${string}`;
const USD_JPY_FEED_ID = "0xef2c98c804ba503c6a707e38be4dfbb16683775f195b091252bf24693042fd52" as `0x${string}`;
const USD_KRW_MARKET = keccak256(toHex("USD/KRW"));
const USD_JPY_MARKET = keccak256(toHex("USD/JPY"));

// ─── Artifact loader ───
const FWD_OUT = path.join(__dirname, "../../packages/forward-exchange/out");

function loadArtifact(contractName: string, solFileName?: string): { abi: Abi; bytecode: `0x${string}` } {
  const solFile = solFileName || `${contractName}.sol`;
  const p = path.join(FWD_OUT, solFile, `${contractName}.json`);
  if (!fs.existsSync(p)) throw new Error(`Artifact not found: ${p}`);
  const a = JSON.parse(fs.readFileSync(p, "utf8"));
  return { abi: a.abi, bytecode: (a.bytecode?.object ?? a.bytecode) as `0x${string}` };
}

// ─── Deploy helpers ───
async function deployRaw(
  abi: Abi,
  bytecode: `0x${string}`,
  args: any[],
  label: string,
): Promise<{ address: Address; abi: Abi }> {
  const hash = await wallet.deployContract({ abi, bytecode, args, gas: 8_000_000n });
  const rx = await pub.waitForTransactionReceipt({ hash });
  if (rx.status !== "success") throw new Error(`Deploy ${label} reverted: ${hash}`);
  console.log(`  ${label}: ${rx.contractAddress}`);
  return { address: rx.contractAddress!, abi };
}

async function deploySimple(contractName: string, args: any[] = [], solFileName?: string) {
  const { abi, bytecode } = loadArtifact(contractName, solFileName);
  return deployRaw(abi, bytecode, args, contractName);
}

async function deployProxy(contractName: string, initArgs: any[], solFileName?: string) {
  const { abi: implAbi, bytecode: implBytecode } = loadArtifact(contractName, solFileName);
  const { abi: proxyAbi, bytecode: proxyBytecode } = loadArtifact("ERC1967Proxy");

  // 1. Deploy implementation
  const implHash = await wallet.deployContract({ abi: implAbi, bytecode: implBytecode, args: [], gas: 8_000_000n });
  const implRx = await pub.waitForTransactionReceipt({ hash: implHash });
  if (implRx.status !== "success") throw new Error(`Deploy ${contractName} impl reverted`);
  console.log(`  ${contractName} (impl): ${implRx.contractAddress}`);

  // 2. Encode initialize calldata
  const initFn = (implAbi as any[]).find((x: any) => x.name === "initialize" && x.type === "function");
  if (!initFn) throw new Error(`No initialize() in ${contractName}`);
  const initData = encodeFunctionData({ abi: implAbi, functionName: "initialize", args: initArgs });

  // 3. Deploy ERC1967Proxy(implementation, initData)
  const proxyHash = await wallet.deployContract({
    abi: proxyAbi,
    bytecode: proxyBytecode,
    args: [implRx.contractAddress!, initData],
    gas: 8_000_000n,
  });
  const proxyRx = await pub.waitForTransactionReceipt({ hash: proxyHash });
  if (proxyRx.status !== "success") throw new Error(`Deploy ${contractName} proxy reverted`);
  console.log(`  ${contractName} (proxy): ${proxyRx.contractAddress}`);

  return { address: proxyRx.contractAddress!, abi: implAbi };
}

async function send(addr: Address, abi: Abi, fn: string, args: any[] = []) {
  const hash = await wallet.writeContract({ address: addr, abi, functionName: fn, args, gas: 5_000_000n });
  const rx = await pub.waitForTransactionReceipt({ hash });
  if (rx.status !== "success") throw new Error(`TX ${fn} on ${addr} reverted`);
  return hash;
}

// ─── Role constants (keccak256 of string) ───
const OPERATOR_ROLE = keccak256(toHex("OPERATOR_ROLE"));
const MARKETPLACE_ROLE = keccak256(toHex("MARKETPLACE_ROLE"));
const CRE_CONSUMER_ROLE = keccak256(toHex("CRE_CONSUMER_ROLE"));

// ─── Main ───
async function main() {
  const bal = await pub.getBalance({ address: account.address });
  console.log(`Deployer: ${account.address}`);
  console.log(`Balance:  ${formatEther(bal)} CTC`);
  console.log(`USDC:     ${USDC}\n`);

  // KeystoneForwarder — 테스트넷에서는 deployer를 forwarder로 사용
  const keystoneForwarder = account.address;
  console.log(`KeystoneForwarder (stub): ${keystoneForwarder}\n`);

  // ══════════════════════════════════════════════════════
  // 1. Vault
  // ══════════════════════════════════════════════════════
  console.log("=== 1. Vault (UUPS) ===");
  const vault = await deployProxy("Vault", [USDC, account.address]);

  // ══════════════════════════════════════════════════════
  // 2. RiskManager
  // ══════════════════════════════════════════════════════
  console.log("\n=== 2. RiskManager (UUPS) ===");
  const riskManager = await deployProxy("RiskManager", [account.address]);

  // ══════════════════════════════════════════════════════
  // 3. Oracle (StubOracleAdapter + OracleGuard)
  // ══════════════════════════════════════════════════════
  console.log("\n=== 3. StubOracleAdapter + OracleGuard ===");
  const stubOracle = await deploySimple("StubOracleAdapter", [account.address]);

  // 가격 설정: USD/KRW ~1400, USD/JPY ~150 (18 decimals)
  await send(stubOracle.address, stubOracle.abi, "setPrice", [USD_KRW_FEED_ID, 1400n * 10n ** 18n]);
  console.log("  setPrice USD/KRW = 1400e18");
  await send(stubOracle.address, stubOracle.abi, "setPrice", [USD_JPY_FEED_ID, 150n * 10n ** 18n]);
  console.log("  setPrice USD/JPY = 150e18");

  const oracleGuard = await deploySimple("OracleGuard", [stubOracle.address, account.address]);

  // ══════════════════════════════════════════════════════
  // 4. Forward
  // ══════════════════════════════════════════════════════
  console.log("\n=== 4. Forward (UUPS) ===");
  const forward = await deployProxy("Forward", [
    vault.address,
    riskManager.address,
    oracleGuard.address,
    account.address,
  ]);

  // ══════════════════════════════════════════════════════
  // 5. SettlementEngine
  // ══════════════════════════════════════════════════════
  console.log("\n=== 5. SettlementEngine (UUPS) ===");
  const settlementWindow = 3600n; // 1 hour
  const settlementEngine = await deployProxy("SettlementEngine", [
    forward.address,
    oracleGuard.address,
    vault.address,
    riskManager.address,
    account.address,
    settlementWindow,
  ]);

  // ══════════════════════════════════════════════════════
  // 6. ForwardSettlementConsumer
  // ══════════════════════════════════════════════════════
  console.log("\n=== 6. ForwardSettlementConsumer (UUPS) ===");
  const consumer = await deployProxy("ForwardSettlementConsumer", [
    forward.address,
    vault.address,
    riskManager.address,
    keystoneForwarder,
    account.address,
  ]);

  // ══════════════════════════════════════════════════════
  // 7. Marketplace
  // ══════════════════════════════════════════════════════
  console.log("\n=== 7. Marketplace (UUPS) ===");
  const marketplace = await deployProxy("Marketplace", [
    forward.address,
    vault.address,
    account.address,
  ]);

  // ══════════════════════════════════════════════════════
  // 8. ForwardViewHelper (no proxy, pure view)
  // ══════════════════════════════════════════════════════
  console.log("\n=== 8. ForwardViewHelper ===");
  const viewHelper = await deploySimple("ForwardViewHelper", []);

  // ══════════════════════════════════════════════════════
  // 9. Role wiring
  // ══════════════════════════════════════════════════════
  console.log("\n=== 9. Role Wiring ===");

  // Vault roles
  await send(vault.address, vault.abi, "grantRole", [OPERATOR_ROLE, forward.address]);
  console.log("  Vault.grantRole(OPERATOR, Forward)");
  await send(vault.address, vault.abi, "grantRole", [OPERATOR_ROLE, settlementEngine.address]);
  console.log("  Vault.grantRole(OPERATOR, SettlementEngine)");
  await send(vault.address, vault.abi, "grantRole", [OPERATOR_ROLE, consumer.address]);
  console.log("  Vault.grantRole(OPERATOR, Consumer)");
  await send(vault.address, vault.abi, "grantRole", [MARKETPLACE_ROLE, marketplace.address]);
  console.log("  Vault.grantRole(MARKETPLACE, Marketplace)");

  // Forward roles
  await send(forward.address, forward.abi, "setSettlementEngine", [settlementEngine.address]);
  console.log("  Forward.setSettlementEngine(SettlementEngine)");
  await send(forward.address, forward.abi, "grantRole", [CRE_CONSUMER_ROLE, consumer.address]);
  console.log("  Forward.grantRole(CRE_CONSUMER, Consumer)");

  // RiskManager operators
  await send(riskManager.address, riskManager.abi, "setOperator", [forward.address, true]);
  console.log("  RiskManager.setOperator(Forward)");
  await send(riskManager.address, riskManager.abi, "setOperator", [settlementEngine.address, true]);
  console.log("  RiskManager.setOperator(SettlementEngine)");
  await send(riskManager.address, riskManager.abi, "setOperator", [consumer.address, true]);
  console.log("  RiskManager.setOperator(Consumer)");

  // ══════════════════════════════════════════════════════
  // 10. Market config
  // ══════════════════════════════════════════════════════
  console.log("\n=== 10. Market Config ===");

  const marketConfigs = [
    {
      marketId: USD_KRW_MARKET,
      name: "USD/KRW",
      config: {
        priceFeedId: USD_KRW_FEED_ID,
        maxPositionSize: 10_000_000n * 10n ** 6n,      // 10M USDC
        maxOpenInterest: 100_000_000n * 10n ** 6n,      // 100M USDC
        maxConcentrationBps: 10_000n,                    // 100%
        minMaturity: 300n,                               // 5 min (testnet)
        maxMaturity: 365n * 24n * 3600n,                 // 365 days
        active: true,
      },
    },
    {
      marketId: USD_JPY_MARKET,
      name: "USD/JPY",
      config: {
        priceFeedId: USD_JPY_FEED_ID,
        maxPositionSize: 10_000_000n * 10n ** 6n,
        maxOpenInterest: 100_000_000n * 10n ** 6n,
        maxConcentrationBps: 10_000n,
        minMaturity: 300n,
        maxMaturity: 365n * 24n * 3600n,
        active: true,
      },
    },
  ];

  for (const m of marketConfigs) {
    await send(riskManager.address, riskManager.abi, "addMarket", [m.marketId, m.config]);
    console.log(`  addMarket ${m.name}: ${m.marketId.slice(0, 18)}...`);
  }

  // ══════════════════════════════════════════════════════
  // Summary
  // ══════════════════════════════════════════════════════
  console.log("\n═══════════════════════════════════════════");
  console.log("  FORWARD EXCHANGE DEPLOYMENT COMPLETE");
  console.log("═══════════════════════════════════════════\n");

  const result = {
    vault: vault.address,
    riskManager: riskManager.address,
    stubOracle: stubOracle.address,
    oracleGuard: oracleGuard.address,
    forward: forward.address,
    settlementEngine: settlementEngine.address,
    forwardSettlementConsumer: consumer.address,
    marketplace: marketplace.address,
    forwardViewHelper: viewHelper.address,
    collateralToken: USDC,
    keystoneForwarder: keystoneForwarder,
    markets: marketConfigs.map((m) => ({
      id: m.marketId,
      name: m.name,
    })),
  };

  console.log(JSON.stringify(result, null, 2));

  // Save result
  const outDir = path.join(__dirname, "../../deployments/creditcoin-testnet");
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, "forward-exchange.json");
  fs.writeFileSync(outPath, JSON.stringify(result, null, 2));
  console.log(`\nSaved to: ${outPath}`);

  // Print addresses.ts update snippet
  console.log("\n═══ addresses.ts FORWARD 업데이트 ═══");
  console.log(`export const FORWARD = {
  exchange: "${forward.address.toLowerCase()}" as Address,
  vault: "${vault.address.toLowerCase()}" as Address,
  marketplace: "${marketplace.address.toLowerCase()}" as Address,
  settlementEngine: "${settlementEngine.address.toLowerCase()}" as Address,
  consumer: "${consumer.address.toLowerCase()}" as Address,
  oracleGuard: "${oracleGuard.address.toLowerCase()}" as Address,
  viewHelper: "${viewHelper.address.toLowerCase()}" as Address,
  positionNFT: "${forward.address.toLowerCase()}" as Address, // Forward is the ERC721
  collateralToken: TOKENS.USDC,
  markets: [
    { id: "${USD_KRW_MARKET}" as \`0x\${string}\`, name: "USD/KRW", pair: "USD/KRW" },
    { id: "${USD_JPY_MARKET}" as \`0x\${string}\`, name: "USD/JPY", pair: "USD/JPY" },
  ],
} as const;`);
}

main().then(() => process.exit(0)).catch((e) => {
  console.error("\nFAILED:", e.message || e);
  process.exit(1);
});
