import type { Address, PublicClient } from "viem";
import type { AgentConfig, LiquityBranchConfig, Snapshot } from "../types";
import { observeVault } from "./vault";
import { observeMorpho } from "./morpho";
import { observeLiquity } from "./liquity";

export async function buildSnapshot(
  publicClient: PublicClient,
  config: AgentConfig,
  branchConfig: LiquityBranchConfig,
  user: Address,
  agentAddress: Address,
  troveId: bigint
): Promise<Snapshot> {
  const tokens: Address[] = [
    config.morpho.loanToken,
    branchConfig.collToken,
  ];

  const [vault, morpho, liquity] = await Promise.all([
    observeVault(publicClient, config, user, agentAddress, tokens),
    observeMorpho(publicClient, config, user),
    observeLiquity(publicClient, branchConfig, config.agentVault, user, troveId),
  ]);

  return {
    vault,
    morpho,
    liquity,
    timestamp: Date.now(),
  };
}
