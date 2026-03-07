/**
 * sbUSD Pool Simulation
 *
 * 1. Accounts #1, #8 open wCTC Troves → borrow sbUSD
 * 2. Provide LP to wCTC/sbUSD + sbUSD/USDC pools
 * 3. Swap on both pools (5 swaps per account)
 */

import {
  createPublicClient, createWalletClient, http, parseEther, formatEther,
  defineChain, maxUint256, type Address,
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
  sbUSD: "0x8aefed3e2e9a886bdd72ec9cebe27d7aabced2a5" as Address,
  USDC: "0x60e204104cfe1a93f630ea5ebc0a895cc80ebed9" as Address,
};

const LIQUITY_WCTC_BORROW_OPS = "0xb637f375cbbd278ace5fdba53ad868ae7cb186ea" as Address;

const SWAP_ROUTER = "0xec48ed2e9c81b77ab6f8e79c257f9d0c21074154" as Address;
const NPM = "0xa28bfaa2e84098de8d654f690e51c265e4ae01c9" as Address;

const POOLS = {
  "wCTC/sbUSD": { address: "0x23e6152CC07d4DEBA597c9e975986E2B307E8874" as Address, fee: 3000 },
  "sbUSD/USDC": { address: "0xe70647BF2baB8282B65f674b0DF8B7f0bb658859" as Address, fee: 500 },
};

// ─── ABIs ───
const ERC20ABI = [
  { type: "function", name: "approve", inputs: [{ name: "spender", type: "address" }, { name: "amount", type: "uint256" }], outputs: [{ type: "bool" }], stateMutability: "nonpayable" },
  { type: "function", name: "balanceOf", inputs: [{ name: "account", type: "address" }], outputs: [{ type: "uint256" }], stateMutability: "view" },
  { type: "function", name: "faucet", inputs: [{ name: "amount", type: "uint256" }], outputs: [], stateMutability: "nonpayable" },
  { type: "function", name: "mint", inputs: [{ name: "to", type: "address" }, { name: "amount", type: "uint256" }], outputs: [], stateMutability: "nonpayable" },
] as const;

const BorrowerOpsABI = [
  { type: "function", name: "openTrove", inputs: [{ name: "owner", type: "address" }, { name: "ownerIndex", type: "uint256" }, { name: "collAmount", type: "uint256" }, { name: "boldAmount", type: "uint256" }, { name: "upperHint", type: "uint256" }, { name: "lowerHint", type: "uint256" }, { name: "annualInterestRate", type: "uint256" }, { name: "maxUpfrontFee", type: "uint256" }, { name: "addManager", type: "address" }, { name: "removeManager", type: "address" }, { name: "receiver", type: "address" }], outputs: [{ name: "troveId", type: "uint256" }], stateMutability: "nonpayable" },
] as const;

const SwapRouterABI = [
  { type: "function", name: "exactInputSingle", inputs: [{ name: "params", type: "tuple", components: [{ name: "tokenIn", type: "address" }, { name: "tokenOut", type: "address" }, { name: "fee", type: "uint24" }, { name: "recipient", type: "address" }, { name: "deadline", type: "uint256" }, { name: "amountIn", type: "uint256" }, { name: "amountOutMinimum", type: "uint256" }, { name: "sqrtPriceLimitX96", type: "uint160" }] }], outputs: [{ name: "amountOut", type: "uint256" }], stateMutability: "payable" },
] as const;

const PoolABI = [
  { type: "function", name: "slot0", inputs: [], outputs: [{ name: "", type: "uint160" }, { name: "", type: "int24" }, { name: "", type: "uint16" }, { name: "", type: "uint16" }, { name: "", type: "uint16" }, { name: "", type: "uint8" }, { name: "", type: "bool" }], stateMutability: "view" },
  { type: "function", name: "liquidity", inputs: [], outputs: [{ type: "uint128" }], stateMutability: "view" },
  { type: "function", name: "token0", inputs: [], outputs: [{ type: "address" }], stateMutability: "view" },
  { type: "function", name: "token1", inputs: [], outputs: [{ type: "address" }], stateMutability: "view" },
] as const;

const NpmABI = [
  { type: "function", name: "mint", inputs: [{ name: "params", type: "tuple", components: [{ name: "token0", type: "address" }, { name: "token1", type: "address" }, { name: "fee", type: "uint24" }, { name: "tickLower", type: "int24" }, { name: "tickUpper", type: "int24" }, { name: "amount0Desired", type: "uint256" }, { name: "amount1Desired", type: "uint256" }, { name: "amount0Min", type: "uint256" }, { name: "amount1Min", type: "uint256" }, { name: "recipient", type: "address" }, { name: "deadline", type: "uint256" }] }], outputs: [{ name: "tokenId", type: "uint256" }, { name: "liquidity", type: "uint128" }, { name: "amount0", type: "uint256" }, { name: "amount1", type: "uint256" }], stateMutability: "payable" },
] as const;

// ─── Helpers ───
const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000" as Address;
const ETH_GAS_COMPENSATION = parseEther("0.2");

function makeWallet(pk: string) {
  return createWalletClient({ account: privateKeyToAccount(pk as `0x${string}`), chain: cc3Testnet, transport });
}

async function waitTx(hash: `0x${string}`, label: string) {
  const r = await publicClient.waitForTransactionReceipt({ hash });
  if (r.status === "reverted") throw new Error(`REVERTED: ${label}`);
  console.log(`    [OK] ${label}`);
  return r;
}

async function bal(token: Address, addr: Address) {
  return publicClient.readContract({ address: token, abi: ERC20ABI, functionName: "balanceOf", args: [addr] });
}

// ─── Phase 1: Open Troves ───
async function openTrove(personaIdx: number, collAmount: bigint, boldAmount: bigint, rate: string) {
  const persona = accounts.accounts[personaIdx];
  const wallet = makeWallet(persona.privateKey);
  const addr = wallet.account.address;

  console.log(`\n--- #${persona.index} ${persona.label}: Open wCTC Trove ---`);

  // Check existing sbUSD
  const existingSbUsd = await bal(TOKENS.sbUSD, addr);
  if (existingSbUsd >= boldAmount) {
    console.log(`  Already has ${formatEther(existingSbUsd)} sbUSD, skipping trove`);
    return;
  }

  // Ensure enough wCTC
  let wBal = await bal(TOKENS.wCTC, addr);
  const needed = collAmount + ETH_GAS_COMPENSATION;
  if (wBal < needed) {
    console.log(`  Faucet: need ${formatEther(needed)}, have ${formatEther(wBal)}`);
    await waitTx(await wallet.writeContract({ address: TOKENS.wCTC, abi: ERC20ABI, functionName: "faucet", args: [parseEther("10000")] }), "wCTC faucet");
    wBal = await bal(TOKENS.wCTC, addr);
  }

  // Approve wCTC (coll + gas comp)
  await waitTx(
    await wallet.writeContract({ address: TOKENS.wCTC, abi: ERC20ABI, functionName: "approve", args: [LIQUITY_WCTC_BORROW_OPS, needed] }),
    "approve wCTC"
  );

  // Open Trove
  console.log(`  Opening: ${formatEther(collAmount)} wCTC coll, ${formatEther(boldAmount)} sbUSD, ${rate} rate`);
  await waitTx(
    await wallet.writeContract({
      address: LIQUITY_WCTC_BORROW_OPS, abi: BorrowerOpsABI, functionName: "openTrove",
      args: [addr, 0n, collAmount, boldAmount, 0n, 0n, parseEther(rate), maxUint256, ZERO_ADDRESS, ZERO_ADDRESS, ZERO_ADDRESS],
    }),
    "openTrove"
  );

  const sbBal = await bal(TOKENS.sbUSD, addr);
  console.log(`  sbUSD balance: ${formatEther(sbBal)}`);
}

// ─── Phase 2: Add LP ───
async function addLiquidity(
  personaIdx: number,
  poolName: keyof typeof POOLS,
  amount0: bigint,
  amount1: bigint,
) {
  const persona = accounts.accounts[personaIdx];
  const wallet = makeWallet(persona.privateKey);
  const addr = wallet.account.address;
  const pool = POOLS[poolName];

  console.log(`\n--- #${persona.index} ${persona.label}: Add LP to ${poolName} ---`);

  // Get pool info
  const [token0, token1, slot0] = await Promise.all([
    publicClient.readContract({ address: pool.address, abi: PoolABI, functionName: "token0" }),
    publicClient.readContract({ address: pool.address, abi: PoolABI, functionName: "token1" }),
    publicClient.readContract({ address: pool.address, abi: PoolABI, functionName: "slot0" }),
  ]);
  const currentTick = Number(slot0[1]);
  const tickSpacing = pool.fee === 500 ? 10 : 60;
  console.log(`  Pool: token0=${token0.slice(0,10)}... token1=${token1.slice(0,10)}... tick=${currentTick}`);

  // Wide range around current tick
  const tickLower = Math.floor((currentTick - 60000) / tickSpacing) * tickSpacing;
  const tickUpper = Math.ceil((currentTick + 60000) / tickSpacing) * tickSpacing;

  // Approve both tokens to NPM
  await waitTx(await wallet.writeContract({ address: token0, abi: ERC20ABI, functionName: "approve", args: [NPM, amount0] }), "approve token0");
  await waitTx(await wallet.writeContract({ address: token1, abi: ERC20ABI, functionName: "approve", args: [NPM, amount1] }), "approve token1");

  // Mint LP
  console.log(`  Minting LP: [${tickLower}, ${tickUpper}]`);
  try {
    await waitTx(
      await wallet.writeContract({
        address: NPM, abi: NpmABI, functionName: "mint",
        args: [{ token0, token1, fee: pool.fee, tickLower, tickUpper, amount0Desired: amount0, amount1Desired: amount1, amount0Min: 0n, amount1Min: 0n, recipient: addr, deadline: BigInt(Math.floor(Date.now() / 1000) + 600) }],
      }),
      `mint LP ${poolName}`
    );
  } catch (e: any) {
    console.log(`    [FAIL] ${e.shortMessage || e.cause?.reason || e.message}`);
  }
}

// ─── Phase 3: Swap ───
async function doSwap(wallet: any, addr: Address, tokenIn: Address, tokenOut: Address, fee: number, amountIn: bigint, label: string): Promise<boolean> {
  try {
    await waitTx(await wallet.writeContract({ address: tokenIn, abi: ERC20ABI, functionName: "approve", args: [SWAP_ROUTER, amountIn] }), `${label} approve`);
    await waitTx(await wallet.writeContract({
      address: SWAP_ROUTER, abi: SwapRouterABI, functionName: "exactInputSingle",
      args: [{ tokenIn, tokenOut, fee, recipient: addr, deadline: BigInt(Math.floor(Date.now() / 1000) + 600), amountIn, amountOutMinimum: 0n, sqrtPriceLimitX96: 0n }],
    }), `${label} swap`);
    return true;
  } catch (e: any) {
    console.log(`    [FAIL] ${label}: ${e.shortMessage || e.cause?.reason || "unknown"}`);
    return false;
  }
}

async function swapVolume(
  personaIdx: number,
  poolName: keyof typeof POOLS,
  tokenA: Address,
  tokenB: Address,
  numSwaps: number,
) {
  const persona = accounts.accounts[personaIdx];
  const wallet = makeWallet(persona.privateKey);
  const addr = wallet.account.address;
  const fee = POOLS[poolName].fee;

  console.log(`\n--- #${persona.index} ${persona.label}: ${numSwaps} swaps on ${poolName} ---`);

  let success = 0;
  let startWithA = false; // start with tokenB→tokenA to push price into range

  for (let i = 0; i < numSwaps; i++) {
    const useA = (i % 2 === 0) ? startWithA : !startWithA;
    const tIn = useA ? tokenA : tokenB;
    const tOut = useA ? tokenB : tokenA;
    const tInBal = await bal(tIn, addr);

    const pct = 0.5 + Math.random() * 1.0;
    const amountIn = (tInBal * BigInt(Math.round(pct * 100))) / 10000n;
    if (amountIn === 0n) { console.log(`  [SKIP] swap ${i+1}: no balance`); continue; }

    const inSym = tIn === tokenA ? "A" : "B";
    const outSym = tIn === tokenA ? "B" : "A";
    console.log(`  Swap ${i+1}/${numSwaps}: ${inSym}→${outSym} ${formatEther(amountIn)} (${pct.toFixed(1)}%)`);

    let ok = await doSwap(wallet, addr, tIn, tOut, fee, amountIn, `#${persona.index} s${i+1}`);
    if (!ok) {
      // Retry opposite direction
      const altIn = tOut;
      const altOut = tIn;
      const altBal = await bal(altIn, addr);
      const altAmt = (altBal * BigInt(Math.round(pct * 100))) / 10000n;
      if (altAmt > 0n) {
        console.log(`    [RETRY] opposite direction`);
        ok = await doSwap(wallet, addr, altIn, altOut, fee, altAmt, `#${persona.index} s${i+1}r`);
      }
    }
    if (ok) success++;
  }
  console.log(`  Result: ${success}/${numSwaps}`);
}

// ─── Main ───
async function main() {
  console.log("=== sbUSD Pool Simulation ===\n");

  // Phase 1+2: LP already added in previous run. Skip to swaps.

  // Phase 3: Swap volume
  console.log("\n== Phase 3: Generate Swap Volume ==");

  // wCTC/sbUSD: token0=sbUSD, token1=wCTC
  await swapVolume(1, "wCTC/sbUSD", TOKENS.sbUSD, TOKENS.wCTC, 5);
  await swapVolume(2, "wCTC/sbUSD", TOKENS.sbUSD, TOKENS.wCTC, 5);

  // sbUSD/USDC: token0=USDC, token1=sbUSD
  await swapVolume(1, "sbUSD/USDC", TOKENS.USDC, TOKENS.sbUSD, 5);
  await swapVolume(2, "sbUSD/USDC", TOKENS.USDC, TOKENS.sbUSD, 5);

  // Final pool states
  console.log("\n== Final Pool States ==");
  for (const [name, pool] of Object.entries(POOLS)) {
    const [slot0, liq] = await Promise.all([
      publicClient.readContract({ address: pool.address, abi: PoolABI, functionName: "slot0" }),
      publicClient.readContract({ address: pool.address, abi: PoolABI, functionName: "liquidity" }),
    ]);
    console.log(`  ${name}: tick=${slot0[1]}, liquidity=${liq}`);
  }

  console.log("\nDone!");
}

main().catch((err) => { console.error("FATAL:", err); process.exit(1); });
