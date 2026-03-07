/**
 * Swap Volume Simulation: wCTC <-> USDC 왕복 스왑으로 볼륨 생성
 *
 * DEX 계정(#2 Active Trader, #3 Arbitrageur)이 각각 5회씩
 * wCTC→USDC, USDC→wCTC 번갈아 스왑.
 * 5% rule: 보유량의 5% 이내로 스왑.
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
  USDC: "0x60e204104cfe1a93f630ea5ebc0a895cc80ebed9" as Address,
};

const SWAP_ROUTER = "0xec48ed2e9c81b77ab6f8e79c257f9d0c21074154" as Address;
const POOL = "0xb6Db55F3d318B6b0C37777A818C2c195181B94C9" as Address;

// ─── ABIs ───
const ERC20ABI = [
  { type: "function", name: "approve", inputs: [{ name: "spender", type: "address" }, { name: "amount", type: "uint256" }], outputs: [{ type: "bool" }], stateMutability: "nonpayable" },
  { type: "function", name: "balanceOf", inputs: [{ name: "account", type: "address" }], outputs: [{ type: "uint256" }], stateMutability: "view" },
  { type: "function", name: "faucet", inputs: [{ name: "amount", type: "uint256" }], outputs: [], stateMutability: "nonpayable" },
  { type: "function", name: "mint", inputs: [{ name: "to", type: "address" }, { name: "amount", type: "uint256" }], outputs: [], stateMutability: "nonpayable" },
] as const;

const SwapRouterABI = [
  { type: "function", name: "exactInputSingle", inputs: [{ name: "params", type: "tuple", components: [{ name: "tokenIn", type: "address" }, { name: "tokenOut", type: "address" }, { name: "fee", type: "uint24" }, { name: "recipient", type: "address" }, { name: "deadline", type: "uint256" }, { name: "amountIn", type: "uint256" }, { name: "amountOutMinimum", type: "uint256" }, { name: "sqrtPriceLimitX96", type: "uint160" }] }], outputs: [{ name: "amountOut", type: "uint256" }], stateMutability: "payable" },
] as const;

const PoolABI = [
  { type: "function", name: "slot0", inputs: [], outputs: [{ name: "", type: "uint160" }, { name: "", type: "int24" }, { name: "", type: "uint16" }, { name: "", type: "uint16" }, { name: "", type: "uint16" }, { name: "", type: "uint8" }, { name: "", type: "bool" }], stateMutability: "view" },
  { type: "function", name: "liquidity", inputs: [], outputs: [{ type: "uint128" }], stateMutability: "view" },
] as const;

// ─── Helpers ───
async function waitTx(hash: `0x${string}`, label: string) {
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  if (receipt.status === "reverted") throw new Error(`TX REVERTED: ${label}`);
  console.log(`    [OK] ${label} (gas: ${receipt.gasUsed})`);
  return receipt;
}

async function getBalance(token: Address, addr: Address): Promise<bigint> {
  return publicClient.readContract({ address: token, abi: ERC20ABI, functionName: "balanceOf", args: [addr] });
}

// ─── Swap Function ───
async function doSwap(
  wallet: any,
  addr: Address,
  tokenIn: Address,
  tokenOut: Address,
  amountIn: bigint,
  label: string,
): Promise<boolean> {
  try {
    // approve
    const approveTx = await wallet.writeContract({
      address: tokenIn, abi: ERC20ABI,
      functionName: "approve", args: [SWAP_ROUTER, amountIn],
    });
    await waitTx(approveTx, `${label} approve`);

    // swap
    const swapTx = await wallet.writeContract({
      address: SWAP_ROUTER,
      abi: SwapRouterABI,
      functionName: "exactInputSingle",
      args: [{
        tokenIn,
        tokenOut,
        fee: 3000,
        recipient: addr,
        deadline: BigInt(Math.floor(Date.now() / 1000) + 600),
        amountIn,
        amountOutMinimum: 0n,
        sqrtPriceLimitX96: 0n,
      }],
    });
    await waitTx(swapTx, `${label} swap`);
    return true;
  } catch (err: any) {
    console.log(`    [FAIL] ${label}: ${err.shortMessage || err.cause?.reason || err.message}`);
    return false;
  }
}

// ─── Main ───
async function main() {
  console.log("=== wCTC/USDC Swap Volume Simulation ===\n");

  // Pool 상태
  const [slot0, liq] = await Promise.all([
    publicClient.readContract({ address: POOL, abi: PoolABI, functionName: "slot0" }),
    publicClient.readContract({ address: POOL, abi: PoolABI, functionName: "liquidity" }),
  ]);
  console.log(`Pool state: tick=${slot0[1]}, liquidity=${liq}\n`);

  // DEX 계정들: #2 Active Trader, #3 Arbitrageur
  const dexAccounts = [accounts.accounts[1], accounts.accounts[2]];

  for (const persona of dexAccounts) {
    const account = privateKeyToAccount(persona.privateKey as `0x${string}`);
    const wallet = createWalletClient({ account, chain: cc3Testnet, transport });
    const addr = wallet.account.address;

    console.log(`\n--- #${persona.index} ${persona.label} (${addr}) ---`);

    // Check balances
    let wctcBal = await getBalance(TOKENS.wCTC, addr);
    let usdcBal = await getBalance(TOKENS.USDC, addr);
    console.log(`  wCTC: ${formatEther(wctcBal)}, USDC: ${formatEther(usdcBal)}`);

    // 잔고 부족하면 faucet/mint
    const MIN_BALANCE = parseEther("100");
    if (wctcBal < MIN_BALANCE) {
      console.log("  [FUND] wCTC faucet 호출...");
      const tx = await wallet.writeContract({
        address: TOKENS.wCTC, abi: ERC20ABI,
        functionName: "faucet", args: [parseEther("10000")],
      });
      await waitTx(tx, "wCTC faucet");
      wctcBal = await getBalance(TOKENS.wCTC, addr);
    }
    if (usdcBal < MIN_BALANCE) {
      console.log("  [FUND] USDC mint 호출...");
      const tx = await wallet.writeContract({
        address: TOKENS.USDC, abi: ERC20ABI,
        functionName: "mint", args: [addr, parseEther("10000")],
      });
      await waitTx(tx, "USDC mint");
      usdcBal = await getBalance(TOKENS.USDC, addr);
    }

    console.log(`  After funding — wCTC: ${formatEther(wctcBal)}, USDC: ${formatEther(usdcBal)}`);

    // 5회 스왑 — 실패 시 방향 전환하여 재시도
    const SWAPS_PER_ACCOUNT = 5;
    let successCount = 0;
    let preferWctcToUsdc = false; // 첫 스왑은 USDC→wCTC (pool이 max tick에 있으므로)

    for (let i = 0; i < SWAPS_PER_ACCOUNT; i++) {
      let isWctcToUsdc = preferWctcToUsdc;
      preferWctcToUsdc = !preferWctcToUsdc; // 다음 라운드는 반대

      // 현재 잔고 확인
      const wBal = await getBalance(TOKENS.wCTC, addr);
      const uBal = await getBalance(TOKENS.USDC, addr);

      // 0.5~1.5% 랜덤
      const pct = 0.5 + Math.random() * 1.0;
      const currentBal = isWctcToUsdc ? wBal : uBal;
      let amountIn = (currentBal * BigInt(Math.round(pct * 100))) / 10000n;

      if (amountIn === 0n) {
        console.log(`  [SKIP] Swap ${i + 1}: insufficient balance`);
        continue;
      }

      let tokenIn = isWctcToUsdc ? TOKENS.wCTC : TOKENS.USDC;
      let tokenOut = isWctcToUsdc ? TOKENS.USDC : TOKENS.wCTC;
      let direction = isWctcToUsdc ? "wCTC→USDC" : "USDC→wCTC";

      console.log(`\n  Swap ${i + 1}/${SWAPS_PER_ACCOUNT}: ${direction} ${formatEther(amountIn)} (${pct.toFixed(1)}%)`);
      let ok = await doSwap(wallet, addr, tokenIn, tokenOut, amountIn, `#${persona.index} swap${i + 1}`);

      // 실패 시 반대 방향으로 재시도
      if (!ok) {
        isWctcToUsdc = !isWctcToUsdc;
        const altBal = isWctcToUsdc ? wBal : uBal;
        amountIn = (altBal * BigInt(Math.round(pct * 100))) / 10000n;
        tokenIn = isWctcToUsdc ? TOKENS.wCTC : TOKENS.USDC;
        tokenOut = isWctcToUsdc ? TOKENS.USDC : TOKENS.wCTC;
        direction = isWctcToUsdc ? "wCTC→USDC" : "USDC→wCTC";
        console.log(`    [RETRY] ${direction} ${formatEther(amountIn)}`);
        ok = await doSwap(wallet, addr, tokenIn, tokenOut, amountIn, `#${persona.index} swap${i + 1}r`);
      }

      if (ok) successCount++;
    }
    console.log(`\n  Success: ${successCount}/${SWAPS_PER_ACCOUNT}`);

    // Final balance
    const finalW = await getBalance(TOKENS.wCTC, addr);
    const finalU = await getBalance(TOKENS.USDC, addr);
    console.log(`\n  Final — wCTC: ${formatEther(finalW)}, USDC: ${formatEther(finalU)}`);
  }

  // Final pool state
  const [finalSlot0, finalLiq] = await Promise.all([
    publicClient.readContract({ address: POOL, abi: PoolABI, functionName: "slot0" }),
    publicClient.readContract({ address: POOL, abi: PoolABI, functionName: "liquidity" }),
  ]);
  console.log(`\n=== Final Pool: tick=${finalSlot0[1]}, liquidity=${finalLiq} ===`);
  console.log("Done!");
}

main().catch((err) => {
  console.error("FATAL:", err);
  process.exit(1);
});
