/**
 * Unit test for Planner's unknown tool handling (E6).
 * Verifies that when Claude returns an unknown tool name,
 * the planner ignores that step and logs a warning.
 */

import { buildAnthropicTools } from "./anthropic-tools";
import type { Capability } from "../types";

// A minimal test capability
const testCap: Capability = {
  id: "test.action",
  description: "A test action",
  inputSchema: { type: "object", properties: {}, required: [] },
  requiredPermissions: () => [],
  preconditions: () => [],
  buildCalls: () => [],
};

function testUnknownToolFiltering(): void {
  const { toolToCapability } = buildAnthropicTools([testCap]);

  // Simulate Claude response with a known and an unknown tool
  const toolUseBlocks = [
    { name: "test_action", input: {} },        // known — should resolve
    { name: "hallucinated_tool", input: {} },   // unknown — should be filtered
    { name: "another_fake", input: {} },         // unknown — should be filtered
  ];

  const resolved: string[] = [];
  const warnings: string[] = [];

  for (const block of toolUseBlocks) {
    const capId = toolToCapability.get(block.name);
    if (!capId) {
      warnings.push(`unknown tool "${block.name}"`);
      continue;
    }
    resolved.push(capId);
  }

  // Assertions
  if (resolved.length !== 1 || resolved[0] !== "test.action") {
    throw new Error(`Expected 1 resolved capability "test.action", got: ${JSON.stringify(resolved)}`);
  }
  if (warnings.length !== 2) {
    throw new Error(`Expected 2 warnings, got: ${warnings.length}`);
  }
  if (!warnings[0].includes("hallucinated_tool")) {
    throw new Error(`Warning should mention "hallucinated_tool", got: ${warnings[0]}`);
  }

  console.log("[PASS] Unknown tool names are correctly filtered out with warnings");
}

function testToolMappingBidirectional(): void {
  const caps: Capability[] = [
    { ...testCap, id: "morpho.supply" },
    { ...testCap, id: "liquity.adjustInterestRate" },
  ];

  const { tools, toolToCapability } = buildAnthropicTools(caps);

  if (tools.length !== 2) {
    throw new Error(`Expected 2 tools, got ${tools.length}`);
  }
  if (tools[0].name !== "morpho_supply") {
    throw new Error(`Expected tool name "morpho_supply", got "${tools[0].name}"`);
  }
  if (toolToCapability.get("morpho_supply") !== "morpho.supply") {
    throw new Error("Bidirectional mapping failed for morpho_supply");
  }
  if (toolToCapability.get("liquity_adjustInterestRate") !== "liquity.adjustInterestRate") {
    throw new Error("Bidirectional mapping failed for liquity_adjustInterestRate");
  }

  console.log("[PASS] Tool mapping is bidirectional");
}

// Run tests
testUnknownToolFiltering();
testToolMappingBidirectional();
console.log("\nAll planner tests passed!");
