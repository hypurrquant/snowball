/**
 * Emission Cron — Daily LP Incentive Creator
 * Creates a 24-hour wCTC emission incentive on SnowballStaker for the sbUSD/USDC pool.
 *
 * Usage: NODE_PATH=apps/web/node_modules npx tsx scripts/ops/emission-cron.ts
 */
import {
  createPublicClient,
  createWalletClient,
  http,
  formatEther,
  type Address,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { defineChain } from "viem";
import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config({ path: path.join(__dirname, "../../.env") });

// ─── Chain ───
const cc3 = defineChain({
  id: 102031,
  name: "CC3 Testnet",
  nativeCurrency: { name: "CTC", symbol: "tCTC", decimals: 18 },
  rpcUrls: { default: { http: ["https://rpc.cc3-testnet.creditcoin.network"] } },
});

// ─── Config ───
const REWARD_AMOUNT = 10n * 10n ** 18n; // 10 wCTC (configurable)
const START_DELAY_SECONDS = 5 * 60;     // 5 minutes from now
const INCENTIVE_DURATION_SECONDS = 24 * 60 * 60; // 24 hours

const WCTC_ADDRESS = "0xca69344e2917f026ef4a5ace5d7b122343fc8528" as Address;
const SBUSD_USDC_POOL = "0xe70647BF2baB8282B65f674b0DF8B7f0bb658859" as Address;
const STAKER_ADDRESS = "0x1bea0762c858e56f9aace66280bd713ad17da287" as Address;

// ─── ABIs ───
const erc20ABI = [
  {
    type: "function",
    name: "approve",
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ type: "bool" }],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "allowance",
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" },
    ],
    outputs: [{ type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "balanceOf",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ type: "uint256" }],
    stateMutability: "view",
  },
] as const;

const stakerABI = [
  {
    type: "function",
    name: "createIncentive",
    inputs: [
      {
        name: "key",
        type: "tuple",
        components: [
          { name: "rewardToken", type: "address" },
          { name: "pool", type: "address" },
          { name: "startTime", type: "uint256" },
          { name: "endTime", type: "uint256" },
          { name: "refundee", type: "address" },
        ],
      },
      { name: "reward", type: "uint256" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
] as const;

async function main() {
  // 1. Load deployer wallet
  const privateKey = process.env.DEPLOYER_PRIVATE_KEY;
  if (!privateKey) {
    throw new Error("DEPLOYER_PRIVATE_KEY not set in .env");
  }
  const account = privateKeyToAccount(privateKey as `0x${string}`);
  const transport = http("https://rpc.cc3-testnet.creditcoin.network");
  const pub = createPublicClient({ chain: cc3, transport });
  const wallet = createWalletClient({ account, chain: cc3, transport });

  console.log("=== Emission Cron ===");
  console.log(`Deployer: ${account.address}`);
  const bal = await pub.getBalance({ address: account.address });
  console.log(`Balance:  ${formatEther(bal)} CTC\n`);

  // 2. Pool target
  console.log(`Target pool: sbUSD/USDC (${SBUSD_USDC_POOL})`);
  console.log(`Reward token: wCTC (${WCTC_ADDRESS})`);
  console.log(`Reward amount: ${formatEther(REWARD_AMOUNT)} wCTC`);

  // 3. Check wCTC balance
  const wctcBalance = await pub.readContract({
    address: WCTC_ADDRESS,
    abi: erc20ABI,
    functionName: "balanceOf",
    args: [account.address],
  });
  console.log(`wCTC balance: ${formatEther(wctcBalance)} wCTC`);
  if (wctcBalance < REWARD_AMOUNT) {
    throw new Error(
      `Insufficient wCTC balance. Need ${formatEther(REWARD_AMOUNT)}, have ${formatEther(wctcBalance)}`
    );
  }

  // 4. Approve reward token to Staker
  console.log("\n--- Step 1: Approve wCTC to Staker ---");
  const allowance = await pub.readContract({
    address: WCTC_ADDRESS,
    abi: erc20ABI,
    functionName: "allowance",
    args: [account.address, STAKER_ADDRESS],
  });
  console.log(`Current allowance: ${formatEther(allowance)} wCTC`);

  if (allowance < REWARD_AMOUNT) {
    const approveHash = await wallet.writeContract({
      address: WCTC_ADDRESS,
      abi: erc20ABI,
      functionName: "approve",
      args: [STAKER_ADDRESS, REWARD_AMOUNT],
      gas: 100_000n,
    });
    const approveRx = await pub.waitForTransactionReceipt({ hash: approveHash });
    if (approveRx.status !== "success") throw new Error("Approve tx reverted");
    console.log(`Approved: ${approveHash}`);
  } else {
    console.log("Allowance sufficient, skipping approve");
  }

  // 5. Compute incentive window
  const nowSec = BigInt(Math.floor(Date.now() / 1000));
  const startTime = nowSec + BigInt(START_DELAY_SECONDS);
  const endTime = startTime + BigInt(INCENTIVE_DURATION_SECONDS);

  console.log("\n--- Step 2: Create Incentive ---");
  console.log(`startTime: ${startTime} (${new Date(Number(startTime) * 1000).toISOString()})`);
  console.log(`endTime:   ${endTime} (${new Date(Number(endTime) * 1000).toISOString()})`);
  console.log(`refundee:  ${account.address}`);

  // 6. Call createIncentive
  const incentiveKey = {
    rewardToken: WCTC_ADDRESS,
    pool: SBUSD_USDC_POOL,
    startTime,
    endTime,
    refundee: account.address,
  };

  const createHash = await wallet.writeContract({
    address: STAKER_ADDRESS,
    abi: stakerABI,
    functionName: "createIncentive",
    args: [incentiveKey, REWARD_AMOUNT],
    gas: 500_000n,
  });
  const createRx = await pub.waitForTransactionReceipt({ hash: createHash });
  if (createRx.status !== "success") throw new Error("createIncentive tx reverted");

  // 7. Log success
  console.log("\n=== Incentive Created Successfully ===");
  console.log(`TX:          ${createHash}`);
  console.log(`Pool:        sbUSD/USDC (${SBUSD_USDC_POOL})`);
  console.log(`Reward:      ${formatEther(REWARD_AMOUNT)} wCTC`);
  console.log(`Start:       ${new Date(Number(startTime) * 1000).toISOString()}`);
  console.log(`End:         ${new Date(Number(endTime) * 1000).toISOString()}`);
  console.log(`Refundee:    ${account.address}`);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error("\nFAILED:", e.message || e);
    process.exit(1);
  });
