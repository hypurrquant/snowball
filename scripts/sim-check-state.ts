import { createPublicClient, http, formatEther, type Address } from "viem";

const RPC = "https://rpc.cc3-testnet.creditcoin.network";
const client = createPublicClient({ transport: http(RPC) });

const ERC20_ABI = [{ type: "function", name: "balanceOf", inputs: [{ type: "address" }], outputs: [{ type: "uint256" }], stateMutability: "view" }] as const;
const POOL_ABI = [
  { type: "function", name: "slot0", inputs: [], outputs: [{ type: "uint160" }, { type: "int24" }, { type: "uint16" }, { type: "uint16" }, { type: "uint16" }, { type: "uint8" }, { type: "bool" }], stateMutability: "view" },
  { type: "function", name: "liquidity", inputs: [], outputs: [{ type: "uint128" }], stateMutability: "view" },
] as const;

const ACCT2 = "0x66a9D2919804f15C5fba1De9e3Bae70eCDC15ad0";
const TOKENS: Record<string, Address> = {
  wCTC: "0xdb5c8e9d0827c474342bea03e0e35a60d621afea",
  lstCTC: "0x47ad69498520edb2e1e9464fedf5309504e26207",
  sbUSD: "0x5772f9415b75ecca00e7667e0c7d730db3b29fbd",
  USDC: "0x3e31b08651644b9e6535f5bf0c7a9e7e6ad92e02",
};
const POOLS: Record<string, Address> = {
  "wCTC/USDC": "0xb03e78c86eAfd218900904dc01149780E5dDdA16",
  "wCTC/sbUSD": "0x3528EE3e50296ccB0E5d122d83E4711201C5d470",
  "sbUSD/USDC": "0x9eFD61a9b9E63f71419CD5C78Bd0daF8C6528624",
  "lstCTC/wCTC": "0xe82a00061ddABA64ADAf838E8C7A3629AbE069B8",
};

async function main() {
  console.log("=== Account 2 (Active Trader) Balances ===");
  for (const [sym, addr] of Object.entries(TOKENS)) {
    const bal = await client.readContract({ address: addr, abi: ERC20_ABI, functionName: "balanceOf", args: [ACCT2] });
    console.log(`  ${sym}: ${formatEther(bal)}`);
  }
  const nativeBal = await client.getBalance({ address: ACCT2 });
  console.log(`  CTC (native): ${formatEther(nativeBal)}`);

  console.log("\n=== Pool States ===");
  for (const [name, addr] of Object.entries(POOLS)) {
    const slot0 = await client.readContract({ address: addr, abi: POOL_ABI, functionName: "slot0" });
    const liq = await client.readContract({ address: addr, abi: POOL_ABI, functionName: "liquidity" });
    const tick = Number(slot0[1]);
    console.log(`  ${name}: tick=${tick}, liquidity=${liq}, sqrtPriceX96=${slot0[0]}`);
  }
}

main().catch(console.error);
