import { createPublicClient, http, formatEther, type Address } from "viem";
import { TOKENS, RPC_URL } from "../packages/core/src/config/addresses";
import accounts from "./simulation-accounts.json";

const client = createPublicClient({ transport: http(RPC_URL) });

const ERC20_ABI = [{ type: "function", name: "balanceOf", inputs: [{ type: "address" }], outputs: [{ type: "uint256" }], stateMutability: "view" }] as const;

async function main() {
  const allAccounts = [
    { label: "Deployer", address: accounts.deployer.address },
    ...accounts.accounts.map(a => ({ label: `#${a.index} ${a.label}`, address: a.address })),
  ];

  // Header
  console.log(`${"Account".padEnd(28)} | ${"CTC".padStart(12)} | ${"wCTC".padStart(12)} | ${"lstCTC".padStart(12)} | ${"sbUSD".padStart(12)} | ${"USDC".padStart(12)}`);
  console.log("-".repeat(100));

  for (const acct of allAccounts) {
    const addr = acct.address as Address;
    const [ctc, wctc, lstctc, sbusd, usdc] = await Promise.all([
      client.getBalance({ address: addr }),
      client.readContract({ address: TOKENS.wCTC, abi: ERC20_ABI, functionName: "balanceOf", args: [addr] }),
      client.readContract({ address: TOKENS.lstCTC, abi: ERC20_ABI, functionName: "balanceOf", args: [addr] }),
      client.readContract({ address: TOKENS.sbUSD, abi: ERC20_ABI, functionName: "balanceOf", args: [addr] }),
      client.readContract({ address: TOKENS.USDC, abi: ERC20_ABI, functionName: "balanceOf", args: [addr] }),
    ]);

    const fmt = (v: bigint) => {
      const n = Number(formatEther(v));
      return n === 0 ? "0" : n < 0.01 ? "<0.01" : n.toFixed(2);
    };

    console.log(
      `${acct.label.padEnd(28)} | ${fmt(ctc).padStart(12)} | ${fmt(wctc).padStart(12)} | ${fmt(lstctc).padStart(12)} | ${fmt(sbusd).padStart(12)} | ${fmt(usdc).padStart(12)}`
    );
  }
}

main().catch(console.error);
