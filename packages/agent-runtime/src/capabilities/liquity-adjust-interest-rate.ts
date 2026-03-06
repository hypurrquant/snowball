import { encodeFunctionData } from "viem";
import { AgentVaultABI, BorrowerOperationsABI } from "../abis.js";
import type { Capability, CheckResult, PreparedCall, ExecutionContext, AgentConfig, PermissionSpec } from "../types.js";
import { findHints } from "../utils/liquity-hints.js";

const COOLDOWN_PERIOD = 7n * 24n * 60n * 60n; // 7 days in seconds

function check(ok: boolean, message: string): CheckResult {
  return { ok, message };
}

export const liquityAdjustInterestRate: Capability<{ troveId: string; newRate: string; reason: string }> = {
  id: "liquity.adjustInterestRate",
  description: "Liquity trove의 이자율을 조정한다. delegate 권한이 필요하며, cooldown 기간 경과 후에만 가능.",
  inputSchema: {
    type: "object",
    properties: {
      troveId: { type: "string", description: "Trove ID" },
      newRate: { type: "string", description: "새 연간 이자율 (wei 단위, 1e18 = 100%)" },
      reason: { type: "string", description: "이자율 조정 이유" },
    },
    required: ["troveId", "newRate", "reason"],
  },

  requiredPermissions(config: AgentConfig): PermissionSpec[] {
    return [{ target: config.liquity.borrowerOperations, selectors: ["adjustTroveInterestRate", "addColl"] }];
  },

  preconditions(ctx: ExecutionContext, input: { troveId: string; newRate: string; reason: string }): CheckResult[] {
    const now = BigInt(Math.floor(Date.now() / 1000));
    const timeSinceLastAdj = now - ctx.snapshot.liquity.lastInterestRateAdjTime;
    return [
      check(ctx.snapshot.liquity.hasTrove, "user has no active trove"),
      check(ctx.snapshot.liquity.isInterestDelegate, "AgentVault is not set as interest delegate"),
      check(timeSinceLastAdj > COOLDOWN_PERIOD, `cooldown not elapsed: ${timeSinceLastAdj}s since last adjustment (need ${COOLDOWN_PERIOD}s)`),
      check(BigInt(input.newRate) > 0n, "new rate must be > 0"),
    ];
  },

  buildCalls(ctx: ExecutionContext, input: { troveId: string; newRate: string; reason: string }): PreparedCall[] {
    // Note: hints must be pre-computed async. For buildCalls (sync), we use 0/0 as placeholder.
    // The executor should call buildCallsAsync instead for production use.
    const troveId = BigInt(input.troveId);
    const newRate = BigInt(input.newRate);
    const maxUpfrontFee = 10n ** 18n; // 1 sbUSD max fee

    const adjustData = encodeFunctionData({
      abi: BorrowerOperationsABI,
      functionName: "adjustTroveInterestRate",
      args: [troveId, newRate, 0n, 0n, maxUpfrontFee],
    });

    return [
      {
        to: ctx.config.agentVault,
        abi: AgentVaultABI,
        functionName: "executeOnBehalf",
        args: [ctx.user, ctx.config.liquity.borrowerOperations, adjustData],
      },
    ];
  },
};

// Attach async builder to the capability
liquityAdjustInterestRate.buildCallsAsync = buildCallsWithHints;

/**
 * Async version of buildCalls that computes hints on-chain.
 */
export async function buildCallsWithHints(
  ctx: ExecutionContext,
  input: { troveId: string; newRate: string; reason: string }
): Promise<PreparedCall[]> {
  const troveId = BigInt(input.troveId);
  const newRate = BigInt(input.newRate);
  const maxUpfrontFee = 10n ** 18n;

  const { upperHint, lowerHint } = await findHints(
    ctx.publicClient,
    ctx.config,
    newRate
  );

  const adjustData = encodeFunctionData({
    abi: BorrowerOperationsABI,
    functionName: "adjustTroveInterestRate",
    args: [troveId, newRate, upperHint, lowerHint, maxUpfrontFee],
  });

  return [
    {
      to: ctx.config.agentVault,
      abi: AgentVaultABI,
      functionName: "executeOnBehalf",
      args: [ctx.user, ctx.config.liquity.borrowerOperations, adjustData],
    },
  ];
}
