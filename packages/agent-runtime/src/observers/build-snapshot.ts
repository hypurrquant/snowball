import type { Address, PublicClient } from "viem";
import type { AgentConfig, Snapshot } from "../types.js";
import { observeVault } from "./vault.js";
import { observeMorpho } from "./morpho.js";
import { observeLiquity } from "./liquity.js";

export async function buildSnapshot(
  publicClient: PublicClient,
  config: AgentConfig,
  user: Address,
  agentAddress: Address,
  troveId: bigint
): Promise<Snapshot> {
  const tokens: Address[] = [
    config.morpho.loanToken,
    config.liquity.collToken,
  ];

  const [vault, morpho, liquity] = await Promise.all([
    observeVault(publicClient, config, user, agentAddress, tokens),
    observeMorpho(publicClient, config, user),
    observeLiquity(publicClient, config, user, troveId),
  ]);

  return {
    vault,
    morpho,
    liquity,
    timestamp: Date.now(),
  };
}
