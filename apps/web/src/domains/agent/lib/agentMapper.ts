import type { AgentInfo } from "../types";

export function mapAgentResults(
  data: readonly { status: string; result?: unknown }[] | undefined,
  ids: readonly bigint[],
): Array<AgentInfo & { id: bigint }> {
  return (
    data
      ?.map((d, i) => {
        if (d.status !== "success" || !d.result) return null;
        const info = d.result as unknown as AgentInfo;
        return { id: ids[i], ...info };
      })
      .filter(Boolean) as Array<AgentInfo & { id: bigint }> | undefined
  ) ?? [];
}
