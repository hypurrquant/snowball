import { encodeFunctionData, toFunctionSelector } from "viem";
import { AgentVaultABI, BorrowerOperationsABI } from "../abis";
import type { Capability, CheckResult, PreparedCall, ExecutionContext, AgentConfig, AgentManifest, PermissionSpec } from "../types";

const ADJUST_RATE_SEL = toFunctionSelector("adjustTroveInterestRate(uint256,uint256,uint256,uint256,uint256)");
const ADD_COLL_SEL = toFunctionSelector("addColl(uint256,uint256)");

function check(ok: boolean, message: string): CheckResult {
  return { ok, message };
}

export const liquityAddCollateral: Capability<{ troveId: string; amount: string; reason: string }> = {
  id: "liquity.addCollateral",
  description: "Liquity trove에 담보를 추가한다. vault에서 collateral token을 approve 후 addColl 실행.",
  inputSchema: {
    type: "object",
    properties: {
      troveId: { type: "string", description: "Trove ID" },
      amount: { type: "string", description: "추가 담보량 (wei 단위)" },
      reason: { type: "string", description: "담보 추가 이유" },
    },
    required: ["troveId", "amount", "reason"],
  },

  requiredPermissions(config: AgentConfig, manifest: AgentManifest): PermissionSpec[] {
    const branchName = manifest.scope.liquityBranch === "lstCTC" ? "lstCTC" : "wCTC";
    const branch = config.liquityBranches[branchName as "wCTC" | "lstCTC"];
    return [{ target: branch.borrowerOperations, selectors: [ADJUST_RATE_SEL, ADD_COLL_SEL] }];
  },

  preconditions(ctx: ExecutionContext, input: { troveId: string; amount: string; reason: string }): CheckResult[] {
    const amt = BigInt(input.amount);
    const collBalance = ctx.snapshot.vault.balances[ctx.liquityBranch.collToken.toLowerCase()] ?? 0n;
    return [
      check(ctx.snapshot.liquity.hasTrove, "user has no active trove"),
      check(ctx.snapshot.liquity.isAddManager, "AgentVault is not set as addManager"),
      check(amt > 0n, "amount must be > 0"),
      check(collBalance >= amt, `insufficient vault collateral balance: have ${collBalance}, need ${amt}`),
    ];
  },

  buildCalls(ctx: ExecutionContext, input: { troveId: string; amount: string; reason: string }): PreparedCall[] {
    const troveId = BigInt(input.troveId);
    const amt = BigInt(input.amount);

    const addCollData = encodeFunctionData({
      abi: BorrowerOperationsABI,
      functionName: "addColl",
      args: [troveId, amt],
    });

    return [
      {
        to: ctx.config.agentVault,
        abi: AgentVaultABI,
        functionName: "approveAndExecute",
        args: [ctx.user, ctx.liquityBranch.collToken, amt, ctx.liquityBranch.borrowerOperations, addCollData],
      },
    ];
  },
};
