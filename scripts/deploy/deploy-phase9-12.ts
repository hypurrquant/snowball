/**
 * Phase 9-12: Token Distribution + Morpho Markets + DEX Pools
 *
 * Uses addresses from the already-completed Phase 1-8 deployment.
 * Light version: 10k tokens per account instead of 1M.
 *
 * Usage: NODE_PATH=apps/web/node_modules npx tsx scripts/deploy-phase9-12.ts
 */
import {
  createPublicClient, createWalletClient, http, parseEther, formatEther,
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

// Already deployed addresses from Phase 1-8
const DEPLOYED = {
  tokens: {
    wCTC: "0xca69344e2917f026ef4a5ace5d7b122343fc8528" as Address,
    lstCTC: "0xa768d376272f9216c8c4aa3063391bdafbcad4c2" as Address,
    USDC: "0x60e204104cfe1a93f630ea5ebc0a895cc80ebed9" as Address,
    sbUSD: "0x8aefed3e2e9a886bdd72ec9cebe27d7aabced2a5" as Address,
  },
  oracles: {
    wCTC: "0xf3c292721011ef0f5bff2b4657a1d32b15a34fa2" as Address,
    lstCTC: "0xff5f8a4c3f41d6bd0247d9655cebda9e3246712a" as Address,
    sbUSD: "0x32fc6b26d7f5f0af091f196e1cac66678a0ef84a" as Address,
  },
  priceFeeds: {
    wCTC: "0xca9341894230b84fdff429ff43e83cc8f8990342" as Address,
    lstCTC: "0xa12ed39d24d4bbc100d310ae1cbf10b4c67e4a08" as Address,
  },
  interestRouter: "0x79279f46a533b149cc65fed9306f2967232d085c" as Address,
  liquity: {
    branches: {
      wCTC: {
        addressesRegistry: "0x7cfed108ed84194cf37f93d47268fbdd14da73d2" as Address,
        troveManager: "0xa20f9dfeb110e11c89147b9db5adb98a7d91e70e" as Address,
        borrowerOperations: "0xb637f375cbbd278ace5fdba53ad868ae7cb186ea" as Address,
        stabilityPool: "0xf1654541efb7a3c34a9255464ebb2294fa1a43f3" as Address,
        activePool: "0xa7f0600a023cf6076f5d8dc51b46b91bafe095e5" as Address,
        defaultPool: "0x201ff7ec1a9ceaf1396ea6d90cd24ac6b757e404" as Address,
        gasPool: "0x4aa86795705a604e3dac4cfe45c375976eca3189" as Address,
        collSurplusPool: "0x0dc9642129470d6a0ac0bac2a5d1b18a2ea09111" as Address,
        sortedTroves: "0xf5ef344759df7786cda9d2133e4d1e10e3b43f9f" as Address,
        troveNFT: "0x72e383eff50893e2b2edeb711a81c3a812dcd2f9" as Address,
      },
      lstCTC: {
        addressesRegistry: "0x0afe1c58a76c49d62bd7331f309aa14731efb1fc" as Address,
        troveManager: "0x83715c7e9873b0b8208adbbf8e07f31e83b94aed" as Address,
        borrowerOperations: "0x8700ed43989e2f935ab8477dd8b2822cae7f60ca" as Address,
        stabilityPool: "0xec700d805b5de3bf988401af44b1b384b136c41b" as Address,
        activePool: "0xa57cca34198bf262a278da3b2b7a8a5f032cb835" as Address,
        defaultPool: "0x6ed045c0cadc55755dc09f1bfee0f964baf1f859" as Address,
        gasPool: "0x31d560b7a74b179dce8a8017a1de707c32dd67da" as Address,
        collSurplusPool: "0xa287db89e552698a118c89d8bbee25bf51a0ec33" as Address,
        sortedTroves: "0x25aa78c7b0dbc736ae23a316ab44579467ba9507" as Address,
        troveNFT: "0x51a90151e0dd1348e77ee6bcc30278ee311f29a8" as Address,
      },
    },
    shared: {
      collateralRegistry: "0x5c1683f9d8a8d77de48b380a15b623cf5d91bb59" as Address,
      hintHelpers: "0x6ee9850b0915763bdc0c7edca8b66189449a447f" as Address,
      multiTroveGetter: "0xc26bce003e00dde70c0ecff8778e9edacd5ec6e6" as Address,
      redemptionHelper: "0x8baf58113f968b4dfb2916290b57ce3ae114fb77" as Address,
      debtInFrontHelper: "0x9fd6116fc1d006fa1d8993746ac1924f16d722bb" as Address,
      agentVault: "0xf8e322c36485fa4c3971f75819c5de5a9be2b870" as Address,
    },
  },
};

const EXISTING = {
  factory: "0x09616b503326dc860b3c3465525b39fe4fcdd049" as Address,
  swapRouter: "0xec48ed2e9c81b77ab6f8e79c257f9d0c21074154" as Address,
  npm: "0xa28bfaa2e84098de8d654f690e51c265e4ae01c9" as Address,
  quoterV2: "0x2383343c2c7ae52984872f541b8b22f8da0b419a" as Address,
  snowballLend: "0x7d604b31297b36aace73255931f65e891cf289d3" as Address,
  adaptiveCurveIRM: "0x0ac487d84507b2fbe9130acc080f2b554cb3fffe" as Address,
};

async function send(addr: Address, abi: any, fn: string, args: any[] = []) {
  const hash = await wallet.writeContract({ address: addr, abi, functionName: fn, args, gas: 5_000_000n });
  const rx = await pub.waitForTransactionReceipt({ hash });
  if (rx.status !== "success") throw new Error(`TX ${fn} on ${addr} reverted`);
  return hash;
}

const faucetAbi = [{ type: "function", name: "faucet", inputs: [{ name: "amount", type: "uint256" }], outputs: [], stateMutability: "nonpayable" }] as const;
const transferAbi = [{ type: "function", name: "transfer", inputs: [{ name: "to", type: "address" }, { name: "amount", type: "uint256" }], outputs: [{ type: "bool" }], stateMutability: "nonpayable" }] as const;
const mintAbi = [{ type: "function", name: "mint", inputs: [{ name: "to", type: "address" }, { name: "amount", type: "uint256" }], outputs: [], stateMutability: "nonpayable" }] as const;

async function main() {
  const bal = await pub.getBalance({ address: account.address });
  console.log(`Deployer: ${account.address}`);
  console.log(`Balance: ${formatEther(bal)} CTC\n`);

  // ══════════════════════════════════════════════════════════════
  // Phase 9: Token Distribution (light: 10k per account)
  // ══════════════════════════════════════════════════════════════
  console.log("=== Phase 9: Token Distribution ===");
  const PER_ACCOUNT = parseEther("10000");
  const totalAccounts = accts.accounts.length; // 8
  const totalNeeded = PER_ACCOUNT * BigInt(totalAccounts + 1); // +1 for deployer reserve

  // wCTC: faucet 100k is enough for 9 × 10k = 90k
  console.log("  Minting wCTC (1 faucet call = 100k)...");
  await send(DEPLOYED.tokens.wCTC, faucetAbi as any, "faucet", [parseEther("100000")]);

  // lstCTC: same
  console.log("  Minting lstCTC (1 faucet call = 100k)...");
  await send(DEPLOYED.tokens.lstCTC, faucetAbi as any, "faucet", [parseEther("100000")]);

  // USDC: mint directly
  console.log("  Minting USDC...");
  await send(DEPLOYED.tokens.USDC, mintAbi as any, "mint", [account.address, parseEther("100000")]);

  // Distribute to 8 simulation accounts
  for (const acc of accts.accounts) {
    await send(DEPLOYED.tokens.wCTC, transferAbi as any, "transfer", [acc.address as Address, PER_ACCOUNT]);
    await send(DEPLOYED.tokens.lstCTC, transferAbi as any, "transfer", [acc.address as Address, PER_ACCOUNT]);
    await send(DEPLOYED.tokens.USDC, transferAbi as any, "transfer", [acc.address as Address, PER_ACCOUNT]);
    console.log(`  -> ${acc.label}: 10k wCTC + 10k lstCTC + 10k USDC`);
  }
  console.log("  Token distribution done!");

  // ══════════════════════════════════════════════════════════════
  // Phase 10: Morpho Markets
  // ══════════════════════════════════════════════════════════════
  console.log("\n=== Phase 10: Morpho Markets ===");
  const slAbi = [{
    type: "function", name: "createMarket",
    inputs: [{ name: "marketParams", type: "tuple", components: [
      { name: "loanToken", type: "address" }, { name: "collateralToken", type: "address" },
      { name: "oracle", type: "address" }, { name: "irm", type: "address" }, { name: "lltv", type: "uint256" },
    ]}],
    outputs: [{ name: "id", type: "bytes32" }], stateMutability: "nonpayable",
  }] as const;

  const mktConfigs = [
    { name: "wCTC/sbUSD", loan: DEPLOYED.tokens.sbUSD, coll: DEPLOYED.tokens.wCTC, oracle: DEPLOYED.oracles.wCTC, lltv: 770000000000000000n },
    { name: "lstCTC/sbUSD", loan: DEPLOYED.tokens.sbUSD, coll: DEPLOYED.tokens.lstCTC, oracle: DEPLOYED.oracles.lstCTC, lltv: 770000000000000000n },
    { name: "sbUSD/USDC", loan: DEPLOYED.tokens.USDC, coll: DEPLOYED.tokens.sbUSD, oracle: DEPLOYED.oracles.sbUSD, lltv: 900000000000000000n },
  ];
  const marketIds: string[] = [];

  for (const m of mktConfigs) {
    try {
      const h = await wallet.writeContract({
        address: EXISTING.snowballLend, abi: slAbi, functionName: "createMarket",
        args: [{ loanToken: m.loan, collateralToken: m.coll, oracle: m.oracle, irm: EXISTING.adaptiveCurveIRM, lltv: m.lltv }],
        gas: 1_000_000n,
      });
      await pub.waitForTransactionReceipt({ hash: h });
      const id = keccak256(encodeAbiParameters(
        parseAbiParameters("address, address, address, address, uint256"),
        [m.loan, m.coll, m.oracle, EXISTING.adaptiveCurveIRM, m.lltv],
      ));
      marketIds.push(id);
      console.log(`  ${m.name}: ${id.slice(0, 18)}...`);
    } catch (e: any) {
      console.log(`  ${m.name}: FAILED - ${e.shortMessage?.slice(0, 80)}`);
      marketIds.push("0x");
    }
  }

  // ══════════════════════════════════════════════════════════════
  // Phase 11: DEX Pools
  // ══════════════════════════════════════════════════════════════
  console.log("\n=== Phase 11: DEX Pools ===");
  const factoryAbi = [
    { type: "function", name: "createPool", inputs: [{ name: "a", type: "address" }, { name: "b", type: "address" }, { name: "fee", type: "uint24" }], outputs: [{ type: "address" }], stateMutability: "nonpayable" },
    { type: "function", name: "getPool", inputs: [{ name: "a", type: "address" }, { name: "b", type: "address" }, { name: "fee", type: "uint24" }], outputs: [{ type: "address" }], stateMutability: "view" },
  ] as const;
  const initAbi = [{ type: "function", name: "initialize", inputs: [{ name: "sqrtPriceX96", type: "uint160" }], outputs: [], stateMutability: "nonpayable" }] as const;

  const sort = (a: Address, b: Address): [Address, Address] =>
    a.toLowerCase() < b.toLowerCase() ? [a, b] : [b, a];
  const sqrtX96 = (p: number) => BigInt(Math.floor(Math.sqrt(p) * 2 ** 96));

  const poolCfgs = [
    { name: "wCTC/USDC", a: DEPLOYED.tokens.wCTC, b: DEPLOYED.tokens.USDC, fee: 3000, price: 5.0 },
    { name: "lstCTC/USDC", a: DEPLOYED.tokens.lstCTC, b: DEPLOYED.tokens.USDC, fee: 3000, price: 5.2 },
    { name: "wCTC/sbUSD", a: DEPLOYED.tokens.wCTC, b: DEPLOYED.tokens.sbUSD, fee: 3000, price: 5.0 },
    { name: "sbUSD/USDC", a: DEPLOYED.tokens.sbUSD, b: DEPLOYED.tokens.USDC, fee: 500, price: 1.0 },
    { name: "lstCTC/wCTC", a: DEPLOYED.tokens.lstCTC, b: DEPLOYED.tokens.wCTC, fee: 3000, price: 1.04 },
  ];

  const poolAddrs: Record<string, Address> = {};
  for (const p of poolCfgs) {
    try {
      await wallet.writeContract({
        address: EXISTING.factory, abi: factoryAbi, functionName: "createPool",
        args: [p.a, p.b, p.fee], gas: 5_000_000n,
      }).then(h => pub.waitForTransactionReceipt({ hash: h }));

      const poolAddr = await pub.readContract({
        address: EXISTING.factory, abi: factoryAbi, functionName: "getPool", args: [p.a, p.b, p.fee],
      });

      const [t0] = sort(p.a, p.b);
      const isAT0 = t0.toLowerCase() === p.a.toLowerCase();
      const sq = isAT0 ? sqrtX96(p.price) : sqrtX96(1 / p.price);

      await wallet.writeContract({
        address: poolAddr, abi: initAbi, functionName: "initialize", args: [sq], gas: 1_000_000n,
      }).then(h => pub.waitForTransactionReceipt({ hash: h }));

      poolAddrs[p.name] = poolAddr;
      console.log(`  ${p.name}: ${poolAddr}`);
    } catch (e: any) {
      console.log(`  ${p.name}: FAILED - ${e.shortMessage?.slice(0, 100)}`);
    }
  }

  // ══════════════════════════════════════════════════════════════
  // Phase 12: Save
  // ══════════════════════════════════════════════════════════════
  console.log("\n=== Phase 12: Save ===");
  const result = {
    network: { chainId: 102031, rpc: "https://rpc.cc3-testnet.creditcoin.network" },
    deployer: account.address,
    tokens: DEPLOYED.tokens,
    liquity: DEPLOYED.liquity,
    morpho: {
      snowballLend: EXISTING.snowballLend, adaptiveCurveIRM: EXISTING.adaptiveCurveIRM,
      oracles: DEPLOYED.oracles,
      markets: mktConfigs.map((m, i) => ({
        id: marketIds[i], name: m.name, loanToken: m.loan, collateralToken: m.coll,
        loanSymbol: m.name.split("/")[1]?.trim(), collSymbol: m.name.split("/")[0]?.trim(),
        lltv: m.lltv.toString(),
      })),
    },
    dex: { ...EXISTING, pools: poolAddrs },
    priceFeeds: DEPLOYED.priceFeeds,
    interestRouter: DEPLOYED.interestRouter,
  };

  const outPath = path.join(__dirname, "../../deployments/creditcoin-testnet/full-redeploy.json");
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(result, null, 2));

  console.log(`\nDone! -> ${outPath}`);
}

main().then(() => process.exit(0)).catch(e => { console.error("\nERROR:", e.message || e); process.exit(1); });
