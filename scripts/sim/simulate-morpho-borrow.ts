/**
 * Morpho (SnowballLend) Borrow Simulation
 * 페르소나별 담보 예치(supplyCollateral) + 대출(borrow)
 *
 * #5 Moderate: wCTC/sbUSD, HF ~2.5
 * #6 Aggressive: wCTC/sbUSD, HF ~1.3
 * #7 Multi-Market: wCTC/sbUSD + lstCTC/sbUSD + sbUSD/USDC
 * #8 DeFi Maximalist: lstCTC/sbUSD
 */
import {
  createPublicClient,
  createWalletClient,
  http,
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

// Oracle prices (1e36 scale)
const ORACLE_PRICES = {
  wCTC: 5_000000000000000000000000000000000000n, // 5e36
  lstCTC: 5_200000000000000000000000000000000000n, // 5.2e36
  sbUSD: 1_000000000000000000000000000000000000n, // 1e36
};
const ORACLE_SCALE = 10n ** 36n;
const WAD = 10n ** 18n;

const MARKETS = {
  "wCTC/sbUSD": {
    id: "0x5aa4edaf3dcbf0e54abbf2bb639acbdc95305f61bd4a4f4801d42040998c5752" as `0x${string}`,
    params: {
      loanToken: TOKENS.sbUSD,
      collateralToken: TOKENS.wCTC,
      oracle: "0xbd2c8afda5fa753669c5dd03885a45a3612171af" as Address,
      irm: IRM,
      lltv: 770000000000000000n,
    },
    oraclePrice: ORACLE_PRICES.wCTC,
    collSymbol: "wCTC",
    loanSymbol: "sbUSD",
  },
  "lstCTC/sbUSD": {
    id: "0x2eea8a6ba032c2af6adef715c6f9ed1068e77782c7d8e127a3975389e8bedd0e" as `0x${string}`,
    params: {
      loanToken: TOKENS.sbUSD,
      collateralToken: TOKENS.lstCTC,
      oracle: "0xa9aeac36aab8ce93fe4a3d63cf6b1d263dd2eb31" as Address,
      irm: IRM,
      lltv: 770000000000000000n,
    },
    oraclePrice: ORACLE_PRICES.lstCTC,
    collSymbol: "lstCTC",
    loanSymbol: "sbUSD",
  },
  "sbUSD/USDC": {
    id: "0x3a94c96ec40aa5fe54bcd20ecbcd733497e4f4f2c8d31ae4862951b20f992a0c" as `0x${string}`,
    params: {
      loanToken: TOKENS.USDC,
      collateralToken: TOKENS.sbUSD,
      oracle: "0xf82396f39e93d77802bfecc33344faafc4df50f2" as Address,
      irm: IRM,
      lltv: 900000000000000000n,
    },
    oraclePrice: ORACLE_PRICES.sbUSD,
    collSymbol: "sbUSD",
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
    name: "supplyCollateral",
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
      { name: "onBehalf", type: "address" },
      { name: "data", type: "bytes" },
    ],
    outputs: [],
  },
  {
    name: "borrow",
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
      { name: "receiver", type: "address" },
    ],
    outputs: [
      { name: "assetsBorrowed", type: "uint256" },
      { name: "sharesBorrowed", type: "uint256" },
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
  {
    name: "position",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "id", type: "bytes32" },
      { name: "user", type: "address" },
    ],
    outputs: [
      { name: "supplyShares", type: "uint256" },
      { name: "borrowShares", type: "uint128" },
      { name: "collateral", type: "uint128" },
    ],
  },
] as const;

type MarketDef = (typeof MARKETS)[keyof typeof MARKETS];

// Calculate borrow amount for a target health factor
function calcBorrowForHF(
  collateralAmount: bigint,
  oraclePrice: bigint,
  lltv: bigint,
  targetHF: number,
): bigint {
  // maxBorrow = collateral * oraclePrice / ORACLE_SCALE * lltv / WAD
  const collateralValue = (collateralAmount * oraclePrice) / ORACLE_SCALE;
  const maxBorrow = (collateralValue * lltv) / WAD;
  // borrow = maxBorrow / targetHF
  const borrowAmount = (maxBorrow * WAD) / BigInt(Math.floor(targetHF * 1e18));
  return borrowAmount;
}

function calcHF(
  collateralAmount: bigint,
  borrowAmount: bigint,
  oraclePrice: bigint,
  lltv: bigint,
): number {
  if (borrowAmount === 0n) return Infinity;
  const collateralValue = (collateralAmount * oraclePrice) / ORACLE_SCALE;
  const maxBorrow = (collateralValue * lltv) / WAD;
  return Number((maxBorrow * WAD) / borrowAmount) / 1e18;
}

interface BorrowPlan {
  personaIndex: number;
  label: string;
  market: MarketDef;
  marketName: string;
  collateralAmount: bigint; // 5% of balance
  targetHF: number;
}

async function getAvailableLiquidity(market: MarketDef): Promise<bigint> {
  const state = await publicClient.readContract({
    address: MORPHO,
    abi: MORPHO_ABI,
    functionName: "market",
    args: [market.id],
  });
  return state[0] - state[2]; // totalSupply - totalBorrow
}

async function executeBorrow(plan: BorrowPlan) {
  const persona = accounts.accounts[plan.personaIndex - 1];
  const account = privateKeyToAccount(persona.privateKey as `0x${string}`);
  const walletClient = createWalletClient({
    account,
    chain: cc3Testnet,
    transport,
  });

  console.log(
    `\n--- #${plan.personaIndex} ${plan.label} → ${plan.marketName} (target HF: ${plan.targetHF}) ---`
  );

  // 1. Get collateral balance & calculate 5%
  const collBalance = await publicClient.readContract({
    address: plan.market.params.collateralToken,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: [account.address],
  });
  const collAmount = (collBalance * 5n) / 100n; // 5% rule

  console.log(
    `  ${plan.market.collSymbol} balance: ${formatEther(collBalance)}, collateral: ${formatEther(collAmount)} (5%)`
  );

  // 2. Calculate borrow amount for target HF
  let borrowAmount = calcBorrowForHF(
    collAmount,
    plan.market.oraclePrice,
    plan.market.params.lltv,
    plan.targetHF,
  );

  // 3. Check available liquidity — leave 10% buffer
  const available = await getAvailableLiquidity(plan.market);
  const maxSafeBorrow = (available * 90n) / 100n;

  if (borrowAmount > maxSafeBorrow) {
    console.log(
      `  Limiting borrow: ${formatEther(borrowAmount)} → ${formatEther(maxSafeBorrow)} (available: ${formatEther(available)})`
    );
    borrowAmount = maxSafeBorrow;
  }

  if (borrowAmount <= 0n) {
    console.log(`  Skip: no liquidity available`);
    return false;
  }

  const projectedHF = calcHF(
    collAmount,
    borrowAmount,
    plan.market.oraclePrice,
    plan.market.params.lltv,
  );
  console.log(
    `  Borrow: ${formatEther(borrowAmount)} ${plan.market.loanSymbol}, projected HF: ${projectedHF.toFixed(2)}`
  );

  try {
    // 4. Approve collateral → SnowballLend
    const approveTx = await walletClient.writeContract({
      address: plan.market.params.collateralToken,
      abi: ERC20_ABI,
      functionName: "approve",
      args: [MORPHO, collAmount],
    });
    await publicClient.waitForTransactionReceipt({ hash: approveTx });

    // 5. Supply collateral
    const collTx = await walletClient.writeContract({
      address: MORPHO,
      abi: MORPHO_ABI,
      functionName: "supplyCollateral",
      args: [plan.market.params, collAmount, account.address, "0x"],
    });
    const collReceipt = await publicClient.waitForTransactionReceipt({ hash: collTx });
    console.log(
      `  supplyCollateral: ${formatEther(collAmount)} ${plan.market.collSymbol} (tx: ${collReceipt.transactionHash.slice(0, 10)}... ${collReceipt.status})`
    );

    // 6. Borrow
    const borrowTx = await walletClient.writeContract({
      address: MORPHO,
      abi: MORPHO_ABI,
      functionName: "borrow",
      args: [plan.market.params, borrowAmount, 0n, account.address, account.address],
    });
    const borrowReceipt = await publicClient.waitForTransactionReceipt({ hash: borrowTx });
    console.log(
      `  borrow: ${formatEther(borrowAmount)} ${plan.market.loanSymbol} (tx: ${borrowReceipt.transactionHash.slice(0, 10)}... ${borrowReceipt.status})`
    );

    // 7. Verify position
    const pos = await publicClient.readContract({
      address: MORPHO,
      abi: MORPHO_ABI,
      functionName: "position",
      args: [plan.market.id, account.address],
    });
    const actualHF = calcHF(
      pos[2], // collateral
      borrowAmount, // approximate (shares → assets would be more exact)
      plan.market.oraclePrice,
      plan.market.params.lltv,
    );
    console.log(
      `  Position: collateral=${formatEther(pos[2])}, borrowShares=${pos[1]}, HF≈${actualHF.toFixed(2)}`
    );

    return true;
  } catch (err: any) {
    console.error(`  FAILED: ${err.message?.slice(0, 120)}`);
    return false;
  }
}

async function main() {
  console.log("=== Morpho Borrow Simulation ===\n");

  // Show market state before
  console.log("--- Market State (Before) ---");
  for (const [name, market] of Object.entries(MARKETS)) {
    const state = await publicClient.readContract({
      address: MORPHO,
      abi: MORPHO_ABI,
      functionName: "market",
      args: [market.id],
    });
    const available = state[0] - state[2];
    console.log(
      `${name}: supply=${formatEther(state[0])}, borrow=${formatEther(state[2])}, available=${formatEther(available)}`
    );
  }

  // Define borrow plans per persona
  const plans: BorrowPlan[] = [
    // #5 Moderate Borrower — wCTC/sbUSD, HF ~2.5
    {
      personaIndex: 5,
      label: "Moderate Borrower",
      market: MARKETS["wCTC/sbUSD"],
      marketName: "wCTC/sbUSD",
      collateralAmount: 0n, // calculated from 5% of balance
      targetHF: 2.5,
    },
    // #6 Aggressive Borrower — wCTC/sbUSD, HF ~1.3
    {
      personaIndex: 6,
      label: "Aggressive Borrower",
      market: MARKETS["wCTC/sbUSD"],
      marketName: "wCTC/sbUSD",
      collateralAmount: 0n,
      targetHF: 1.3,
    },
    // #7 Multi-Market — lstCTC/sbUSD, HF ~2.0
    {
      personaIndex: 7,
      label: "Multi-Market (lstCTC)",
      market: MARKETS["lstCTC/sbUSD"],
      marketName: "lstCTC/sbUSD",
      collateralAmount: 0n,
      targetHF: 2.0,
    },
    // #7 Multi-Market — sbUSD/USDC, HF ~2.0
    {
      personaIndex: 7,
      label: "Multi-Market (sbUSD)",
      market: MARKETS["sbUSD/USDC"],
      marketName: "sbUSD/USDC",
      collateralAmount: 0n,
      targetHF: 2.0,
    },
    // #8 DeFi Maximalist — lstCTC/sbUSD, HF ~2.0
    {
      personaIndex: 8,
      label: "DeFi Maximalist",
      market: MARKETS["lstCTC/sbUSD"],
      marketName: "lstCTC/sbUSD",
      collateralAmount: 0n,
      targetHF: 2.0,
    },
  ];

  let successCount = 0;
  for (const plan of plans) {
    const ok = await executeBorrow(plan);
    if (ok) successCount++;
  }

  // Show market state after
  console.log("\n\n--- Market State (After) ---");
  for (const [name, market] of Object.entries(MARKETS)) {
    const state = await publicClient.readContract({
      address: MORPHO,
      abi: MORPHO_ABI,
      functionName: "market",
      args: [market.id],
    });
    const available = state[0] - state[2];
    const util =
      state[0] > 0n
        ? Number((state[2] * 10000n) / state[0]) / 100
        : 0;
    console.log(
      `${name}: supply=${formatEther(state[0])}, borrow=${formatEther(state[2])}, available=${formatEther(available)}, util=${util.toFixed(1)}%`
    );
  }

  console.log(`\n=== Done! ${successCount}/${plans.length} borrow operations succeeded ===`);
}

main().catch(console.error);
