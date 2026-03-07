import type { Address, PublicClient } from "viem";
import { AgentVaultABI, ERC20ABI } from "../abis";
import type { AgentConfig, VaultSnapshot, PermissionState } from "../types";

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

  // Read permission for this agent (pass tokens for token allowance lookup)
  const permResult = await publicClient.readContract({
    address: config.agentVault,
    abi: AgentVaultABI,
    functionName: "getPermission",
    args: [user, agentAddress, tokens],
  }) as {
    allowedTargets: readonly Address[];
    allowedFunctions: readonly `0x${string}`[];
    expiry: bigint;
    active: boolean;
    tokenAllowances: readonly { token: Address; cap: bigint; spent: bigint }[];
  };

  const now = BigInt(Math.floor(Date.now() / 1000));
  const isActive = permResult.active && (permResult.expiry === 0n || permResult.expiry >= now);

  const permissions: PermissionState[] = [{
    agent: agentAddress,
    targets: [...permResult.allowedTargets] as Address[],
    selectors: [...permResult.allowedFunctions],
    expiry: permResult.expiry,
    active: isActive,
    tokenAllowances: permResult.tokenAllowances.map((ta) => ({
      token: ta.token,
      cap: ta.cap,
      spent: ta.spent,
    })),
  }];

  return { balances, permissions };
}
