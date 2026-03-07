/**
 * Full Protocol Redeployment Script (v0.12.0)
 *
 * Key insight: Core Liquity contracts read from AddressesRegistry in their constructors,
 * so we must call AR.setAddresses() BEFORE deploying them. This requires pre-computing
 * contract addresses via nonce prediction.
 *
 * Usage: NODE_PATH=apps/web/node_modules npx tsx scripts/deploy-full.ts
 */
import {
  createPublicClient, createWalletClient, http, parseEther, formatEther,
  getContractAddress, encodeAbiParameters, parseAbiParameters, keccak256,
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

const EXISTING = {
  factory: "0x09616b503326dc860b3c3465525b39fe4fcdd049" as Address,
  swapRouter: "0xec48ed2e9c81b77ab6f8e79c257f9d0c21074154" as Address,
  npm: "0xa28bfaa2e84098de8d654f690e51c265e4ae01c9" as Address,
  quoterV2: "0x2383343c2c7ae52984872f541b8b22f8da0b419a" as Address,
  snowballLend: "0x190a733eda9ba7d2b52d56764c5921d5cd4752ca" as Address,
  adaptiveCurveIRM: "0xc4c694089af9bab4c6151663ae8424523fce32a8" as Address,
};

const OUT = path.join(__dirname, "../../packages/liquity/out");
function loadArtifact(name: string): { abi: Abi; bytecode: `0x${string}` } {
  const p = path.join(OUT, `${name}.sol`, `${name}.json`);
  if (!fs.existsSync(p)) throw new Error(`Artifact not found: ${p}`);
  const a = JSON.parse(fs.readFileSync(p, "utf8"));
  return { abi: a.abi, bytecode: (a.bytecode?.object ?? a.bytecode) as `0x${string}` };
}

async function deploy(name: string, args: any[] = []): Promise<{ address: Address; abi: Abi }> {
  const { abi, bytecode } = loadArtifact(name);
  const hash = await wallet.deployContract({ abi, bytecode, args, gas: 8_000_000n });
  const rx = await pub.waitForTransactionReceipt({ hash });
  if (rx.status !== "success") throw new Error(`Deploy ${name} reverted: ${hash}`);
  console.log(`  ${name}: ${rx.contractAddress}`);
  return { address: rx.contractAddress!, abi };
}

async function send(addr: Address, abi: Abi, fn: string, args: any[] = []) {
  const hash = await wallet.writeContract({ address: addr, abi, functionName: fn, args, gas: 5_000_000n });
  const rx = await pub.waitForTransactionReceipt({ hash });
  if (rx.status !== "success") throw new Error(`TX ${fn} on ${addr} reverted`);
  return hash;
}

const ZERO = "0x0000000000000000000000000000000000000000" as Address;
const _1pct = parseEther("0.01");

function predictAddr(from: Address, nonce: number): Address {
  return getContractAddress({ from, nonce: BigInt(nonce) });
}

// setAddresses ABI (tuple with 18 fields)
const setAddrAbi = [{
  type: "function", name: "setAddresses",
  inputs: [{ name: "_vars", type: "tuple", components: [
    { name: "collToken", type: "address" },
    { name: "borrowerOperations", type: "address" },
    { name: "troveManager", type: "address" },
    { name: "troveNFT", type: "address" },
    { name: "metadataNFT", type: "address" },
    { name: "stabilityPool", type: "address" },
    { name: "priceFeed", type: "address" },
    { name: "activePool", type: "address" },
    { name: "defaultPool", type: "address" },
    { name: "gasPoolAddress", type: "address" },
    { name: "collSurplusPool", type: "address" },
    { name: "sortedTroves", type: "address" },
    { name: "interestRouter", type: "address" },
    { name: "hintHelpers", type: "address" },
    { name: "multiTroveGetter", type: "address" },
    { name: "collateralRegistry", type: "address" },
    { name: "sbUSDToken", type: "address" },
    { name: "WETH", type: "address" },
  ]}],
  outputs: [], stateMutability: "nonpayable",
}] as const;

async function main() {
  const bal = await pub.getBalance({ address: account.address });
  console.log(`Deployer: ${account.address}`);
  console.log(`Balance: ${formatEther(bal)} CTC\n`);

  // ══════════════════════════════════════════════════════════════
  // Phase 1-3: Independent contracts (tokens, oracles, sbUSD, IR)
  // ══════════════════════════════════════════════════════════════
  console.log("=== Phase 1: Tokens ===");
  const wCTC = await deploy("MockWCTC");
  const lstCTC = await deploy("MockLstCTC");
  const usdc = await deploy("MockUSDC");

  console.log("\n=== Phase 2: Oracles ===");
  const pfWCTC = await deploy("CreditcoinPriceFeed", [parseEther("5")]);
  const pfLstCTC = await deploy("CreditcoinPriceFeed", [parseEther("5.2")]);
  const oracleWCTC = await deploy("MockOracle", [parseEther("5")]);
  const oracleLstCTC = await deploy("MockOracle", [parseEther("5.2")]);
  const oracleSbUSD = await deploy("MockOracle", [parseEther("1")]);

  console.log("\n=== Phase 3: SbUSD + InterestRouter ===");
  const sbUSD = await deploy("SbUSDToken", [account.address]);
  const ir = await deploy("MockInterestRouter");

  // ══════════════════════════════════════════════════════════════
  // Phase 4: AddressesRegistries
  // ══════════════════════════════════════════════════════════════
  console.log("\n=== Phase 4: AddressesRegistries ===");
  const ar0 = await deploy("AddressesRegistry", [
    account.address, 150n * _1pct, 110n * _1pct, 10n * _1pct, 110n * _1pct, 5n * _1pct, 10n * _1pct,
  ]);
  const ar1 = await deploy("AddressesRegistry", [
    account.address, 160n * _1pct, 120n * _1pct, 10n * _1pct, 120n * _1pct, 5n * _1pct, 20n * _1pct,
  ]);

  // ══════════════════════════════════════════════════════════════
  // Phase 5: Pre-compute all addresses via nonce prediction
  // ══════════════════════════════════════════════════════════════
  console.log("\n=== Phase 5: Pre-compute addresses ===");
  let nonce = await pub.getTransactionCount({ address: account.address });
  console.log(`  Current nonce: ${nonce}`);

  // Plan: nonce layout
  // N+0: setAddresses AR0 (tx, not deploy)
  // N+1: setAddresses AR1 (tx, not deploy)
  // Branch 0 deploys (N+2 .. N+10): TM, BO, SP, AP, DP, GP, CSP, ST, NFT
  // Branch 1 deploys (N+11 .. N+19): TM, BO, SP, AP, DP, GP, CSP, ST, NFT
  // Shared (N+20 .. N+24): CR, HH, MTG, RH, DIFH, AV
  const n = nonce;

  // Branch 0 addresses (nonces N+2 to N+10)
  const b0 = {
    tm: predictAddr(account.address, n + 2),
    bo: predictAddr(account.address, n + 3),
    sp: predictAddr(account.address, n + 4),
    ap: predictAddr(account.address, n + 5),
    dp: predictAddr(account.address, n + 6),
    gp: predictAddr(account.address, n + 7),
    csp: predictAddr(account.address, n + 8),
    st: predictAddr(account.address, n + 9),
    nft: predictAddr(account.address, n + 10),
  };

  // Branch 1 addresses (nonces N+11 to N+19)
  const b1 = {
    tm: predictAddr(account.address, n + 11),
    bo: predictAddr(account.address, n + 12),
    sp: predictAddr(account.address, n + 13),
    ap: predictAddr(account.address, n + 14),
    dp: predictAddr(account.address, n + 15),
    gp: predictAddr(account.address, n + 16),
    csp: predictAddr(account.address, n + 17),
    st: predictAddr(account.address, n + 18),
    nft: predictAddr(account.address, n + 19),
  };

  // Shared addresses (nonces N+20 to N+25)
  const shared = {
    cr: predictAddr(account.address, n + 20),
    hh: predictAddr(account.address, n + 21),
    mtg: predictAddr(account.address, n + 22),
    rh: predictAddr(account.address, n + 23),
    difh: predictAddr(account.address, n + 24),
    av: predictAddr(account.address, n + 25),
  };

  console.log("  Branch 0 TM:", b0.tm);
  console.log("  Branch 0 BO:", b0.bo);
  console.log("  Shared CR:", shared.cr);

  // ══════════════════════════════════════════════════════════════
  // Phase 6: Call setAddresses on both ARs (BEFORE deploying core)
  // ══════════════════════════════════════════════════════════════
  console.log("\n=== Phase 6: setAddresses (pre-deploy) ===");

  // AR0 — nonce N+0
  const h0 = await wallet.writeContract({
    address: ar0.address, abi: setAddrAbi, functionName: "setAddresses",
    args: [{
      collToken: wCTC.address, borrowerOperations: b0.bo,
      troveManager: b0.tm, troveNFT: b0.nft, metadataNFT: ZERO,
      stabilityPool: b0.sp, priceFeed: pfWCTC.address,
      activePool: b0.ap, defaultPool: b0.dp, gasPoolAddress: b0.gp,
      collSurplusPool: b0.csp, sortedTroves: b0.st,
      interestRouter: ir.address, hintHelpers: shared.hh,
      multiTroveGetter: shared.mtg, collateralRegistry: shared.cr,
      sbUSDToken: sbUSD.address, WETH: wCTC.address,
    }],
    gas: 5_000_000n,
  });
  await pub.waitForTransactionReceipt({ hash: h0 });
  console.log("  AR0 (wCTC) setAddresses ✓");

  // AR1 — nonce N+1
  const h1 = await wallet.writeContract({
    address: ar1.address, abi: setAddrAbi, functionName: "setAddresses",
    args: [{
      collToken: lstCTC.address, borrowerOperations: b1.bo,
      troveManager: b1.tm, troveNFT: b1.nft, metadataNFT: ZERO,
      stabilityPool: b1.sp, priceFeed: pfLstCTC.address,
      activePool: b1.ap, defaultPool: b1.dp, gasPoolAddress: b1.gp,
      collSurplusPool: b1.csp, sortedTroves: b1.st,
      interestRouter: ir.address, hintHelpers: shared.hh,
      multiTroveGetter: shared.mtg, collateralRegistry: shared.cr,
      sbUSDToken: sbUSD.address, WETH: wCTC.address,
    }],
    gas: 5_000_000n,
  });
  await pub.waitForTransactionReceipt({ hash: h1 });
  console.log("  AR1 (lstCTC) setAddresses ✓");

  // ══════════════════════════════════════════════════════════════
  // Phase 7: Deploy core contracts (MUST match predicted addresses)
  // ══════════════════════════════════════════════════════════════
  console.log("\n=== Phase 7a: Deploy wCTC Branch ===");
  const tm0 = await deploy("TroveManager", [ar0.address]);       // N+2
  const bo0 = await deploy("BorrowerOperations", [ar0.address]); // N+3
  const sp0 = await deploy("StabilityPool", [ar0.address]);      // N+4
  const ap0 = await deploy("ActivePool", [ar0.address]);         // N+5
  const dp0 = await deploy("DefaultPool", [ar0.address]);        // N+6
  const gp0 = await deploy("GasPool", [ar0.address]);            // N+7
  const csp0 = await deploy("CollSurplusPool", [ar0.address]);   // N+8
  const st0 = await deploy("SortedTroves", [ar0.address]);       // N+9
  const nft0 = await deploy("TroveNFT", [ar0.address]);          // N+10

  // Verify addresses match predictions
  if (tm0.address.toLowerCase() !== b0.tm.toLowerCase()) {
    throw new Error(`Nonce mismatch! TM0 predicted=${b0.tm} actual=${tm0.address}`);
  }
  console.log("  Address predictions verified ✓");

  console.log("\n=== Phase 7b: Deploy lstCTC Branch ===");
  const tm1 = await deploy("TroveManager", [ar1.address]);       // N+11
  const bo1 = await deploy("BorrowerOperations", [ar1.address]); // N+12
  const sp1 = await deploy("StabilityPool", [ar1.address]);      // N+13
  const ap1 = await deploy("ActivePool", [ar1.address]);         // N+14
  const dp1 = await deploy("DefaultPool", [ar1.address]);        // N+15
  const gp1 = await deploy("GasPool", [ar1.address]);            // N+16
  const csp1 = await deploy("CollSurplusPool", [ar1.address]);   // N+17
  const st1 = await deploy("SortedTroves", [ar1.address]);       // N+18
  const nft1 = await deploy("TroveNFT", [ar1.address]);          // N+19

  console.log("\n=== Phase 7c: Deploy Shared ===");
  const cr = await deploy("CollateralRegistry", [               // N+20
    sbUSD.address, [wCTC.address, lstCTC.address], [tm0.address, tm1.address],
  ]);
  const hh = await deploy("HintHelpers", [cr.address]);          // N+21
  const mtg = await deploy("MultiTroveGetter", [cr.address]);    // N+22
  const rh = await deploy("RedemptionHelper", [cr.address, [ar0.address, ar1.address]]); // N+23
  const difh = await deploy("DebtInFrontHelper", [cr.address, hh.address]);              // N+24
  const av = await deploy("AgentVault");                          // N+25

  if (cr.address.toLowerCase() !== shared.cr.toLowerCase()) {
    throw new Error(`Nonce mismatch! CR predicted=${shared.cr} actual=${cr.address}`);
  }
  console.log("  Shared address predictions verified ✓");

  // ══════════════════════════════════════════════════════════════
  // Phase 8: Wire sbUSD
  // ══════════════════════════════════════════════════════════════
  console.log("\n=== Phase 8: Wire sbUSD ===");
  await send(sbUSD.address, sbUSD.abi, "setBranchAddresses", [tm0.address, sp0.address, bo0.address, ap0.address]);
  console.log("  sbUSD → Branch 0 (wCTC) ✓");
  await send(sbUSD.address, sbUSD.abi, "setBranchAddresses", [tm1.address, sp1.address, bo1.address, ap1.address]);
  console.log("  sbUSD → Branch 1 (lstCTC) ✓");
  await send(sbUSD.address, sbUSD.abi, "setCollateralRegistry", [cr.address]);
  console.log("  sbUSD → CollateralRegistry ✓");

  // ══════════════════════════════════════════════════════════════
  // Phase 9: Token Distribution
  // ══════════════════════════════════════════════════════════════
  console.log("\n=== Phase 9: Token Distribution ===");
  const AMOUNT = parseEther("1000000");
  const faucetAbi = [{ type: "function", name: "faucet", inputs: [{ name: "amount", type: "uint256" }], outputs: [], stateMutability: "nonpayable" }] as const;
  const transferAbi = [{ type: "function", name: "transfer", inputs: [{ name: "to", type: "address" }, { name: "amount", type: "uint256" }], outputs: [{ type: "bool" }], stateMutability: "nonpayable" }] as const;
  const mintAbi = [{ type: "function", name: "mint", inputs: [{ name: "to", type: "address" }, { name: "amount", type: "uint256" }], outputs: [], stateMutability: "nonpayable" }] as const;

  // Mint 9M wCTC + lstCTC (faucet 100k × 90 each)
  console.log("  Minting wCTC (90 faucet calls)...");
  for (let i = 0; i < 90; i++) await send(wCTC.address, faucetAbi as any, "faucet", [parseEther("100000")]);
  console.log("  Minting lstCTC (90 faucet calls)...");
  for (let i = 0; i < 90; i++) await send(lstCTC.address, faucetAbi as any, "faucet", [parseEther("100000")]);
  // Mint 9M USDC
  console.log("  Minting USDC...");
  await send(usdc.address, mintAbi as any, "mint", [account.address, AMOUNT * 9n]);

  // Distribute to 8 simulation accounts
  for (const acc of accts.accounts) {
    await send(wCTC.address, transferAbi as any, "transfer", [acc.address as Address, AMOUNT]);
    await send(lstCTC.address, transferAbi as any, "transfer", [acc.address as Address, AMOUNT]);
    await send(usdc.address, transferAbi as any, "transfer", [acc.address as Address, AMOUNT]);
    console.log(`  → ${acc.label}: 1M wCTC + 1M lstCTC + 1M USDC ✓`);
  }

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
    { name: "wCTC/sbUSD", loan: sbUSD.address, coll: wCTC.address, oracle: oracleWCTC.address, lltv: 770000000000000000n },
    { name: "lstCTC/sbUSD", loan: sbUSD.address, coll: lstCTC.address, oracle: oracleLstCTC.address, lltv: 770000000000000000n },
    { name: "sbUSD/USDC", loan: usdc.address, coll: sbUSD.address, oracle: oracleSbUSD.address, lltv: 900000000000000000n },
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
      console.log(`  ${m.name}: ${id.slice(0, 18)}... ✓`);
    } catch (e: any) {
      console.log(`  ${m.name}: FAILED — ${e.shortMessage?.slice(0, 80)}`);
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
    { name: "wCTC/USDC", a: wCTC.address, b: usdc.address, fee: 3000, price: 5.0 },
    { name: "lstCTC/USDC", a: lstCTC.address, b: usdc.address, fee: 3000, price: 5.2 },
    { name: "wCTC/sbUSD", a: wCTC.address, b: sbUSD.address, fee: 3000, price: 5.0 },
    { name: "sbUSD/USDC", a: sbUSD.address, b: usdc.address, fee: 500, price: 1.0 },
    { name: "lstCTC/wCTC", a: lstCTC.address, b: wCTC.address, fee: 3000, price: 1.04 },
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
      console.log(`  ${p.name}: ${poolAddr} ✓`);
    } catch (e: any) {
      console.log(`  ${p.name}: FAILED — ${e.shortMessage?.slice(0, 100)}`);
    }
  }

  // ══════════════════════════════════════════════════════════════
  // Phase 12: Save
  // ══════════════════════════════════════════════════════════════
  console.log("\n=== Phase 12: Save ===");
  const result = {
    network: { chainId: 102031, rpc: "https://rpc.cc3-testnet.creditcoin.network" },
    deployer: account.address,
    tokens: { wCTC: wCTC.address, lstCTC: lstCTC.address, sbUSD: sbUSD.address, USDC: usdc.address },
    liquity: {
      branches: {
        wCTC: {
          addressesRegistry: ar0.address, borrowerOperations: bo0.address, troveManager: tm0.address,
          stabilityPool: sp0.address, activePool: ap0.address, defaultPool: dp0.address,
          gasPool: gp0.address, collSurplusPool: csp0.address, sortedTroves: st0.address,
          troveNFT: nft0.address, priceFeed: pfWCTC.address,
        },
        lstCTC: {
          addressesRegistry: ar1.address, borrowerOperations: bo1.address, troveManager: tm1.address,
          stabilityPool: sp1.address, activePool: ap1.address, defaultPool: dp1.address,
          gasPool: gp1.address, collSurplusPool: csp1.address, sortedTroves: st1.address,
          troveNFT: nft1.address, priceFeed: pfLstCTC.address,
        },
      },
      shared: {
        collateralRegistry: cr.address, hintHelpers: hh.address, multiTroveGetter: mtg.address,
        redemptionHelper: rh.address, debtInFrontHelper: difh.address, agentVault: av.address,
      },
    },
    morpho: {
      snowballLend: EXISTING.snowballLend, adaptiveCurveIRM: EXISTING.adaptiveCurveIRM,
      oracles: { wCTC: oracleWCTC.address, lstCTC: oracleLstCTC.address, sbUSD: oracleSbUSD.address },
      markets: mktConfigs.map((m, i) => ({
        id: marketIds[i], name: m.name, loanToken: m.loan, collateralToken: m.coll,
        loanSymbol: m.name.split("/")[1]?.trim(), collSymbol: m.name.split("/")[0]?.trim(),
        lltv: m.lltv.toString(),
      })),
    },
    dex: { ...EXISTING, pools: poolAddrs },
  };

  const outPath = path.join(__dirname, "../../deployments/creditcoin-testnet/full-redeploy.json");
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(result, null, 2));

  console.log(`\n✅ Deployment complete! → ${outPath}`);
  console.log(`  wCTC: ${wCTC.address}`);
  console.log(`  lstCTC: ${lstCTC.address}`);
  console.log(`  sbUSD: ${sbUSD.address}`);
  console.log(`  USDC: ${usdc.address}`);
}

main().then(() => process.exit(0)).catch(e => { console.error("\n❌", e.message || e); process.exit(1); });
