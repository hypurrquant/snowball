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

// token0 = USDC (lower address), token1 = wCTC (higher address)
const USDC = "0x3e31b08651644b9e6535f5bf0c7a9e7e6ad92e02" as const;
const wCTC = "0xdb5c8e9d0827c474342bea03e0e35a60d621afea" as const;
const NPM = "0xa28bfaa2e84098de8d654f690e51c265e4ae01c9" as const;

const ERC20ABI = [
  { type: "function", name: "approve", inputs: [{ name: "spender", type: "address" }, { name: "amount", type: "uint256" }], outputs: [{ type: "bool" }], stateMutability: "nonpayable" },
] as const;

const NPMABI = [
  { type: "function", name: "mint", inputs: [{ name: "params", type: "tuple", components: [{ name: "token0", type: "address" }, { name: "token1", type: "address" }, { name: "fee", type: "uint24" }, { name: "tickLower", type: "int24" }, { name: "tickUpper", type: "int24" }, { name: "amount0Desired", type: "uint256" }, { name: "amount1Desired", type: "uint256" }, { name: "amount0Min", type: "uint256" }, { name: "amount1Min", type: "uint256" }, { name: "recipient", type: "address" }, { name: "deadline", type: "uint256" }] }], outputs: [{ name: "tokenId", type: "uint256" }, { name: "liquidity", type: "uint128" }, { name: "amount0", type: "uint256" }, { name: "amount1", type: "uint256" }], stateMutability: "payable" },
] as const;

// Current tick: -9539, tickSpacing: 60
// Skewed left (more liquidity below current price = bearish wCTC bias)
const positions = [
  // --- Tight cluster near current price (left-skewed) ---
  { tickLower: -9660, tickUpper: -9480, usdc: "3",   wctc: "1.2",  label: "Sniper (left-leaning)" },
  { tickLower: -9780, tickUpper: -9420, usdc: "5",   wctc: "2",    label: "Tight LP" },
  { tickLower: -9960, tickUpper: -9300, usdc: "8",   wctc: "3",    label: "Narrow LP" },
  { tickLower: -9540, tickUpper: -9360, usdc: "4",   wctc: "1.5",  label: "Current-price sniper" },

  // --- Medium range (left-heavy skew) ---
  { tickLower: -10440, tickUpper: -8880, usdc: "10",  wctc: "4",    label: "Medium LP" },
  { tickLower: -10860, tickUpper: -8520, usdc: "7",   wctc: "2.5",  label: "Medium-wide" },
  { tickLower: -11100, tickUpper: -9060, usdc: "6",   wctc: "2",    label: "Below-biased medium" },

  // --- Wide range ---
  { tickLower: -11400, tickUpper: -7680, usdc: "8",   wctc: "3",    label: "Wide LP" },
  { tickLower: -12600, tickUpper: -6480, usdc: "5",   wctc: "2",    label: "Conservative wide" },

  // --- Asymmetric positions (skew generators) ---
  { tickLower: -10200, tickUpper: -9540, usdc: "6",   wctc: "0",    label: "Below-only (all USDC)" },
  { tickLower: -9540, tickUpper: -8700, usdc: "0",    wctc: "3",    label: "Above-only (all wCTC)" },

  // --- Background ---
  { tickLower: -15000, tickUpper: -4200, usdc: "3",   wctc: "1",    label: "Background wide" },
];

async function main() {
  console.log(`=== Multi-LP Mint: ${positions.length} positions ===`);
  console.log(`Account #2: ${account.address}\n`);

  // 1. Big approve for both tokens
  const totalUsdc = positions.reduce((s, p) => s + parseFloat(p.usdc), 0);
  const totalWctc = positions.reduce((s, p) => s + parseFloat(p.wctc), 0);
  console.log(`Total USDC needed: ~${totalUsdc}`);
  console.log(`Total wCTC needed: ~${totalWctc}\n`);

  console.log("Approving USDC...");
  const tx1 = await walletClient.writeContract({
    address: USDC, abi: ERC20ABI, functionName: "approve",
    args: [NPM, parseEther(String(totalUsdc + 10))],
  });
  await publicClient.waitForTransactionReceipt({ hash: tx1 });

  console.log("Approving wCTC...");
  const tx2 = await walletClient.writeContract({
    address: wCTC, abi: ERC20ABI, functionName: "approve",
    args: [NPM, parseEther(String(totalWctc + 10))],
  });
  await publicClient.waitForTransactionReceipt({ hash: tx2 });
  console.log("Approvals done.\n");

  // 2. Mint each position
  const deadline = BigInt(Math.floor(Date.now() / 1000) + 600);
  let successCount = 0;

  for (let i = 0; i < positions.length; i++) {
    const pos = positions[i];
    const amount0 = parseEther(pos.usdc);  // USDC = token0
    const amount1 = parseEther(pos.wctc);  // wCTC = token1

    console.log(`[${i + 1}/${positions.length}] ${pos.label}`);
    console.log(`  Range: [${pos.tickLower}, ${pos.tickUpper}] | USDC: ${pos.usdc} | wCTC: ${pos.wctc}`);

    try {
      const hash = await walletClient.writeContract({
        address: NPM, abi: NPMABI, functionName: "mint",
        args: [{
          token0: USDC,
          token1: wCTC,
          fee: 3000,
          tickLower: pos.tickLower,
          tickUpper: pos.tickUpper,
          amount0Desired: amount0,
          amount1Desired: amount1,
          amount0Min: 0n,
          amount1Min: 0n,
          recipient: account.address,
          deadline,
        }],
      });
      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      console.log(`  OK tx: ${hash.slice(0, 16)}... (gas: ${receipt.gasUsed})`);
      successCount++;
    } catch (err: any) {
      console.log(`  FAIL: ${err.shortMessage ?? err.message}`);
    }
  }

  console.log(`\n=== Done: ${successCount}/${positions.length} minted ===`);
}

main().catch(console.error);
