/**
 * Check liquidity net at ticks around current to verify distribution.
 */
import { createPublicClient, http, type Address } from "viem";

const client = createPublicClient({ transport: http("https://rpc.cc3-testnet.creditcoin.network") });
const POOL = "0xb03e78c86eAfd218900904dc01149780E5dDdA16" as Address;
const TICK_ABI = [
  { type: "function", name: "ticks", inputs: [{ type: "int24" }], outputs: [{ type: "uint128" }, { type: "int128" }, { type: "uint256" }, { type: "uint256" }, { type: "int56" }, { type: "uint160" }, { type: "uint32" }, { type: "bool" }], stateMutability: "view" },
] as const;

async function main() {
  const ticks = [
    -11940, -10740, -10140, -9900, -9840, -9720, -9660, -9600,
    -9540, -9480, -9420, -9360, -9240, -9180, -8940, -8340, -7140
  ];

  console.log("Tick     | liquidityGross       | liquidityNet");
  console.log("---------|----------------------|-------------------");
  for (const t of ticks) {
    const data = await client.readContract({ address: POOL, abi: TICK_ABI, functionName: "ticks", args: [t] });
    const gross = data[0];
    const net = data[1];
    if (gross > 0n) {
      const marker = t === -9540 ? " <-- current" : "";
      console.log(`${String(t).padStart(7)} | ${String(gross).padStart(20)} | ${String(net).padStart(20)}${marker}`);
    }
  }
}

main().catch(console.error);
