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
    type: "function" as const,
    name: "transfer",
    inputs: [{ name: "to", type: "address" }, { name: "amount", type: "uint256" }],
    outputs: [{ type: "bool" }],
    stateMutability: "nonpayable" as const,
  },
  {
    type: "function" as const,
    name: "balanceOf",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ type: "uint256" }],
    stateMutability: "view" as const,
  },
] as const;

// 균등 분배: 10등분 (Account 1 본인 포함)
const CTC_PER_ACCOUNT = parseEther("500");
const TOKEN_PER_ACCOUNT = parseEther("1000");

async function main() {
  const sender = privateKeyToAccount(accounts.accounts[0].privateKey as `0x${string}`);
  const walletClient = createWalletClient({ account: sender, chain: cc3Testnet, transport });

  const recipients = accounts.accounts.slice(1); // Account 2~10
  // Deployer에게도 gas용 CTC 전송
  const deployer = accounts.deployer;

  console.log(`\n=== Sender: ${sender.address} ===\n`);

  // 1) Deployer에게 CTC 1000 전송 (gas용)
  console.log(`[Deployer] ${deployer.address} — sending 1,000 CTC for gas...`);
  const deployerHash = await walletClient.sendTransaction({
    to: deployer.address as `0x${string}`,
    value: parseEther("1000"),
  });
  await publicClient.waitForTransactionReceipt({ hash: deployerHash });
  console.log(`  ✓ 1,000 CTC sent (${deployerHash})\n`);

  // 2) Account 2~10에 CTC + ERC20 분배
  for (const recipient of recipients) {
    const to = recipient.address as `0x${string}`;
    console.log(`[#${recipient.index} ${recipient.label}] ${to}`);

    // Native CTC
    const ctcHash = await walletClient.sendTransaction({ to, value: CTC_PER_ACCOUNT });
    await publicClient.waitForTransactionReceipt({ hash: ctcHash });
    console.log(`  ✓ 500 CTC`);

    // ERC20 tokens
    for (const [symbol, tokenAddr] of Object.entries(TOKENS)) {
      const hash = await walletClient.writeContract({
        address: tokenAddr,
        abi: ERC20_ABI,
        functionName: "transfer",
        args: [to, TOKEN_PER_ACCOUNT],
      });
      await publicClient.waitForTransactionReceipt({ hash });
      console.log(`  ✓ 1,000 ${symbol}`);
    }
    console.log("");
  }

  // 3) 최종 잔고 확인
  console.log("\n=== Final Balances ===\n");
  const allAccounts = [
    { label: "Deployer", address: deployer.address },
    ...accounts.accounts.map((a) => ({ label: `#${a.index} ${a.label}`, address: a.address })),
  ];

  for (const acc of allAccounts) {
    const addr = acc.address as `0x${string}`;
    const ctcBal = await publicClient.getBalance({ address: addr });
    const balances: string[] = [`CTC: ${formatEther(ctcBal)}`];

    for (const [symbol, tokenAddr] of Object.entries(TOKENS)) {
      const bal = await publicClient.readContract({
        address: tokenAddr,
        abi: ERC20_ABI,
        functionName: "balanceOf",
        args: [addr],
      });
      balances.push(`${symbol}: ${formatEther(bal)}`);
    }
    console.log(`[${acc.label}] ${balances.join(" | ")}`);
  }
}

main().catch(console.error);
