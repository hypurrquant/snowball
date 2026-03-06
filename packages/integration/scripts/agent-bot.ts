import "dotenv/config";
import * as fs from "fs";
import * as path from "path";
import type { Address } from "viem";
import { AgentRuntime } from "../../agent-runtime/src/runtime.js";
import type { AgentManifest } from "../../agent-runtime/src/types.js";

function parseArgs(): { user: Address; manifestPath: string; troveId: bigint } {
  const args = process.argv.slice(2);
  let user: string | undefined;
  let manifestPath: string | undefined;
  let troveId = 0n;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--user" && args[i + 1]) {
      user = args[++i];
    } else if (args[i] === "--manifest" && args[i + 1]) {
      manifestPath = args[++i];
    } else if (args[i] === "--troveId" && args[i + 1]) {
      troveId = BigInt(args[++i]);
    }
  }

  if (!user || !manifestPath) {
    console.error("Usage: npx tsx packages/integration/scripts/agent-bot.ts --user <address> --manifest <path> [--troveId <id>]");
    process.exit(1);
  }

  return { user: user as Address, manifestPath, troveId };
}

async function main(): Promise<void> {
  const { user, manifestPath, troveId } = parseArgs();

  // Load manifest
  const resolvedPath = path.resolve(manifestPath);
  if (!fs.existsSync(resolvedPath)) {
    console.error(`Manifest file not found: ${resolvedPath}`);
    process.exit(1);
  }

  const manifest: AgentManifest = JSON.parse(fs.readFileSync(resolvedPath, "utf-8"));
  process.env.MANIFEST_PATH = resolvedPath;

  console.log("═══════════════════════════════════════════");
  console.log(`Agent Bot — ${manifest.name} v${manifest.version}`);
  console.log(`User: ${user}`);
  console.log(`Trove ID: ${troveId}`);
  console.log(`Capabilities: ${manifest.allowedCapabilities.join(", ")}`);
  console.log("═══════════════════════════════════════════");

  const runtime = new AgentRuntime();
  const result = await runtime.run(manifest, user, troveId);

  console.log("\n─── Result ───");
  console.log(`Status: ${result.status}`);
  console.log(`Run ID: ${result.runId}`);

  if (result.plan) {
    console.log(`\nPlan: ${result.plan.goal}`);
    console.log(`Steps: ${result.plan.steps.length}`);
    for (const step of result.plan.steps) {
      console.log(`  - ${step.capabilityId}: ${JSON.stringify(step.input)}`);
    }
  }

  if (result.txHashes.length > 0) {
    console.log(`\nTransactions:`);
    for (const hash of result.txHashes) {
      console.log(`  ${hash}`);
    }
  }

  if (result.reasoning) {
    console.log(`\nReasoning: ${result.reasoning}`);
  }

  if (result.errors.length > 0) {
    console.log(`\nErrors:`);
    for (const err of result.errors) {
      console.error(`  ${err}`);
    }
  }

  console.log(`\nLogs:`);
  for (const log of result.logs) {
    console.log(`  ${log}`);
  }

  process.exit(result.status === "error" ? 1 : 0);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
