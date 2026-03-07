/**
 * Yield Vault Deposit Simulation
 *
 * #4 Conservative Lender가 4개 Vault에 각각 deposit (5% 제한)
 * - StabilityPool sbUSD: sbUSD deposit
 * - Morpho sbUSD: sbUSD deposit
 * - Morpho wCTC: wCTC deposit
 * - Morpho USDC: USDC deposit
 */

import { createPublicClient, createWalletClient, http, parseEther, formatUnits, maxUint256 } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { defineChain } from "viem";
import accounts from "../simulation-accounts.json";

const cc3 = defineChain({
  id: 102031,
  name: "CC3 Testnet",
  nativeCurrency: { name: "CTC", symbol: "tCTC", decimals: 18 },
  rpcUrls: { default: { http: ["https://rpc.cc3-testnet.creditcoin.network"] } },
});

const transport = http("https://rpc.cc3-testnet.creditcoin.network");
const publicClient = createPublicClient({ chain: cc3, transport });

const persona = accounts.accounts[3]; // #4 Conservative Lender
const account = privateKeyToAccount(persona.privateKey as `0x${string}`);
const walletClient = createWalletClient({ account, chain: cc3, transport });

const ERC20_ABI = [
  { type: "function", name: "balanceOf", inputs: [{ name: "account", type: "address" }], outputs: [{ type: "uint256" }], stateMutability: "view" },
  { type: "function", name: "approve", inputs: [{ name: "spender", type: "address" }, { name: "amount", type: "uint256" }], outputs: [{ type: "bool" }], stateMutability: "nonpayable" },
] as const;

const VAULT_ABI = [
  { type: "function", name: "deposit", inputs: [{ name: "_amount", type: "uint256" }], outputs: [], stateMutability: "nonpayable" },
  { type: "function", name: "balanceOf", inputs: [{ name: "account", type: "address" }], outputs: [{ type: "uint256" }], stateMutability: "view" },
  { type: "function", name: "getPricePerFullShare", inputs: [], outputs: [{ type: "uint256" }], stateMutability: "view" },
  { type: "function", name: "balance", inputs: [], outputs: [{ type: "uint256" }], stateMutability: "view" },
] as const;

const TOKENS = {
  sbUSD: "0x8aefed3e2e9a886bdd72ec9cebe27d7aabced2a5" as `0x${string}`,
  wCTC: "0xca69344e2917f026ef4a5ace5d7b122343fc8528" as `0x${string}`,
  USDC: "0x60e204104cfe1a93f630ea5ebc0a895cc80ebed9" as `0x${string}`,
};

const VAULTS = [
  { name: "StabilityPool sbUSD", address: "0x40a8b5b8a6c1e4236da10da2731944e59444c179" as `0x${string}`, want: TOKENS.sbUSD, wantSymbol: "sbUSD" },
  { name: "Morpho sbUSD", address: "0x384ebff116bb8458628b62624ab9535a4636a397" as `0x${string}`, want: TOKENS.sbUSD, wantSymbol: "sbUSD" },
  { name: "Morpho wCTC", address: "0x766c8bf45d7a7356f63e830c134c07911b662757" as `0x${string}`, want: TOKENS.wCTC, wantSymbol: "wCTC" },
  { name: "Morpho USDC", address: "0xa6f9c033dba98f2d0fc79522b1b5c5098dc567b7" as `0x${string}`, want: TOKENS.USDC, wantSymbol: "USDC" },
];

async function depositToVault(vault: typeof VAULTS[0], amount: bigint) {
  console.log(`\n--- ${vault.name} ---`);
  console.log(`  Depositing ${formatUnits(amount, 18)} ${vault.wantSymbol}`);

  // 1. Approve
  const approveHash = await walletClient.writeContract({
    address: vault.want,
    abi: ERC20_ABI,
    functionName: "approve",
    args: [vault.address, maxUint256],
  });
  await publicClient.waitForTransactionReceipt({ hash: approveHash });
  console.log(`  Approved: ${approveHash}`);

  // 2. Deposit
  const depositHash = await walletClient.writeContract({
    address: vault.address,
    abi: VAULT_ABI,
    functionName: "deposit",
    args: [amount],
  });
  const receipt = await publicClient.waitForTransactionReceipt({ hash: depositHash });
  console.log(`  Deposited: ${depositHash} (status: ${receipt.status})`);

  // 3. Check result
  const [shares, tvl, pps] = await Promise.all([
    publicClient.readContract({ address: vault.address, abi: VAULT_ABI, functionName: "balanceOf", args: [account.address] }),
    publicClient.readContract({ address: vault.address, abi: VAULT_ABI, functionName: "balance" }),
    publicClient.readContract({ address: vault.address, abi: VAULT_ABI, functionName: "getPricePerFullShare" }),
  ]);
  console.log(`  Result: shares=${formatUnits(shares, 18)}, TVL=${formatUnits(tvl, 18)}, PPS=${formatUnits(pps, 18)}`);
}

async function main() {
  console.log(`=== Yield Vault Deposit Simulation ===`);
  console.log(`Account: #4 ${persona.label} (${account.address})`);

  // Get balances
  const [sbUSDbal, wCTCbal, USDCbal] = await Promise.all([
    publicClient.readContract({ address: TOKENS.sbUSD, abi: ERC20_ABI, functionName: "balanceOf", args: [account.address] }),
    publicClient.readContract({ address: TOKENS.wCTC, abi: ERC20_ABI, functionName: "balanceOf", args: [account.address] }),
    publicClient.readContract({ address: TOKENS.USDC, abi: ERC20_ABI, functionName: "balanceOf", args: [account.address] }),
  ]);

  console.log(`\nBalances:`);
  console.log(`  sbUSD: ${formatUnits(sbUSDbal, 18)}`);
  console.log(`  wCTC: ${formatUnits(wCTCbal, 18)}`);
  console.log(`  USDC: ${formatUnits(USDCbal, 18)}`);

  // 5% of each balance
  const sbUSD5pct = sbUSDbal * 5n / 100n;
  const wCTC5pct = wCTCbal * 5n / 100n;
  const USDC5pct = USDCbal * 5n / 100n;

  // Split sbUSD between 2 vaults (StabilityPool + Morpho sbUSD)
  const sbUSDperVault = sbUSD5pct / 2n;

  console.log(`\n5% amounts:`);
  console.log(`  sbUSD per vault: ${formatUnits(sbUSDperVault, 18)} (total 5%: ${formatUnits(sbUSD5pct, 18)})`);
  console.log(`  wCTC: ${formatUnits(wCTC5pct, 18)}`);
  console.log(`  USDC: ${formatUnits(USDC5pct, 18)}`);

  // Deposit to each vault
  await depositToVault(VAULTS[0], sbUSDperVault); // StabilityPool
  await depositToVault(VAULTS[1], sbUSDperVault); // Morpho sbUSD
  await depositToVault(VAULTS[2], wCTC5pct);      // Morpho wCTC
  await depositToVault(VAULTS[3], USDC5pct);      // Morpho USDC

  console.log(`\n=== Done ===`);
}

main().catch(console.error);
