import { createPublicClient, http, formatEther, defineChain } from "viem";

const cc3Testnet = defineChain({
  id: 102031,
  name: "Creditcoin3 Testnet",
  nativeCurrency: { name: "CTC", symbol: "tCTC", decimals: 18 },
  rpcUrls: { default: { http: ["https://rpc.cc3-testnet.creditcoin.network"] } },
});

const publicClient = createPublicClient({ chain: cc3Testnet, transport: http("https://rpc.cc3-testnet.creditcoin.network") });

const FACTORY = "0x09616b503326dc860b3c3465525b39fe4fcdd049" as const;
const wCTC = "0xdb5c8e9d0827c474342bea03e0e35a60d621afea" as const;
const USDC = "0x3e31b08651644b9e6535f5bf0c7a9e7e6ad92e02" as const;
const ACCOUNT2 = "0x66a9D2919804f15C5fba1De9e3Bae70eCDC15ad0" as const;

const FactoryABI = [
  { type: "function", name: "getPool", inputs: [{ name: "tokenA", type: "address" }, { name: "tokenB", type: "address" }, { name: "fee", type: "uint24" }], outputs: [{ name: "pool", type: "address" }], stateMutability: "view" },
] as const;

const PoolABI = [
  { type: "function", name: "slot0", inputs: [], outputs: [{ name: "sqrtPriceX96", type: "uint160" }, { name: "tick", type: "int24" }, { name: "observationIndex", type: "uint16" }, { name: "observationCardinality", type: "uint16" }, { name: "observationCardinalityNext", type: "uint16" }, { name: "feeProtocol", type: "uint8" }, { name: "unlocked", type: "bool" }], stateMutability: "view" },
  { type: "function", name: "liquidity", inputs: [], outputs: [{ type: "uint128" }], stateMutability: "view" },
  { type: "function", name: "token0", inputs: [], outputs: [{ type: "address" }], stateMutability: "view" },
  { type: "function", name: "token1", inputs: [], outputs: [{ type: "address" }], stateMutability: "view" },
  { type: "function", name: "fee", inputs: [], outputs: [{ type: "uint24" }], stateMutability: "view" },
] as const;

const ERC20ABI = [
  { type: "function", name: "balanceOf", inputs: [{ name: "account", type: "address" }], outputs: [{ type: "uint256" }], stateMutability: "view" },
  { type: "function", name: "symbol", inputs: [], outputs: [{ type: "string" }], stateMutability: "view" },
] as const;

async function main() {
  // Check all fee tiers
  const fees = [500, 3000, 10000] as const;

  for (const fee of fees) {
    const poolAddr = await publicClient.readContract({
      address: FACTORY,
      abi: FactoryABI,
      functionName: "getPool",
      args: [wCTC, USDC, fee],
    });

    console.log(`\n=== Fee ${fee} (${fee/10000}%) ===`);
    console.log(`Pool address: ${poolAddr}`);

    if (poolAddr === "0x0000000000000000000000000000000000000000") {
      console.log("Pool does not exist for this fee tier.");
      continue;
    }

    const [slot0, liquidity, token0, token1] = await Promise.all([
      publicClient.readContract({ address: poolAddr, abi: PoolABI, functionName: "slot0" }),
      publicClient.readContract({ address: poolAddr, abi: PoolABI, functionName: "liquidity" }),
      publicClient.readContract({ address: poolAddr, abi: PoolABI, functionName: "token0" }),
      publicClient.readContract({ address: poolAddr, abi: PoolABI, functionName: "token1" }),
    ]);

    const [sqrtPriceX96, tick] = slot0;

    // Calculate price from sqrtPriceX96
    // price = (sqrtPriceX96 / 2^96)^2
    const Q96 = 2n ** 96n;
    const priceX192 = sqrtPriceX96 * sqrtPriceX96;
    const Q192 = Q96 * Q96;

    // price of token0 in terms of token1
    const priceNum = Number(priceX192 * 10n**18n / Q192) / 1e18;

    console.log(`Token0: ${token0}`);
    console.log(`Token1: ${token1}`);
    console.log(`sqrtPriceX96: ${sqrtPriceX96}`);
    console.log(`Current tick: ${tick}`);
    console.log(`Liquidity: ${liquidity}`);
    console.log(`Liquidity (formatted): ${formatEther(liquidity)}`);
    console.log(`Price (token0/token1): ${priceNum}`);
    console.log(`Price (token1/token0): ${priceNum > 0 ? 1/priceNum : 'N/A'}`);

    // Check pool token reserves
    const [reserve0, reserve1] = await Promise.all([
      publicClient.readContract({ address: token0, abi: ERC20ABI, functionName: "balanceOf", args: [poolAddr] }),
      publicClient.readContract({ address: token1, abi: ERC20ABI, functionName: "balanceOf", args: [poolAddr] }),
    ]);

    const [sym0, sym1] = await Promise.all([
      publicClient.readContract({ address: token0, abi: ERC20ABI, functionName: "symbol" }),
      publicClient.readContract({ address: token1, abi: ERC20ABI, functionName: "symbol" }),
    ]);

    console.log(`\nPool reserves:`);
    console.log(`  ${sym0}: ${formatEther(reserve0)}`);
    console.log(`  ${sym1}: ${formatEther(reserve1)}`);
  }

  // Check account #2 balances
  console.log(`\n=== Account #2 (Active Trader) Balances ===`);
  console.log(`Address: ${ACCOUNT2}`);

  const [wctcBal, usdcBal, nativeBal] = await Promise.all([
    publicClient.readContract({ address: wCTC, abi: ERC20ABI, functionName: "balanceOf", args: [ACCOUNT2] }),
    publicClient.readContract({ address: USDC, abi: ERC20ABI, functionName: "balanceOf", args: [ACCOUNT2] }),
    publicClient.getBalance({ address: ACCOUNT2 }),
  ]);

  console.log(`  wCTC: ${formatEther(wctcBal)}`);
  console.log(`  USDC: ${formatEther(usdcBal)}`);
  console.log(`  CTC (native): ${formatEther(nativeBal)}`);
}

main().catch(console.error);
