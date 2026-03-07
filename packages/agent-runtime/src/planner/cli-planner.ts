import type { AgentConfig, AgentManifest, Snapshot, StrategyPlan, PlanStep, Capability } from "../types";
import { CapabilityRegistry } from "../registry";
import * as fs from "fs";
import * as path from "path";
import * as http from "http";

const DEFAULT_PROXY_URL = "http://host.docker.internal:3003";

interface CliPlanResponse {
  actions: Array<{
    capability: string;
    input: Record<string, unknown>;
    reason?: string;
  }>;
  reasoning?: string;
}

export async function plan(
  snapshot: Snapshot,
  manifest: AgentManifest,
  registry: CapabilityRegistry,
  config: AgentConfig
): Promise<{ plan: StrategyPlan; reasoning: string }> {
  // 1. Filter capabilities
  const executableCaps = registry.listExecutable(manifest, snapshot, config);

  if (executableCaps.length === 0) {
    return {
      plan: { goal: "No executable capabilities available", steps: [] },
      reasoning: "No capabilities are currently authorized.",
    };
  }

  // 2. Build prompt
  const prompt = buildPrompt(snapshot, manifest, executableCaps);

  // 3. Call claude-proxy
  const proxyUrl = process.env.CLAUDE_PROXY_URL || DEFAULT_PROXY_URL;
  const rawResponse = await callProxy(proxyUrl, prompt);

  // 4. Extract JSON from response
  const parsed = extractJson(rawResponse);

  // 5. Convert to PlanStep[]
  const capIds = new Set(executableCaps.map((c) => c.id));
  const steps: PlanStep[] = [];

  for (const action of parsed.actions) {
    if (!capIds.has(action.capability)) {
      console.warn(`[CliPlanner] Unknown capability "${action.capability}" — ignoring`);
      continue;
    }
    steps.push({
      capabilityId: action.capability,
      input: action.input,
    });
  }

  // 6. Apply maxSteps
  const maxSteps = manifest.scope.maxSteps;
  const limitedSteps = steps.slice(0, maxSteps);

  const reasoning = parsed.reasoning || "";

  return {
    plan: {
      goal: reasoning || "DeFi position management",
      steps: limitedSteps,
    },
    reasoning,
  };
}

function buildPrompt(
  snapshot: Snapshot,
  manifest: AgentManifest,
  capabilities: Capability[]
): string {
  // Load system prompt
  let systemPrompt = "You are a DeFi portfolio management agent.";
  if (manifest.llm.systemPromptFile) {
    try {
      const promptPath = path.resolve(
        path.dirname(process.env.MANIFEST_PATH || "."),
        manifest.llm.systemPromptFile
      );
      systemPrompt = fs.readFileSync(promptPath, "utf-8");
    } catch {
      // Use default
    }
  }

  const capList = capabilities
    .map((c) => {
      const schema = JSON.stringify(c.inputSchema.properties || {});
      return `- ${c.id}: ${c.description} (input: ${schema})`;
    })
    .join("\n");

  const state = buildStateMessage(snapshot);

  return `${systemPrompt}

${state}

## Available Actions
${capList}

## Response Rules
Respond with ONLY a JSON object. No markdown, no code blocks, no explanation.
If no action is needed, return {"actions":[],"reasoning":"explanation"}.

Format:
{"actions":[{"capability":"<id>","input":{...},"reason":"why"}],"reasoning":"overall reasoning"}`;
}

function buildStateMessage(snapshot: Snapshot): string {
  return [
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
    `- Trove ID: ${snapshot.liquity.troveId.toString()}`,
    `- Collateral: ${snapshot.liquity.collateral.toString()} wei`,
    `- Debt: ${snapshot.liquity.debt.toString()} wei`,
    `- Annual interest rate: ${snapshot.liquity.annualInterestRate.toString()} (${formatRate(snapshot.liquity.annualInterestRate)})`,
    `- Market avg interest rate: ${snapshot.liquity.avgInterestRate.toString()} (${formatRate(snapshot.liquity.avgInterestRate)})`,
    `- Interest delegate set: ${snapshot.liquity.isInterestDelegate}`,
    `- Add manager set: ${snapshot.liquity.isAddManager}`,
  ].join("\n");
}

function extractJson(raw: string): CliPlanResponse {
  // Try to find outermost JSON object
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");

  if (start === -1 || end === -1 || end <= start) {
    console.warn(`[CliPlanner] No JSON found in response, returning empty actions`);
    return { actions: [], reasoning: raw.slice(0, 200) };
  }

  try {
    const parsed = JSON.parse(raw.slice(start, end + 1));
    if (!Array.isArray(parsed.actions)) {
      return { actions: [], reasoning: parsed.reasoning || "" };
    }
    return parsed as CliPlanResponse;
  } catch (err) {
    console.warn(`[CliPlanner] JSON parse failed: ${err}`);
    return { actions: [], reasoning: raw.slice(0, 200) };
  }
}

function formatRate(wei: bigint): string {
  // 1e18 = 100%, so divide by 1e16 to get percentage
  const pct = Number(wei) / 1e16;
  return `${pct.toFixed(2)}%`;
}

function callProxy(baseUrl: string, prompt: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = new URL("/plan", baseUrl);
    const payload = JSON.stringify({
      prompt,
      model: process.env.CODEX_MODEL,
      reasoningEffort: process.env.CODEX_REASONING_EFFORT,
    });

    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(payload),
      },
      timeout: 150_000, // 2.5min (proxy has 3min timeout for CLI)
    };

    const req = http.request(options, (res) => {
      let data = "";
      res.on("data", (chunk: Buffer) => (data += chunk));
      res.on("end", () => {
        if (res.statusCode !== 200) {
          reject(new Error(`Codex proxy error (${res.statusCode}): ${data}`));
          return;
        }
        try {
          const { response, error } = JSON.parse(data);
          if (error) {
            reject(new Error(`Codex proxy: ${error}`));
          } else {
            resolve(response);
          }
        } catch {
          reject(new Error(`Invalid proxy response: ${data.slice(0, 200)}`));
        }
      });
    });

    req.on("error", (err) => reject(new Error(`Codex proxy unreachable: ${err.message}`)));
    req.on("timeout", () => {
      req.destroy();
      reject(new Error("Codex proxy request timed out"));
    });

    req.write(payload);
    req.end();
  });
}
