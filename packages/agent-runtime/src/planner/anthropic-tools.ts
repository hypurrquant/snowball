import type { Capability, JsonSchema } from "../types";

export interface AnthropicTool {
  name: string;
  description: string;
  input_schema: JsonSchema;
}

export interface ToolMapping {
  tools: AnthropicTool[];
  toolToCapability: Map<string, string>;
}

/**
 * Convert Capability[] → Claude tools[] with bidirectional mapping.
 * Capability ID "morpho.supply" → tool name "morpho_supply"
 */
export function buildAnthropicTools(capabilities: Capability[]): ToolMapping {
  const toolToCapability = new Map<string, string>();
  const tools: AnthropicTool[] = capabilities.map((cap) => {
    const toolName = cap.id.replace(/\./g, "_");
    toolToCapability.set(toolName, cap.id);
    return {
      name: toolName,
      description: cap.description,
      input_schema: cap.inputSchema,
    };
  });
  return { tools, toolToCapability };
}
