/**
 * Send 100k of each token (wCTC, lstCTC, USDC) to a target address.
 * wCTC/lstCTC: faucet(100k) to deployer → transfer to target
 * USDC: mint(target, 100k) directly
 */
import {
  createPublicClient, createWalletClient, http, parseEther, formatEther,
  defineChain, type Address,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import accounts from "../simulation-accounts.json";

const TARGET = "0x11f13a0DA33AC58E45cbfC35bE2E65BdA004dF92" as Address;
const AMOUNT = parseEther("100000");

const cc3 = defineChain({
  id: 102031, name: "CC3 Testnet",
  nativeCurrency: { name: "CTC", symbol: "tCTC", decimals: 18 },
  rpcUrls: { default: { http: ["https://rpc.cc3-testnet.creditcoin.network"] } },
});
const transport = http("https://rpc.cc3-testnet.creditcoin.network");
const pub = createPublicClient({ chain: cc3, transport });
const deployer = privateKeyToAccount(accounts.deployer.privateKey as `0x${string}`);
const wallet = createWalletClient({ account: deployer, chain: cc3, transport });

const TOKENS = {
  wCTC: "0xca69344e2917f026ef4a5ace5d7b122343fc8528" as Address,
  lstCTC: "0xa768d376272f9216c8c4aa3063391bdafbcad4c2" as Address,
  USDC: "0x60e204104cfe1a93f630ea5ebc0a895cc80ebed9" as Address,
};

const FaucetABI = [
  { type: "function", name: "faucet", inputs: [{ name: "amount", type: "uint256" }], outputs: [], stateMutability: "nonpayable" },
] as const;
const MintABI = [
  { type: "function", name: "mint", inputs: [{ name: "to", type: "address" }, { name: "amount", type: "uint256" }], outputs: [], stateMutability: "nonpayable" },
] as const;
const ERC20ABI = [
  { type: "function", name: "transfer", inputs: [{ name: "to", type: "address" }, { name: "amount", type: "uint256" }], outputs: [{ type: "bool" }], stateMutability: "nonpayable" },
  { type: "function", name: "balanceOf", inputs: [{ name: "account", type: "address" }], outputs: [{ type: "uint256" }], stateMutability: "view" },
] as const;

async function wait(hash: `0x${string}`, label: string) {
  const r = await pub.waitForTransactionReceipt({ hash });
  if (r.status === "reverted") throw new Error(`REVERTED: ${label}`);
  console.log(`  [OK] ${label}`);
}

async function main() {
  console.log(`Sending 100k tokens each to ${TARGET}\n`);

  // wCTC: faucet → transfer
  console.log("wCTC:");
  let tx = await wallet.writeContract({ address: TOKENS.wCTC, abi: FaucetABI, functionName: "faucet", args: [AMOUNT] });
  await wait(tx, "faucet 100k wCTC");
  tx = await wallet.writeContract({ address: TOKENS.wCTC, abi: ERC20ABI, functionName: "transfer", args: [TARGET, AMOUNT] });
  await wait(tx, "transfer 100k wCTC → target");

  // lstCTC: faucet → transfer
  console.log("lstCTC:");
  tx = await wallet.writeContract({ address: TOKENS.lstCTC, abi: FaucetABI, functionName: "faucet", args: [AMOUNT] });
  await wait(tx, "faucet 100k lstCTC");
  tx = await wallet.writeContract({ address: TOKENS.lstCTC, abi: ERC20ABI, functionName: "transfer", args: [TARGET, AMOUNT] });
  await wait(tx, "transfer 100k lstCTC → target");

  // USDC: mint directly to target
  console.log("USDC:");
  tx = await wallet.writeContract({ address: TOKENS.USDC, abi: MintABI, functionName: "mint", args: [TARGET, AMOUNT] });
  await wait(tx, "mint 100k USDC → target");

  // Verify
  console.log("\nFinal balances at target:");
  for (const [sym, addr] of Object.entries(TOKENS)) {
    const bal = await pub.readContract({ address: addr, abi: ERC20ABI, functionName: "balanceOf", args: [TARGET] });
    console.log(`  ${sym}: ${formatEther(bal)}`);
  }
}

main().catch(e => { console.error("FATAL:", e); process.exit(1); });
