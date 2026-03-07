import { createPublicClient, http } from "viem";

const client = createPublicClient({ transport: http("https://rpc.cc3-testnet.creditcoin.network") });

const BORROWER_OPS = "0xb637f375cbbd278ace5fdba53ad868ae7cb186ea" as const;
const TROVE_MANAGER = "0xa20f9dfeb110e11c89147b9db5adb98a7d91e70e" as const;
const troveId = 101579379792277171876805772073938414513885986678742343600649606959642402614117n;

const InterestDelegateABI = [{ type: "function", name: "getInterestIndividualDelegateOf", inputs: [{ name: "_troveId", type: "uint256" }], outputs: [{ name: "", type: "tuple", components: [{ name: "account", type: "address" }, { name: "minInterestRate", type: "uint128" }, { name: "maxInterestRate", type: "uint128" }, { name: "minInterestRateChangePeriod", type: "uint256" }] }], stateMutability: "view" }] as const;

const TroveManagerABI = [{ type: "function", name: "getLatestTroveData", inputs: [{ name: "_troveId", type: "uint256" }], outputs: [{ name: "", type: "tuple", components: [{ name: "entireDebt", type: "uint256" }, { name: "entireColl", type: "uint256" }, { name: "redistDebtGain", type: "uint256" }, { name: "redistCollGain", type: "uint256" }, { name: "accruedInterest", type: "uint256" }, { name: "recordedDebt", type: "uint256" }, { name: "annualInterestRate", type: "uint256" }, { name: "weightedRecordedDebt", type: "uint256" }, { name: "accruedBatchManagementFee", type: "uint256" }, { name: "lastInterestRateAdjTime", type: "uint256" }] }], stateMutability: "view" }] as const;

async function main() {
  const [delegate, troveData] = await Promise.all([
    client.readContract({ address: BORROWER_OPS, abi: InterestDelegateABI, functionName: "getInterestIndividualDelegateOf", args: [troveId] }) as any,
    client.readContract({ address: TROVE_MANAGER, abi: TroveManagerABI, functionName: "getLatestTroveData", args: [troveId] }) as any,
  ]);

  const now = Math.floor(Date.now() / 1000);
  const lastAdj = Number(troveData.lastInterestRateAdjTime);
  const cooldown = Number(delegate.minInterestRateChangePeriod);
  const elapsed = now - lastAdj;
  const remaining = cooldown - elapsed;

  console.log("Delegate:", delegate.account);
  console.log("Min rate:", (Number(delegate.minInterestRate) / 1e16).toFixed(2) + "%");
  console.log("Max rate:", (Number(delegate.maxInterestRate) / 1e16).toFixed(2) + "%");
  console.log("Cooldown:", cooldown + "s (" + (cooldown / 86400).toFixed(1) + " days)");
  console.log("Last adj:", new Date(lastAdj * 1000).toISOString());
  console.log("Elapsed:", elapsed + "s (" + (elapsed / 3600).toFixed(1) + " hours)");
  console.log("Remaining:", remaining > 0 ? remaining + "s (" + (remaining / 86400).toFixed(1) + " days)" : "READY");
  console.log("Current rate:", (Number(troveData.annualInterestRate) / 1e16).toFixed(2) + "%");
}
main().catch(console.error);
