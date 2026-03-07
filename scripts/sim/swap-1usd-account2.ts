import { createPublicClient, createWalletClient, http, parseEther, formatEther, defineChain } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import accounts from "../simulation-accounts.json";

const cc3Testnet = defineChain({
  id: 102031,
  name: "Creditcoin3 Testnet",
  nativeCurrency: { name: "CTC", symbol: "tCTC", decimals: 18 },
  rpcUrls: { default: { http: ["https://rpc.cc3-testnet.creditcoin.network"] } },
});

const transport = http("https://rpc.cc3-testnet.creditcoin.network");
const publicClient = createPublicClient({ chain: cc3Testnet, transport });

const persona = accounts.accounts[1]; // #2 Active Trader
const account = privateKeyToAccount(persona.privateKey as `0x${string}`);
const walletClient = createWalletClient({ account, chain: cc3Testnet, transport });

const USDC = "0x3e31b08651644b9e6535f5bf0c7a9e7e6ad92e02" as const;
const wCTC = "0xdb5c8e9d0827c474342bea03e0e35a60d621afea" as const;
const SWAP_ROUTER = "0xec48ed2e9c81b77ab6f8e79c257f9d0c21074154" as const;
const QUOTER = "0x2383343c2c7ae52984872f541b8b22f8da0b419a" as const;

const QuoterV2ABI = [
  { type: "function", name: "quoteExactInputSingle", inputs: [{ name: "params", type: "tuple", components: [{ name: "tokenIn", type: "address" }, { name: "tokenOut", type: "address" }, { name: "amountIn", type: "uint256" }, { name: "fee", type: "uint24" }, { name: "sqrtPriceLimitX96", type: "uint160" }] }], outputs: [{ name: "amountOut", type: "uint256" }, { name: "sqrtPriceX96After", type: "uint160" }, { name: "initializedTicksCrossed", type: "uint32" }, { name: "gasEstimate", type: "uint256" }], stateMutability: "nonpayable" },
] as const;

const SwapRouterABI = [
  { type: "function", name: "exactInputSingle", inputs: [{ name: "params", type: "tuple", components: [{ name: "tokenIn", type: "address" }, { name: "tokenOut", type: "address" }, { name: "fee", type: "uint24" }, { name: "recipient", type: "address" }, { name: "deadline", type: "uint256" }, { name: "amountIn", type: "uint256" }, { name: "amountOutMinimum", type: "uint256" }, { name: "sqrtPriceLimitX96", type: "uint160" }] }], outputs: [{ name: "amountOut", type: "uint256" }], stateMutability: "payable" },
] as const;

const ERC20ABI = [
  { type: "function", name: "approve", inputs: [{ name: "spender", type: "address" }, { name: "amount", type: "uint256" }], outputs: [{ type: "bool" }], stateMutability: "nonpayable" },
  { type: "function", name: "balanceOf", inputs: [{ name: "account", type: "address" }], outputs: [{ type: "uint256" }], stateMutability: "view" },
] as const;

async function main() {
  const amountIn = parseEther("1"); // 1 USDC
  console.log(`=== Swap 1 USDC → wCTC (Account #2: Active Trader) ===\n`);

  // 1. Quote
  console.log("1. Quoting...");
  const quote = await publicClient.simulateContract({
    address: QUOTER,
    abi: QuoterV2ABI,
    functionName: "quoteExactInputSingle",
    args: [{ tokenIn: USDC, tokenOut: wCTC, amountIn, fee: 3000, sqrtPriceLimitX96: 0n }],
  });
  const [amountOut] = quote.result;
  console.log(`   Input:  1 USDC`);
  console.log(`   Output: ${formatEther(amountOut)} wCTC`);
  console.log(`   Price:  1 USDC = ${formatEther(amountOut)} wCTC\n`);

  // 2. Check balances before
  const [usdcBefore, wctcBefore] = await Promise.all([
    publicClient.readContract({ address: USDC, abi: ERC20ABI, functionName: "balanceOf", args: [account.address] }),
    publicClient.readContract({ address: wCTC, abi: ERC20ABI, functionName: "balanceOf", args: [account.address] }),
  ]);
  console.log(`2. Balances BEFORE:`);
  console.log(`   USDC: ${formatEther(usdcBefore)}`);
  console.log(`   wCTC: ${formatEther(wctcBefore)}\n`);

  // 3. Approve USDC → SwapRouter
  console.log("3. Approving USDC...");
  const approveTx = await walletClient.writeContract({
    address: USDC,
    abi: ERC20ABI,
    functionName: "approve",
    args: [SWAP_ROUTER, amountIn],
  });
  const approveReceipt = await publicClient.waitForTransactionReceipt({ hash: approveTx });
  console.log(`   Tx: ${approveTx} (status: ${approveReceipt.status})\n`);

  // 4. Swap
  console.log("4. Swapping...");
  const deadline = BigInt(Math.floor(Date.now() / 1000) + 600);
  const swapTx = await walletClient.writeContract({
    address: SWAP_ROUTER,
    abi: SwapRouterABI,
    functionName: "exactInputSingle",
    args: [{
      tokenIn: USDC,
      tokenOut: wCTC,
      fee: 3000,
      recipient: account.address,
      deadline,
      amountIn,
      amountOutMinimum: 0n,
      sqrtPriceLimitX96: 0n,
    }],
  });
  const swapReceipt = await publicClient.waitForTransactionReceipt({ hash: swapTx });
  console.log(`   Tx: ${swapTx} (status: ${swapReceipt.status})\n`);

  // 5. Check balances after
  const [usdcAfter, wctcAfter] = await Promise.all([
    publicClient.readContract({ address: USDC, abi: ERC20ABI, functionName: "balanceOf", args: [account.address] }),
    publicClient.readContract({ address: wCTC, abi: ERC20ABI, functionName: "balanceOf", args: [account.address] }),
  ]);
  console.log(`5. Balances AFTER:`);
  console.log(`   USDC: ${formatEther(usdcAfter)} (${formatEther(usdcAfter - usdcBefore)})`);
  console.log(`   wCTC: ${formatEther(wctcAfter)} (+${formatEther(wctcAfter - wctcBefore)})\n`);

  console.log("Done!");
}

main().catch(console.error);
