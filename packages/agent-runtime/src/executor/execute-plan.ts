import type { WalletClient, PublicClient, Address } from "viem";
import type { AgentConfig, AgentManifest, StrategyPlan, ExecutionContext, RunResult, Snapshot } from "../types";
import { CapabilityRegistry } from "../registry";
import { buildSnapshot } from "../observers/build-snapshot";

export async function executePlan(
  plan: StrategyPlan,
  ctx: ExecutionContext,
  registry: CapabilityRegistry,
  manifest: AgentManifest,
  agentAddress: Address,
  troveId: bigint
): Promise<Pick<RunResult, "txHashes" | "logs" | "errors" | "status">> {
  const txHashes: string[] = [];
  const logs: string[] = [];
  const errors: string[] = [];

  if (plan.steps.length === 0) {
    logs.push("[Executor] No steps to execute — no_action");
    return { txHashes, logs, errors, status: "no_action" };
  }

  for (const step of plan.steps) {
    const capability = registry.get(step.capabilityId);
    if (!capability) {
      errors.push(`[Executor] Unknown capability: ${step.capabilityId}`);
      return { txHashes, logs, errors, status: "error" };
    }

    logs.push(`[Executor] Step: ${step.capabilityId}`);

    // 1. Check preconditions
    const checks = capability.preconditions(ctx, step.input);
    const failed = checks.filter((c) => !c.ok);
    if (failed.length > 0) {
      const failMessages = failed.map((c) => c.message).join("; ");
      if (manifest.riskPolicy.abortOnFailedPrecondition) {
        errors.push(`[Executor] Precondition failed — aborting run: ${failMessages}`);
        return { txHashes, logs, errors, status: "aborted" };
      }
      logs.push(`[Executor] Precondition warnings (continuing): ${failMessages}`);
    }

    // 2. Build calls (prefer async builder when available for on-chain lookups like hints)
    const calls = capability.buildCallsAsync
      ? await capability.buildCallsAsync(ctx, step.input)
      : capability.buildCalls(ctx, step.input);
    logs.push(`[Executor] Built ${calls.length} PreparedCall(s)`);

    // 3. Send transactions sequentially
    for (const call of calls) {
      try {
        logs.push(`[Executor] Sending tx: ${call.functionName} → ${call.to}`);
        const hash = await ctx.walletClient.writeContract({
          address: call.to,
          abi: call.abi,
          functionName: call.functionName,
          args: call.args,
          chain: ctx.walletClient.chain,
          account: ctx.walletClient.account!,
        });
        txHashes.push(hash);
        logs.push(`[Executor] tx confirmed: ${hash}`);

        // Wait for receipt
        const receipt = await (ctx.publicClient as PublicClient).waitForTransactionReceipt({ hash });
        if (receipt.status === "reverted") {
          errors.push(`[Executor] tx reverted: ${hash}`);
          return { txHashes, logs, errors, status: "error" };
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        errors.push(`[Executor] tx failed: ${call.functionName} — ${message}`);
        return { txHashes, logs, errors, status: "error" };
      }
    }

    // 4. Refresh snapshot for next step
    try {
      ctx.snapshot = await buildSnapshot(
        ctx.publicClient,
        ctx.config,
        ctx.liquityBranch,
        ctx.user,
        agentAddress,
        troveId
      );
      logs.push("[Executor] Snapshot refreshed");
    } catch {
      logs.push("[Executor] Warning: failed to refresh snapshot");
    }
  }

  return { txHashes, logs, errors, status: "success" };
}
