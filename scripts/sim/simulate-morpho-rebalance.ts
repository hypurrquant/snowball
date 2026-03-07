/**
 * Morpho Rebalance — utilization을 60% 수준으로 낮추기 위한 추가 supply
 *
 * 현재: wCTC/sbUSD 99%, lstCTC/sbUSD 99%
 * 목표: ~55-60% utilization
 *
 * 방법: sbUSD 잔고가 많은 계정에서 추가 supply
 */
import {
  createPublicClient,
  createWalletClient,
  http,
  formatEther,
  parseEther,
  defineChain,
  type Address,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import accounts from "../simulation-accounts.json";

const cc3Testnet = defineChain({
  id: 102031,
  name: "Creditcoin3 Testnet",
  nativeCurrency: { name: "CTC", symbol: "tCTC", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://rpc.cc3-testnet.creditcoin.network"] },
  },
});

const transport = http("https://rpc.cc3-testnet.creditcoin.network");
const publicClient = createPublicClient({ chain: cc3Testnet, transport });

const MORPHO = "0x190a733eda9ba7d2b52d56764c5921d5cd4752ca" as Address;
const IRM = "0xc4c694089af9bab4c6151663ae8424523fce32a8" as Address;
const SBUSD = "0x8aefed3e2e9a886bdd72ec9cebe27d7aabced2a5" as Address;

const MARKETS = [
  {
    name: "wCTC/sbUSD",
    id: "0x5aa4edaf3dcbf0e54abbf2bb639acbdc95305f61bd4a4f4801d42040998c5752" as `0x${string}`,
    params: {
      loanToken: SBUSD,
      collateralToken: "0xca69344e2917f026ef4a5ace5d7b122343fc8528" as Address,
      oracle: "0xbd2c8afda5fa753669c5dd03885a45a3612171af" as Address,
      irm: IRM,
      lltv: 770000000000000000n,
    },
  },
  {
    name: "lstCTC/sbUSD",
    id: "0x2eea8a6ba032c2af6adef715c6f9ed1068e77782c7d8e127a3975389e8bedd0e" as `0x${string}`,
    params: {
      loanToken: SBUSD,
      collateralToken: "0xa768d376272f9216c8c4aa3063391bdafbcad4c2" as Address,
      oracle: "0xa9aeac36aab8ce93fe4a3d63cf6b1d263dd2eb31" as Address,
      irm: IRM,
      lltv: 770000000000000000n,
    },
  },
];

const ERC20_ABI = [
  {
    name: "balanceOf", type: "function", stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "approve", type: "function", stateMutability: "nonpayable",
    inputs: [{ name: "spender", type: "address" }, { name: "amount", type: "uint256" }],
    outputs: [{ name: "", type: "bool" }],
  },
] as const;

const MORPHO_ABI = [
  {
    name: "supply", type: "function", stateMutability: "nonpayable",
    inputs: [
      { name: "marketParams", type: "tuple", components: [
        { name: "loanToken", type: "address" }, { name: "collateralToken", type: "address" },
        { name: "oracle", type: "address" }, { name: "irm", type: "address" },
        { name: "lltv", type: "uint256" },
      ]},
      { name: "assets", type: "uint256" }, { name: "shares", type: "uint256" },
      { name: "onBehalf", type: "address" }, { name: "data", type: "bytes" },
    ],
    outputs: [{ name: "assetsSupplied", type: "uint256" }, { name: "sharesSupplied", type: "uint256" }],
  },
  {
    name: "market", type: "function", stateMutability: "view",
    inputs: [{ name: "id", type: "bytes32" }],
    outputs: [
      { name: "totalSupplyAssets", type: "uint128" }, { name: "totalSupplyShares", type: "uint128" },
      { name: "totalBorrowAssets", type: "uint128" }, { name: "totalBorrowShares", type: "uint128" },
      { name: "lastUpdate", type: "uint128" }, { name: "fee", type: "uint128" },
    ],
  },
] as const;

const TARGET_UTIL = 0.55; // 55% target

async function main() {
  console.log("=== Morpho Rebalance — Lower Utilization ===\n");

  for (const market of MARKETS) {
    const state = await publicClient.readContract({
      address: MORPHO, abi: MORPHO_ABI, functionName: "market", args: [market.id],
    });
    const totalSupply = state[0];
    const totalBorrow = state[2];
    const currentUtil = totalSupply > 0n ? Number(totalBorrow * 10000n / totalSupply) / 100 : 0;

    // target supply = totalBorrow / TARGET_UTIL
    const targetSupply = (totalBorrow * 100n) / BigInt(Math.floor(TARGET_UTIL * 100));
    const needed = targetSupply > totalSupply ? targetSupply - totalSupply : 0n;

    console.log(`--- ${market.name} ---`);
    console.log(`  Supply: ${formatEther(totalSupply)}, Borrow: ${formatEther(totalBorrow)}, Util: ${currentUtil.toFixed(1)}%`);
    console.log(`  Target supply: ${formatEther(targetSupply)}, Need additional: ${formatEther(needed)} sbUSD`);

    if (needed === 0n) {
      console.log(`  Already at target. Skip.`);
      continue;
    }

    // Pick accounts with highest sbUSD balance to supply
    let remaining = needed;
    // Use accounts sorted by sbUSD balance (descending)
    const accountsWithBalance: { idx: number; balance: bigint; persona: typeof accounts.accounts[0] }[] = [];
    for (let i = 0; i < accounts.accounts.length; i++) {
      const persona = accounts.accounts[i];
      const account = privateKeyToAccount(persona.privateKey as `0x${string}`);
      const bal = await publicClient.readContract({
        address: SBUSD, abi: ERC20_ABI, functionName: "balanceOf", args: [account.address],
      });
      if (bal > parseEther("10")) { // min 10 sbUSD
        accountsWithBalance.push({ idx: i, balance: bal, persona });
      }
    }
    accountsWithBalance.sort((a, b) => (b.balance > a.balance ? 1 : -1));

    for (const { persona, balance } of accountsWithBalance) {
      if (remaining <= 0n) break;

      const account = privateKeyToAccount(persona.privateKey as `0x${string}`);
      const walletClient = createWalletClient({ account, chain: cc3Testnet, transport });

      // Supply min(remaining, 5% of balance)
      const maxFromAccount = (balance * 5n) / 100n;
      const supplyAmount = remaining < maxFromAccount ? remaining : maxFromAccount;

      if (supplyAmount < parseEther("1")) continue;

      try {
        const approveTx = await walletClient.writeContract({
          address: SBUSD, abi: ERC20_ABI, functionName: "approve", args: [MORPHO, supplyAmount],
        });
        await publicClient.waitForTransactionReceipt({ hash: approveTx });

        const supplyTx = await walletClient.writeContract({
          address: MORPHO, abi: MORPHO_ABI, functionName: "supply",
          args: [market.params, supplyAmount, 0n, account.address, "0x"],
        });
        const receipt = await publicClient.waitForTransactionReceipt({ hash: supplyTx });

        remaining -= supplyAmount;
        console.log(
          `  #${persona.index} ${persona.label}: +${formatEther(supplyAmount)} sbUSD (${receipt.status})`
        );
      } catch (err: any) {
        console.error(`  #${persona.index} FAILED: ${err.message?.slice(0, 80)}`);
      }
    }

    // Final state
    const after = await publicClient.readContract({
      address: MORPHO, abi: MORPHO_ABI, functionName: "market", args: [market.id],
    });
    const finalUtil = after[0] > 0n ? Number(after[2] * 10000n / after[0]) / 100 : 0;
    console.log(`  Final: supply=${formatEther(after[0])}, borrow=${formatEther(after[2])}, util=${finalUtil.toFixed(1)}%\n`);
  }

  // Summary
  console.log("=== Final Market State ===");
  for (const market of MARKETS) {
    const state = await publicClient.readContract({
      address: MORPHO, abi: MORPHO_ABI, functionName: "market", args: [market.id],
    });
    const util = state[0] > 0n ? Number(state[2] * 10000n / state[0]) / 100 : 0;
    console.log(`${market.name}: supply=${formatEther(state[0])}, borrow=${formatEther(state[2])}, util=${util.toFixed(1)}%`);
  }
}

main().catch(console.error);
