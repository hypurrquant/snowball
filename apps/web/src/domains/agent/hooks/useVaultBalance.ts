import { useReadContracts, useAccount } from "wagmi";
import { ERC8004, TOKENS } from "@/core/config/addresses";
import { AgentVaultABI } from "@/core/abis";

const VAULT_TOKENS = [
  { address: TOKENS.wCTC, symbol: "wCTC" },
  { address: TOKENS.sbUSD, symbol: "sbUSD" },
  { address: TOKENS.USDC, symbol: "USDC" },
  { address: TOKENS.lstCTC, symbol: "lstCTC" },
] as const;

export function useVaultBalance() {
  const { address } = useAccount();

  const contracts = address
    ? VAULT_TOKENS.map((t) => ({
        address: ERC8004.agentVault,
        abi: AgentVaultABI,
        functionName: "getBalance" as const,
        args: [address, t.address] as const,
      }))
    : [];

  const { data, isLoading, refetch } = useReadContracts({
    contracts,
    query: { enabled: !!address, refetchInterval: 15_000 },
  });

  const balances = VAULT_TOKENS.map((t, i) => ({
    token: t.address,
    symbol: t.symbol,
    balance:
      data?.[i]?.status === "success"
        ? (data[i].result as bigint)
        : 0n,
  }));

  return { balances, isLoading, refetch };
}
