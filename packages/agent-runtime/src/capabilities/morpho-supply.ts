import { encodeFunctionData } from "viem";
import { AgentVaultABI, MorphoABI } from "../abis.js";
import type { Capability, CheckResult, PreparedCall, ExecutionContext, AgentConfig, PermissionSpec } from "../types.js";

function check(ok: boolean, message: string): CheckResult {
  return { ok, message };
}

export const morphoSupply: Capability<{ amount: string; reason: string }> = {
  id: "morpho.supply",
  description: "Morpho 마켓에 토큰을 공급한다. vault에서 loanToken을 approve 후 user 명의로 supply.",
  inputSchema: {
    type: "object",
    properties: {
      amount: { type: "string", description: "공급량 (wei 단위)" },
      reason: { type: "string", description: "공급 판단 이유" },
    },
    required: ["amount", "reason"],
  },

  requiredPermissions(config: AgentConfig): PermissionSpec[] {
    return [{ target: config.morpho.core, selectors: ["supply", "withdraw"] }];
  },

  preconditions(ctx: ExecutionContext, input: { amount: string; reason: string }): CheckResult[] {
    const amt = BigInt(input.amount);
    const loanBalance = ctx.snapshot.vault.balances[ctx.config.morpho.loanToken.toLowerCase()] ?? 0n;
    return [
      check(amt > 0n, "amount must be > 0"),
      check(loanBalance >= amt, `insufficient vault balance: have ${loanBalance}, need ${amt}`),
      check(ctx.snapshot.vault.permissions.some((p) => p.active), "vault permission not active"),
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

    const supplyData = encodeFunctionData({
      abi: MorphoABI,
      functionName: "supply",
      args: [marketParams, amt, 0n, ctx.user, "0x"],
    });

    return [
      {
        to: ctx.config.agentVault,
        abi: AgentVaultABI,
        functionName: "approveFromVault",
        args: [ctx.user, ctx.config.morpho.loanToken, ctx.config.morpho.core, amt],
      },
      {
        to: ctx.config.agentVault,
        abi: AgentVaultABI,
        functionName: "executeOnBehalf",
        args: [ctx.user, ctx.config.morpho.core, supplyData],
      },
      {
        to: ctx.config.agentVault,
        abi: AgentVaultABI,
        functionName: "approveFromVault",
        args: [ctx.user, ctx.config.morpho.loanToken, ctx.config.morpho.core, 0n],
      },
    ];
  },
};
