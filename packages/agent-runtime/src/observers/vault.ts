import type { Address, PublicClient } from "viem";
import { AgentVaultABI, ERC20ABI } from "../abis.js";
import type { AgentConfig, VaultSnapshot, PermissionState } from "../types.js";

export async function observeVault(
  publicClient: PublicClient,
  config: AgentConfig,
  user: Address,
  agentAddress: Address,
  tokens: Address[]
): Promise<VaultSnapshot> {
  // Read balances for all relevant tokens
  const balanceResults = await Promise.all(
    tokens.map((token) =>
      publicClient.readContract({
        address: config.agentVault,
        abi: AgentVaultABI,
        functionName: "getBalance",
        args: [user, token],
      })
    )
  );

  const balances: Record<string, bigint> = {};
  tokens.forEach((token, i) => {
    balances[token.toLowerCase()] = balanceResults[i] as bigint;
  });

  // Read permission for this agent
  const permResult = await publicClient.readContract({
    address: config.agentVault,
    abi: AgentVaultABI,
    functionName: "getPermission",
    args: [user, agentAddress],
  }) as {
    allowedTargets: readonly Address[];
    allowedFunctions: readonly `0x${string}`[];
    spendingCap: bigint;
    spent: bigint;
    expiry: bigint;
    active: boolean;
  };

  const now = BigInt(Math.floor(Date.now() / 1000));
  const isActive = permResult.active && (permResult.expiry === 0n || permResult.expiry > now);

  const permissions: PermissionState[] = [{
    agent: agentAddress,
    targets: [...permResult.allowedTargets] as Address[],
    selectors: [...permResult.allowedFunctions],
    expiry: permResult.expiry,
    active: isActive,
  }];

  return { balances, permissions };
}
