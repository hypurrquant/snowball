import Anthropic from "@anthropic-ai/sdk";
import type { AgentConfig, AgentManifest, Snapshot, StrategyPlan, PlanStep } from "../types";
import { CapabilityRegistry } from "../registry";
import { buildAnthropicTools } from "./anthropic-tools";
import { loadAnthropicApiKey } from "../config";
import * as fs from "fs";
import * as path from "path";

export async function plan(
  snapshot: Snapshot,
  manifest: AgentManifest,
  registry: CapabilityRegistry,
  config: AgentConfig
): Promise<{ plan: StrategyPlan; reasoning: string }> {
  const apiKey = loadAnthropicApiKey();
  const client = new Anthropic({ apiKey, timeout: 60_000 });

  // 1. Filter capabilities by current permission/authorization
  const executableCaps = registry.listExecutable(manifest, snapshot, config);

  if (executableCaps.length === 0) {
    return {
      plan: { goal: "No executable capabilities available", steps: [] },
      reasoning: "No capabilities are currently authorized. The user needs to set up permissions first.",
    };
  }

  // 2. Build Claude tools from executable capabilities
  const { tools, toolToCapability } = buildAnthropicTools(executableCaps);

  // 3. Load system prompt
  let systemPrompt = "You are a DeFi portfolio management agent.";
  if (manifest.llm.systemPromptFile) {
    try {
      const promptPath = path.resolve(
        path.dirname(process.env.MANIFEST_PATH || "."),
        manifest.llm.systemPromptFile
      );
      systemPrompt = fs.readFileSync(promptPath, "utf-8");
    } catch {
      // Use default system prompt if file not found
    }
  }

  // 4. Build state message for Claude
  const stateMessage = buildStateMessage(snapshot);

  // 5. Call Claude API
  const response = await client.messages.create({
    model: manifest.llm.model,
    max_tokens: 1024,
    system: systemPrompt,
    tools: tools.map((t) => ({
      name: t.name,
      description: t.description,
      input_schema: t.input_schema as Anthropic.Tool.InputSchema,
    })),
    messages: [
      {
        role: "user",
        content: stateMessage,
      },
    ],
  });

  // 6. Extract tool_use blocks → PlanStep[]
  const steps: PlanStep[] = [];
  let reasoning = "";

  for (const block of response.content) {
    if (block.type === "text") {
      reasoning += block.text;
    } else if (block.type === "tool_use") {
      const capabilityId = toolToCapability.get(block.name);
      if (!capabilityId) {
        console.warn(`[Planner] WARNING: unknown tool "${block.name}" — ignoring (possible hallucination)`);
        continue;
      }
      steps.push({
        capabilityId,
        input: block.input as Record<string, unknown>,
      });
    }
  }

  // 7. Apply maxSteps limit
  const maxSteps = manifest.scope.maxSteps;
  const limitedSteps = steps.slice(0, maxSteps);
  if (steps.length > maxSteps) {
    console.warn(`[Planner] Claude selected ${steps.length} tools but maxSteps=${maxSteps}. Keeping first ${maxSteps}.`);
  }

  return {
    plan: {
      goal: reasoning || "DeFi position management",
      steps: limitedSteps,
    },
    reasoning,
  };
}

function buildStateMessage(snapshot: Snapshot): string {
  const lines: string[] = [
    "## Current Portfolio State",
    "",
    "### Vault",
    `- Balances: ${JSON.stringify(
      Object.fromEntries(
        Object.entries(snapshot.vault.balances).map(([k, v]) => [k, v.toString()])
      )
    )}`,
    `- Active permissions: ${snapshot.vault.permissions.filter((p) => p.active).length}`,
    "",
    "### Morpho",
    `- Supply position: ${snapshot.morpho.supplyAssets.toString()} wei`,
    `- Authorization: ${snapshot.morpho.isAuthorized ? "yes" : "no"}`,
    `- Utilization rate: ${(snapshot.morpho.utilizationRate * 100).toFixed(2)}%`,
    "",
    "### Liquity",
    `- Has trove: ${snapshot.liquity.hasTrove}`,
    `- Collateral: ${snapshot.liquity.collateral.toString()} wei`,
    `- Debt: ${snapshot.liquity.debt.toString()} wei`,
    `- Annual interest rate: ${snapshot.liquity.annualInterestRate.toString()} (${formatRate(snapshot.liquity.annualInterestRate)})`,
    `- Market avg interest rate: ${snapshot.liquity.avgInterestRate.toString()} (${formatRate(snapshot.liquity.avgInterestRate)})`,
    `- Add manager set: ${snapshot.liquity.isAddManager}`,
    `- Interest delegate set: ${snapshot.liquity.isInterestDelegate}`,
    "",
    "Based on this state, decide what action to take. If no action is needed, respond without using any tools.",
  ];
  return lines.join("\n");
}

function formatRate(wei: bigint): string {
  const pct = Number(wei) / 1e16;
  return `${pct.toFixed(2)}%`;
}
