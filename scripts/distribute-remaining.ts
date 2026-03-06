import { createPublicClient, createWalletClient, http, parseEther, formatEther } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { defineChain } from "viem";
import accounts from "./simulation-accounts.json";

const cc3Testnet = defineChain({
  id: 102031,
  name: "Creditcoin3 Testnet",
  nativeCurrency: { name: "CTC", symbol: "tCTC", decimals: 18 },
  rpcUrls: { default: { http: ["https://rpc.cc3-testnet.creditcoin.network"] } },
});

const transport = http("https://rpc.cc3-testnet.creditcoin.network");
const publicClient = createPublicClient({ chain: cc3Testnet, transport });

const TOKENS = {
  wCTC: "0xdb5c8e9d0827c474342bea03e0e35a60d621afea" as `0x${string}`,
  lstCTC: "0x47ad69498520edb2e1e9464fedf5309504e26207" as `0x${string}`,
  USDC: "0x3e31b08651644b9e6535f5bf0c7a9e7e6ad92e02" as `0x${string}`,
};

const ERC20_ABI = [
  {
    type: "function" as const, name: "transfer",
    inputs: [{ name: "to", type: "address" }, { name: "amount", type: "uint256" }],
    outputs: [{ type: "bool" }], stateMutability: "nonpayable" as const,
  },
  {
    type: "function" as const, name: "balanceOf",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ type: "uint256" }], stateMutability: "view" as const,
  },
] as const;

async function main() {
  const account1 = privateKeyToAccount(accounts.accounts[0].privateKey as `0x${string}`);
  const deployer = privateKeyToAccount(accounts.deployer.privateKey as `0x${string}`);
  const deployerAddr = accounts.deployer.address as `0x${string}`;

  const wallet1 = createWalletClient({ account: account1, chain: cc3Testnet, transport });
  const walletDeployer = createWalletClient({ account: deployer, chain: cc3Testnet, transport });

  // Step 1: Account 1 → Deployer (ERC20 5,000씩)
  console.log("=== Step 1: Account 1 → Deployer (ERC20) ===\n");
  for (const [symbol, tokenAddr] of Object.entries(TOKENS)) {
    const hash = await wallet1.writeContract({
      address: tokenAddr, abi: ERC20_ABI, functionName: "transfer",
      args: [deployerAddr, parseEther("5000")],
    });
    await publicClient.waitForTransactionReceipt({ hash });
    console.log(`  ✓ 5,000 ${symbol} → Deployer`);
  }

  // Step 2: Deployer → Account 6~10 (CTC 500 + ERC20 1,000씩)
  console.log("\n=== Step 2: Deployer → Account 6~10 ===\n");
  const recipients = accounts.accounts.filter(a => a.index >= 6);

  for (const recipient of recipients) {
    const to = recipient.address as `0x${string}`;
    console.log(`[#${recipient.index} ${recipient.label}] ${to}`);

    const ctcHash = await walletDeployer.sendTransaction({ to, value: parseEther("500") });
    await publicClient.waitForTransactionReceipt({ hash: ctcHash });
    console.log(`  ✓ 500 CTC`);

    for (const [symbol, tokenAddr] of Object.entries(TOKENS)) {
      const hash = await walletDeployer.writeContract({
        address: tokenAddr, abi: ERC20_ABI, functionName: "transfer",
        args: [to, parseEther("1000")],
      });
      await publicClient.waitForTransactionReceipt({ hash });
      console.log(`  ✓ 1,000 ${symbol}`);
    }
    console.log("");
  }

  // Step 3: 최종 잔고
  console.log("=== Final Balances ===\n");
  const all = [
    { label: "Deployer", address: accounts.deployer.address },
    ...accounts.accounts.map(a => ({ label: `#${a.index} ${a.label}`, address: a.address })),
  ];
  for (const acc of all) {
    const addr = acc.address as `0x${string}`;
    const ctc = await publicClient.getBalance({ address: addr });
    const bals = [`CTC:${formatEther(ctc)}`];
    for (const [sym, tokenAddr] of Object.entries(TOKENS)) {
      const b = await publicClient.readContract({ address: tokenAddr, abi: ERC20_ABI, functionName: "balanceOf", args: [addr] });
      bals.push(`${sym}:${formatEther(b)}`);
    }
    console.log(`[${acc.label}] ${bals.join(" | ")}`);
  }
}

main().catch(console.error);
