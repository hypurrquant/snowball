/**
 * Verify Multicall3 works on Creditcoin Testnet
 * Tests: aggregate3 with pool slot0 + liquidity + tickSpacing in one call
 */
import { createPublicClient, http, encodeFunctionData, type Address } from "viem";

const RPC_URL = "https://rpc.cc3-testnet.creditcoin.network";
const MULTICALL3 = "0xa943BE162b5036539017Ce9fcdF7295D41De80c1" as Address;
const POOL = "0xb03e78c86eAfd218900904dc01149780E5dDdA16" as Address;

const POOL_ABI = [
  {
    name: "slot0", type: "function", stateMutability: "view",
    inputs: [],
    outputs: [
      { name: "sqrtPriceX96", type: "uint160" },
      { name: "tick", type: "int24" },
      { name: "observationIndex", type: "uint16" },
      { name: "observationCardinality", type: "uint16" },
      { name: "observationCardinalityNext", type: "uint16" },
      { name: "feeProtocol", type: "uint8" },
      { name: "unlocked", type: "bool" },
    ],
  },
  {
    name: "liquidity", type: "function", stateMutability: "view",
    inputs: [], outputs: [{ name: "", type: "uint128" }],
  },
  {
    name: "tickSpacing", type: "function", stateMutability: "view",
    inputs: [], outputs: [{ name: "", type: "int24" }],
  },
] as const;

const MULTICALL3_ABI = [
  {
    name: "aggregate3",
    type: "function",
    stateMutability: "payable",
    inputs: [
      {
        name: "calls",
        type: "tuple[]",
        components: [
          { name: "target", type: "address" },
          { name: "allowFailure", type: "bool" },
          { name: "callData", type: "bytes" },
        ],
      },
    ],
    outputs: [
      {
        name: "returnData",
        type: "tuple[]",
        components: [
          { name: "success", type: "bool" },
          { name: "returnData", type: "bytes" },
        ],
      },
    ],
  },
] as const;

async function main() {
  const chain = {
    id: 102031,
    name: "Creditcoin Testnet",
    nativeCurrency: { name: "Creditcoin", symbol: "tCTC", decimals: 18 },
    rpcUrls: { default: { http: [RPC_URL] } },
    contracts: {
      multicall3: { address: MULTICALL3, blockCreated: 4382268 },
    },
  } as const;

  const client = createPublicClient({ chain, transport: http(RPC_URL) });

  // Test 1: Direct multicall3 aggregate3 call
  console.log("=== Test 1: Direct aggregate3 call ===");

  const slot0Data = encodeFunctionData({ abi: POOL_ABI, functionName: "slot0" });
  const liqData = encodeFunctionData({ abi: POOL_ABI, functionName: "liquidity" });
  const tsData = encodeFunctionData({ abi: POOL_ABI, functionName: "tickSpacing" });

  const results = await client.readContract({
    address: MULTICALL3,
    abi: MULTICALL3_ABI,
    functionName: "aggregate3",
    args: [[
      { target: POOL, allowFailure: false, callData: slot0Data },
      { target: POOL, allowFailure: false, callData: liqData },
      { target: POOL, allowFailure: false, callData: tsData },
    ]],
  });

  console.log("Results count:", results.length);
  for (let i = 0; i < results.length; i++) {
    console.log(`  [${i}] success=${results[i].success}, dataLen=${results[i].returnData.length}`);
  }

  // Test 2: viem's multicall (what wagmi useReadContracts uses internally)
  console.log("\n=== Test 2: viem multicall (batch) ===");
  const batchResults = await client.multicall({
    contracts: [
      { address: POOL, abi: POOL_ABI, functionName: "slot0" },
      { address: POOL, abi: POOL_ABI, functionName: "liquidity" },
      { address: POOL, abi: POOL_ABI, functionName: "tickSpacing" },
    ],
  });

  for (const r of batchResults) {
    console.log(`  status=${r.status}, result=${r.status === "success" ? JSON.stringify(r.result, (_, v) => typeof v === "bigint" ? v.toString() : v) : r.error}`);
  }

  console.log("\nMulticall3 is working!");
}

main().catch(console.error);
