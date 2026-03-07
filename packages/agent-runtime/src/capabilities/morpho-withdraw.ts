import { encodeFunctionData, toFunctionSelector } from "viem";
import { AgentVaultABI, MorphoABI } from "../abis";
import type { Capability, CheckResult, PreparedCall, ExecutionContext, AgentConfig, AgentManifest, PermissionSpec } from "../types";

const SUPPLY_SEL = toFunctionSelector("supply((address,address,address,address,uint256),uint256,uint256,address,bytes)");
const WITHDRAW_SEL = toFunctionSelector("withdraw((address,address,address,address,uint256),uint256,uint256,address,address)");

function check(ok: boolean, message: string): CheckResult {
  return { ok, message };
}

export const morphoWithdraw: Capability<{ amount: string; reason: string }> = {
  id: "morpho.withdraw",
  description: "Morpho 마켓에서 공급한 토큰을 인출한다. user 지갑으로 직접 반환.",
  inputSchema: {
    type: "object",
    properties: {
      amount: { type: "string", description: "인출량 (wei 단위)" },
      reason: { type: "string", description: "인출 판단 이유" },
    },
    required: ["amount", "reason"],
  },

  requiredPermissions(config: AgentConfig, _manifest: AgentManifest): PermissionSpec[] {
    return [{ target: config.morpho.core, selectors: [SUPPLY_SEL, WITHDRAW_SEL] }];
  },

  preconditions(ctx: ExecutionContext, input: { amount: string; reason: string }): CheckResult[] {
    const amt = BigInt(input.amount);
    return [
      check(amt > 0n, "amount must be > 0"),
      check(ctx.snapshot.morpho.supplyAssets >= amt, `insufficient supply: have ${ctx.snapshot.morpho.supplyAssets}, need ${amt}`),
      check(ctx.snapshot.morpho.isAuthorized, "Morpho authorization missing — user must call setAuthorization(AgentVault, true)"),
    ];
  },

  buildCalls(ctx: ExecutionContext, input: { amount: string; reason: string }): PreparedCall[] {
    const amt = BigInt(input.amount);
    const marketParams = {
      loanToken: ctx.config.morpho.loanToken,
      collateralToken: ctx.config.morpho.collateralToken,
      oracle: ctx.config.morpho.oracle,
      irm: ctx.config.morpho.irm,
      lltv: ctx.config.morpho.lltv,
    };

    const withdrawData = encodeFunctionData({
      abi: MorphoABI,
      functionName: "withdraw",
      args: [marketParams, amt, 0n, ctx.user, ctx.user],
    });

    return [
      {
        to: ctx.config.agentVault,
        abi: AgentVaultABI,
        functionName: "executeOnBehalf",
        args: [ctx.user, ctx.config.morpho.core, withdrawData],
      },
    ];
  },
};
