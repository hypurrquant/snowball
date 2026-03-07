/**
 * Morpho (SnowballLend) Supply Simulation
 * 모든 페르소나 계정에서 3개 마켓에 loanToken supply
 */
import {
  createPublicClient,
  createWalletClient,
  http,
  parseEther,
  formatEther,
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

// --- Contracts ---
const MORPHO = "0x190a733eda9ba7d2b52d56764c5921d5cd4752ca" as Address;
const IRM = "0xc4c694089af9bab4c6151663ae8424523fce32a8" as Address;

const TOKENS = {
  wCTC: "0xca69344e2917f026ef4a5ace5d7b122343fc8528" as Address,
  lstCTC: "0xa768d376272f9216c8c4aa3063391bdafbcad4c2" as Address,
  sbUSD: "0x8aefed3e2e9a886bdd72ec9cebe27d7aabced2a5" as Address,
  USDC: "0x60e204104cfe1a93f630ea5ebc0a895cc80ebed9" as Address,
};

const MARKETS = {
  "wCTC/sbUSD": {
    id: "0x5aa4edaf3dcbf0e54abbf2bb639acbdc95305f61bd4a4f4801d42040998c5752",
    params: {
      loanToken: TOKENS.sbUSD,
      collateralToken: TOKENS.wCTC,
      oracle: "0xbd2c8afda5fa753669c5dd03885a45a3612171af" as Address,
      irm: IRM,
      lltv: 770000000000000000n,
    },
    loanSymbol: "sbUSD",
  },
  "lstCTC/sbUSD": {
    id: "0x2eea8a6ba032c2af6adef715c6f9ed1068e77782c7d8e127a3975389e8bedd0e",
    params: {
      loanToken: TOKENS.sbUSD,
      collateralToken: TOKENS.lstCTC,
      oracle: "0xa9aeac36aab8ce93fe4a3d63cf6b1d263dd2eb31" as Address,
      irm: IRM,
      lltv: 770000000000000000n,
    },
    loanSymbol: "sbUSD",
  },
  "sbUSD/USDC": {
    id: "0x3a94c96ec40aa5fe54bcd20ecbcd733497e4f4f2c8d31ae4862951b20f992a0c",
    params: {
      loanToken: TOKENS.USDC,
      collateralToken: TOKENS.sbUSD,
      oracle: "0xf82396f39e93d77802bfecc33344faafc4df50f2" as Address,
      irm: IRM,
      lltv: 900000000000000000n,
    },
    loanSymbol: "USDC",
  },
} as const;

// --- ABIs ---
const ERC20_ABI = [
  {
    name: "balanceOf",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "approve",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
] as const;

const MORPHO_ABI = [
  {
    name: "supply",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      {
        name: "marketParams",
        type: "tuple",
        components: [
          { name: "loanToken", type: "address" },
          { name: "collateralToken", type: "address" },
          { name: "oracle", type: "address" },
          { name: "irm", type: "address" },
          { name: "lltv", type: "uint256" },
        ],
      },
      { name: "assets", type: "uint256" },
      { name: "shares", type: "uint256" },
      { name: "onBehalf", type: "address" },
      { name: "data", type: "bytes" },
    ],
    outputs: [
      { name: "assetsSupplied", type: "uint256" },
      { name: "sharesSupplied", type: "uint256" },
    ],
  },
  {
    name: "market",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "id", type: "bytes32" }],
    outputs: [
      { name: "totalSupplyAssets", type: "uint128" },
      { name: "totalSupplyShares", type: "uint128" },
      { name: "totalBorrowAssets", type: "uint128" },
      { name: "totalBorrowShares", type: "uint128" },
      { name: "lastUpdate", type: "uint128" },
      { name: "fee", type: "uint128" },
    ],
  },
] as const;

// --- Main ---
async function main() {
  console.log("=== Morpho Supply Simulation ===\n");

  // Check market state before
  console.log("--- Market State (Before) ---");
  for (const [name, market] of Object.entries(MARKETS)) {
    const state = await publicClient.readContract({
      address: MORPHO,
      abi: MORPHO_ABI,
      functionName: "market",
      args: [market.id as `0x${string}`],
    });
    console.log(
      `${name}: totalSupply=${formatEther(state[0])} ${market.loanSymbol}, totalBorrow=${formatEther(state[2])} ${market.loanSymbol}`
    );
  }
  console.log();

  // Supply from all 8 accounts
  const allAccounts = accounts.accounts;
  let totalTxs = 0;

  for (const persona of allAccounts) {
    const account = privateKeyToAccount(
      persona.privateKey as `0x${string}`
    );
    const walletClient = createWalletClient({
      account,
      chain: cc3Testnet,
      transport,
    });

    console.log(
      `\n--- #${persona.index} ${persona.label} (${account.address.slice(0, 8)}...) ---`
    );

    // Get balances
    const sbUSDBalance = await publicClient.readContract({
      address: TOKENS.sbUSD,
      abi: ERC20_ABI,
      functionName: "balanceOf",
      args: [account.address],
    });
    const usdcBalance = await publicClient.readContract({
      address: TOKENS.USDC,
      abi: ERC20_ABI,
      functionName: "balanceOf",
      args: [account.address],
    });

    console.log(
      `  Balances: sbUSD=${formatEther(sbUSDBalance)}, USDC=${formatEther(usdcBalance)}`
    );

    // Supply to each market (5% of loanToken balance per action)
    for (const [marketName, market] of Object.entries(MARKETS)) {
      const isUSDCMarket = market.loanSymbol === "USDC";
      const balance = isUSDCMarket ? usdcBalance : sbUSDBalance;
      const supplyAmount = (balance * 5n) / 100n; // 5%

      if (supplyAmount === 0n) {
        console.log(`  ${marketName}: skip (0 balance)`);
        continue;
      }

      // Min 1 token to avoid dust
      if (supplyAmount < parseEther("1")) {
        console.log(
          `  ${marketName}: skip (< 1 token, amount=${formatEther(supplyAmount)})`
        );
        continue;
      }

      try {
        // 1. Approve
        const approveTx = await walletClient.writeContract({
          address: market.params.loanToken,
          abi: ERC20_ABI,
          functionName: "approve",
          args: [MORPHO, supplyAmount],
        });
        await publicClient.waitForTransactionReceipt({ hash: approveTx });

        // 2. Supply
        const supplyTx = await walletClient.writeContract({
          address: MORPHO,
          abi: MORPHO_ABI,
          functionName: "supply",
          args: [
            market.params,
            supplyAmount,
            0n,
            account.address,
            "0x",
          ],
        });
        const receipt = await publicClient.waitForTransactionReceipt({
          hash: supplyTx,
        });

        console.log(
          `  ${marketName}: supplied ${formatEther(supplyAmount)} ${market.loanSymbol} (tx: ${receipt.transactionHash.slice(0, 10)}... status=${receipt.status})`
        );
        totalTxs++;
      } catch (err: any) {
        console.error(
          `  ${marketName}: FAILED - ${err.message?.slice(0, 100)}`
        );
      }
    }
  }

  // Check market state after
  console.log("\n\n--- Market State (After) ---");
  for (const [name, market] of Object.entries(MARKETS)) {
    const state = await publicClient.readContract({
      address: MORPHO,
      abi: MORPHO_ABI,
      functionName: "market",
      args: [market.id as `0x${string}`],
    });
    console.log(
      `${name}: totalSupply=${formatEther(state[0])} ${market.loanSymbol}, totalBorrow=${formatEther(state[2])} ${market.loanSymbol}`
    );
  }

  console.log(`\n=== Done! ${totalTxs} supply transactions completed ===`);
}

main().catch(console.error);
