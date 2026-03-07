import type { Address, PublicClient } from "viem";
import { MorphoABI } from "../abis";
import type { AgentConfig, MorphoSnapshot } from "../types";

export async function observeMorpho(
  publicClient: PublicClient,
  config: AgentConfig,
  user: Address
): Promise<MorphoSnapshot> {
  const [position, market, isAuthorized] = await Promise.all([
    publicClient.readContract({
      address: config.morpho.core,
      abi: MorphoABI,
      functionName: "position",
      args: [config.morpho.marketId, user],
    }) as Promise<readonly [bigint, bigint, bigint]>,
    publicClient.readContract({
      address: config.morpho.core,
      abi: MorphoABI,
      functionName: "market",
      args: [config.morpho.marketId],
    }) as Promise<readonly [bigint, bigint, bigint, bigint, bigint, bigint]>,
    publicClient.readContract({
      address: config.morpho.core,
      abi: MorphoABI,
      functionName: "isAuthorized",
      args: [user, config.agentVault],
    }) as Promise<boolean>,
  ]);

  const [supplyShares] = position;
  const [totalSupplyAssets, totalSupplyShares, totalBorrowAssets] = market;

  // Calculate supply assets from shares
  const supplyAssets = totalSupplyShares > 0n
    ? (supplyShares * totalSupplyAssets) / totalSupplyShares
    : 0n;

  // Utilization rate = totalBorrow / totalSupply
  const utilizationRate = totalSupplyAssets > 0n
    ? Number(totalBorrowAssets * 10000n / totalSupplyAssets) / 10000
    : 0;

  return {
    supplyAssets,
    supplyShares,
    isAuthorized,
    utilizationRate,
  };
}
