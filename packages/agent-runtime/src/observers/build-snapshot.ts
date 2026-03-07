import type { Address, PublicClient } from "viem";
import type { AgentConfig, Snapshot } from "../types";
import { observeVault } from "./vault";
import { observeMorpho } from "./morpho";
import { observeLiquity } from "./liquity";

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
