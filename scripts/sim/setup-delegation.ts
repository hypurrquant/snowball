/**
 * Agent 위임 설정 스크립트
 *
 * User(#5)의 Liquity Trove에 대해 AgentVault 위임을 설정한다:
 * 1. AgentVault에 grantPermission (agent EOA가 adjustTroveInterestRate/addColl 호출 가능)
 * 2. Liquity에 setInterestIndividualDelegate (AgentVault가 이자율 조정 가능)
 *
 * 실행:
 *   NODE_PATH=apps/web/node_modules npx tsx scripts/sim/setup-delegation.ts
 */

import {
  createPublicClient,
  createWalletClient,
  http,
  parseEther,
  keccak256,
  encodeAbiParameters,
  toFunctionSelector,
  maxUint256,
  type Address,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { defineChain } from "viem";
import accounts from "../simulation-accounts.json";

const creditcoinTestnet = defineChain({
  id: 102031,
  name: "Creditcoin Testnet",
  nativeCurrency: { name: "CTC", symbol: "CTC", decimals: 18 },
  rpcUrls: { default: { http: ["https://rpc.cc3-testnet.creditcoin.network"] } },
});

// ─── Addresses ───
const AGENT_VAULT = "0x7bca6fb903cc564d92ed5384512976c94f2730d7" as Address;
const BORROWER_OPS = "0xb637f375cbbd278ace5fdba53ad868ae7cb186ea" as Address;
const TROVE_MANAGER = "0xa20f9dfeb110e11c89147b9db5adb98a7d91e70e" as Address;
const WCTC = "0xca69344e2917f026ef4a5ace5d7b122343fc8528" as Address;

// Agent EOA = deployer (AGENT_PRIVATE_KEY in docker .env)
const AGENT_EOA = accounts.deployer.address as Address;

// User = Account #5
const user = accounts.accounts[4]; // index 5
const userAccount = privateKeyToAccount(user.privateKey as `0x${string}`);

const RPC = "https://rpc.cc3-testnet.creditcoin.network";

const publicClient = createPublicClient({
  chain: creditcoinTestnet,
  transport: http(RPC),
});

const walletClient = createWalletClient({
  chain: creditcoinTestnet,
  transport: http(RPC),
  account: userAccount,
});

// ─── ABIs ───
const AgentVaultABI = [
  { type: "function", name: "grantPermission", inputs: [{ name: "agent", type: "address" }, { name: "targets", type: "address[]" }, { name: "functions", type: "bytes4[]" }, { name: "expiry", type: "uint256" }, { name: "tokenCaps", type: "tuple[]", components: [{ name: "token", type: "address" }, { name: "cap", type: "uint256" }] }], outputs: [], stateMutability: "nonpayable" },
  { type: "function", name: "getPermission", inputs: [{ name: "user", type: "address" }, { name: "agent", type: "address" }, { name: "tokens", type: "address[]" }], outputs: [{ name: "", type: "tuple", components: [{ name: "allowedTargets", type: "address[]" }, { name: "allowedFunctions", type: "bytes4[]" }, { name: "expiry", type: "uint256" }, { name: "active", type: "bool" }, { name: "tokenAllowances", type: "tuple[]", components: [{ name: "token", type: "address" }, { name: "cap", type: "uint256" }, { name: "spent", type: "uint256" }] }] }], stateMutability: "view" },
] as const;

const InterestDelegateABI = [
  { type: "function", name: "setInterestIndividualDelegate", inputs: [{ name: "_troveId", type: "uint256" }, { name: "_delegate", type: "address" }, { name: "_minInterestRate", type: "uint128" }, { name: "_maxInterestRate", type: "uint128" }, { name: "_newAnnualInterestRate", type: "uint256" }, { name: "_upperHint", type: "uint256" }, { name: "_lowerHint", type: "uint256" }, { name: "_maxUpfrontFee", type: "uint256" }, { name: "_minInterestRateChangePeriod", type: "uint256" }], outputs: [], stateMutability: "nonpayable" },
  { type: "function", name: "getInterestIndividualDelegateOf", inputs: [{ name: "_troveId", type: "uint256" }], outputs: [{ name: "", type: "tuple", components: [{ name: "account", type: "address" }, { name: "minInterestRate", type: "uint128" }, { name: "maxInterestRate", type: "uint128" }, { name: "minInterestRateChangePeriod", type: "uint256" }] }], stateMutability: "view" },
] as const;

const TroveManagerABI = [
  { type: "function", name: "getTroveStatus", inputs: [{ name: "troveId", type: "uint256" }], outputs: [{ type: "uint8" }], stateMutability: "view" },
] as const;

// ─── Helpers ───
function computeTroveId(owner: Address, ownerIndex: bigint): bigint {
  // BorrowerOperations: keccak256(abi.encode(msg.sender, _owner, _ownerIndex))
  // When owner calls directly: msg.sender == owner
  return BigInt(
    keccak256(
      encodeAbiParameters(
        [{ type: "address" }, { type: "address" }, { type: "uint256" }],
        [owner, owner, ownerIndex],
      ),
    ),
  );
}

async function findTroveId(owner: Address): Promise<bigint> {
  for (let i = 0n; i < 10n; i++) {
    const id = computeTroveId(owner, i);
    const status = await publicClient.readContract({
      address: TROVE_MANAGER,
      abi: TroveManagerABI,
      functionName: "getTroveStatus",
      args: [id],
    });
    if (Number(status) === 1) return id; // 1 = active
  }
  throw new Error(`No active trove found for ${owner}`);
}

async function main() {
  console.log("============================================================");
  console.log("  Agent Delegation Setup");
  console.log("============================================================");
  console.log(`  User:       ${user.label} (#${user.index}) ${userAccount.address}`);
  console.log(`  Agent EOA:  ${AGENT_EOA}`);
  console.log(`  AgentVault: ${AGENT_VAULT}`);
  console.log("============================================================\n");

  // Step 0: Find trove
  console.log("[0] Finding User trove...");
  const troveId = await findTroveId(userAccount.address);
  console.log(`    Trove ID: ${troveId}\n`);

  // Step 0.5: Verify contract is alive
  console.log("[0.5] Checking AgentVault contract...");
  const code = await publicClient.getCode({ address: AGENT_VAULT });
  console.log(`    Code length: ${code?.length ?? 0}`);

  const existingPerm = await publicClient.readContract({
    address: AGENT_VAULT,
    abi: AgentVaultABI,
    functionName: "getPermission",
    args: [userAccount.address, AGENT_EOA, []],
  });
  console.log(`    Existing perm active: ${existingPerm.active}`);
  console.log(`    Existing targets: ${JSON.stringify(existingPerm.allowedTargets)}`);
  console.log(`    Existing functions: ${JSON.stringify(existingPerm.allowedFunctions)}`);

  // Step 1: Grant permission on AgentVault
  console.log("\n[1] Granting AgentVault permission...");
  const selectors = [
    toFunctionSelector("adjustTroveInterestRate(uint256,uint256,uint256,uint256,uint256)"),
    toFunctionSelector("addColl(uint256,uint256)"),
  ] as `0x${string}`[];
  const expiry = BigInt(Math.floor(Date.now() / 1000) + 90 * 24 * 3600); // 90 days

  // Try with expiry=0 (no expiry) and empty tokenCaps to isolate issue
  try {
    await publicClient.simulateContract({
      address: AGENT_VAULT,
      abi: AgentVaultABI,
      functionName: "grantPermission",
      args: [AGENT_EOA, [BORROWER_OPS], selectors, 0n, []],
      account: userAccount,
    });
    console.log("    Simulation OK (expiry=0, no tokenCaps)");
  } catch (err: any) {
    console.error("    Simulation FAILED (expiry=0):", err.cause?.data || err.cause?.reason || err.shortMessage);
    // Check if it could be a different ABI version
    console.log("    Trying raw encodeFunctionData...");
  }

  const hash1 = await walletClient.writeContract({
    address: AGENT_VAULT,
    abi: AgentVaultABI,
    functionName: "grantPermission",
    args: [
      AGENT_EOA,
      [BORROWER_OPS],
      selectors,
      expiry,
      [{ token: WCTC, cap: parseEther("100") }],
    ],
  });
  const r1 = await publicClient.waitForTransactionReceipt({ hash: hash1 });
  console.log(`    TX: ${hash1} (${r1.status})`);
  console.log(`    Targets: [BorrowerOperations]`);
  console.log(`    Functions: [adjustTroveInterestRate, addColl]`);
  console.log(`    Expiry: 90 days\n`);

  // Step 2: Set interest delegate on Liquity
  console.log("[2] Setting interest delegate on Liquity...");
  const minRate = parseEther("0.005"); // 0.5%
  const maxRate = parseEther("0.20");  // 20%

  const hash2 = await walletClient.writeContract({
    address: BORROWER_OPS,
    abi: InterestDelegateABI,
    functionName: "setInterestIndividualDelegate",
    args: [
      troveId,
      AGENT_VAULT,
      minRate,
      maxRate,
      0n,          // don't change current rate
      0n,          // upperHint
      0n,          // lowerHint
      maxUint256,  // maxUpfrontFee
      0n,          // minInterestRateChangePeriod (no cooldown for testing)
    ],
  });
  const r2 = await publicClient.waitForTransactionReceipt({ hash: hash2 });
  console.log(`    TX: ${hash2} (${r2.status})`);
  console.log(`    Delegate: AgentVault`);
  console.log(`    Rate range: 0.5% ~ 20%\n`);

  // Step 3: Verify
  console.log("[3] Verifying delegation...");
  const perm = await publicClient.readContract({
    address: AGENT_VAULT,
    abi: AgentVaultABI,
    functionName: "getPermission",
    args: [userAccount.address, AGENT_EOA, [WCTC]],
  });
  console.log(`    Permission active: ${perm.active}`);
  console.log(`    Targets: ${perm.allowedTargets}`);
  console.log(`    Functions: ${perm.allowedFunctions}`);

  const delegate = await publicClient.readContract({
    address: BORROWER_OPS,
    abi: InterestDelegateABI,
    functionName: "getInterestIndividualDelegateOf",
    args: [troveId],
  });
  console.log(`    Interest delegate: ${delegate.account}`);
  console.log(`    Min rate: ${Number(delegate.minInterestRate) / 1e16}%`);
  console.log(`    Max rate: ${Number(delegate.maxInterestRate) / 1e16}%`);

  console.log("\n============================================================");
  console.log("  DELEGATION SETUP COMPLETE");
  console.log("============================================================");
}

main().catch((err) => {
  console.error("FAILED:", err);
  process.exit(1);
});
