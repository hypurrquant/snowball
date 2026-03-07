import { createPublicClient, http, defineChain, formatEther, type Address } from "viem";
import accounts from "./simulation-accounts.json";

const cc3 = defineChain({ id: 102031, name: "CC3T", nativeCurrency: { name: "CTC", symbol: "tCTC", decimals: 18 }, rpcUrls: { default: { http: ["https://rpc.cc3-testnet.creditcoin.network"] } } });
const pc = createPublicClient({ chain: cc3, transport: http("https://rpc.cc3-testnet.creditcoin.network") });

const PoolABI = [
  { type: "function", name: "slot0", inputs: [], outputs: [{ name: "", type: "uint160" }, { name: "", type: "int24" }, { name: "", type: "uint16" }, { name: "", type: "uint16" }, { name: "", type: "uint16" }, { name: "", type: "uint8" }, { name: "", type: "bool" }], stateMutability: "view" },
  { type: "function", name: "liquidity", inputs: [], outputs: [{ type: "uint128" }], stateMutability: "view" },
] as const;
const ERC20 = [{ type: "function", name: "balanceOf", inputs: [{ name: "", type: "address" }], outputs: [{ type: "uint256" }], stateMutability: "view" }] as const;

const TOKENS = {
  lstCTC: "0xa768d376272f9216c8c4aa3063391bdafbcad4c2" as Address,
  wCTC: "0xca69344e2917f026ef4a5ace5d7b122343fc8528" as Address,
  USDC: "0x60e204104cfe1a93f630ea5ebc0a895cc80ebed9" as Address,
};

async function main() {
  const pools = [
    { name: "lstCTC/wCTC", addr: "0xee0AF4a1Aa3ce7447248f87c384b8bE7de302DA5" as Address },
    { name: "lstCTC/USDC", addr: "0x394ECC1c9094F5E3D83a6C9497a33a969e9B136a" as Address },
  ];

  for (const p of pools) {
    const [slot0, liq] = await Promise.all([
      pc.readContract({ address: p.addr, abi: PoolABI, functionName: "slot0" }),
      pc.readContract({ address: p.addr, abi: PoolABI, functionName: "liquidity" }),
    ]);
    console.log(`${p.name}: tick=${slot0[1]}, sqrtPrice=${slot0[0]}, liquidity=${liq}`);
  }

  // Check balances of #1,#2,#3,#8
  const idxs = [0,1,2,7];
  for (const i of idxs) {
    const a = accounts.accounts[i];
    const addr = a.address as Address;
    const [lst, w, u] = await Promise.all([
      pc.readContract({ address: TOKENS.lstCTC, abi: ERC20, functionName: "balanceOf", args: [addr] }),
      pc.readContract({ address: TOKENS.wCTC, abi: ERC20, functionName: "balanceOf", args: [addr] }),
      pc.readContract({ address: TOKENS.USDC, abi: ERC20, functionName: "balanceOf", args: [addr] }),
    ]);
    console.log(`#${a.index} ${a.label}: lstCTC=${formatEther(lst)}, wCTC=${formatEther(w)}, USDC=${formatEther(u)}`);
  }
}

main().catch(e => { console.error(e); process.exit(1); });
