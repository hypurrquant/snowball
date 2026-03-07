/**
 * lstCTC Pool Simulation — Swap Volume
 *
 * Generate swap volume on lstCTC/wCTC and lstCTC/USDC pools
 * Accounts #2 (Active Trader) and #3 (Arbitrageur), 5 swaps each per pool
 */

import {
  createPublicClient, createWalletClient, http, parseEther, formatEther,
  defineChain, type Address,
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
  USDC: "0x60e204104cfe1a93f630ea5ebc0a895cc80ebed9" as Address,
};

const SWAP_ROUTER = "0xec48ed2e9c81b77ab6f8e79c257f9d0c21074154" as Address;

const POOLS = {
  "lstCTC/wCTC": { address: "0xee0AF4a1Aa3ce7447248f87c384b8bE7de302DA5" as Address, fee: 3000 },
  "lstCTC/USDC": { address: "0x394ECC1c9094F5E3D83a6C9497a33a969e9B136a" as Address, fee: 3000 },
};

// ─── ABIs ───
const ERC20ABI = [
  { type: "function", name: "approve", inputs: [{ name: "spender", type: "address" }, { name: "amount", type: "uint256" }], outputs: [{ type: "bool" }], stateMutability: "nonpayable" },
  { type: "function", name: "balanceOf", inputs: [{ name: "account", type: "address" }], outputs: [{ type: "uint256" }], stateMutability: "view" },
] as const;

const SwapRouterABI = [
  { type: "function", name: "exactInputSingle", inputs: [{ name: "params", type: "tuple", components: [{ name: "tokenIn", type: "address" }, { name: "tokenOut", type: "address" }, { name: "fee", type: "uint24" }, { name: "recipient", type: "address" }, { name: "deadline", type: "uint256" }, { name: "amountIn", type: "uint256" }, { name: "amountOutMinimum", type: "uint256" }, { name: "sqrtPriceLimitX96", type: "uint160" }] }], outputs: [{ name: "amountOut", type: "uint256" }], stateMutability: "payable" },
] as const;

const PoolABI = [
  { type: "function", name: "slot0", inputs: [], outputs: [{ name: "", type: "uint160" }, { name: "", type: "int24" }, { name: "", type: "uint16" }, { name: "", type: "uint16" }, { name: "", type: "uint16" }, { name: "", type: "uint8" }, { name: "", type: "bool" }], stateMutability: "view" },
  { type: "function", name: "liquidity", inputs: [], outputs: [{ type: "uint128" }], stateMutability: "view" },
] as const;

// ─── Helpers ───
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

// ─── Swap ───
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
  symA: string,
  symB: string,
  numSwaps: number,
) {
  const persona = accounts.accounts[personaIdx];
  const wallet = makeWallet(persona.privateKey);
  const addr = wallet.account.address;
  const fee = POOLS[poolName].fee;

  console.log(`\n--- #${persona.index} ${persona.label}: ${numSwaps} swaps on ${poolName} ---`);

  let success = 0;

  for (let i = 0; i < numSwaps; i++) {
    // Alternate direction each swap
    const useA = i % 2 === 0;
    const tIn = useA ? tokenA : tokenB;
    const tOut = useA ? tokenB : tokenA;
    const tInBal = await bal(tIn, addr);

    // 0.5~1.5% of balance (within 5% rule)
    const pct = 0.5 + Math.random() * 1.0;
    const amountIn = (tInBal * BigInt(Math.round(pct * 100))) / 10000n;
    if (amountIn === 0n) { console.log(`  [SKIP] swap ${i+1}: no balance`); continue; }

    const inSym = useA ? symA : symB;
    const outSym = useA ? symB : symA;
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
  console.log("=== lstCTC Pool Swap Volume ===\n");

  // Pool states
  console.log("== Pool States ==");
  for (const [name, pool] of Object.entries(POOLS)) {
    const [slot0, liq] = await Promise.all([
      publicClient.readContract({ address: pool.address, abi: PoolABI, functionName: "slot0" }),
      publicClient.readContract({ address: pool.address, abi: PoolABI, functionName: "liquidity" }),
    ]);
    console.log(`  ${name}: tick=${slot0[1]}, liquidity=${liq}`);
  }

  // lstCTC/wCTC swaps: token0=lstCTC, token1=wCTC
  console.log("\n== lstCTC/wCTC Swaps ==");
  await swapVolume(1, "lstCTC/wCTC", TOKENS.lstCTC, TOKENS.wCTC, "lstCTC", "wCTC", 5);
  await swapVolume(2, "lstCTC/wCTC", TOKENS.lstCTC, TOKENS.wCTC, "lstCTC", "wCTC", 5);

  // lstCTC/USDC swaps: token0=USDC, token1=lstCTC
  console.log("\n== lstCTC/USDC Swaps ==");
  await swapVolume(1, "lstCTC/USDC", TOKENS.USDC, TOKENS.lstCTC, "USDC", "lstCTC", 5);
  await swapVolume(2, "lstCTC/USDC", TOKENS.USDC, TOKENS.lstCTC, "USDC", "lstCTC", 5);

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
