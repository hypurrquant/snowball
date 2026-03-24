"use client";

import { useAccount, useReadContracts } from "wagmi";
import { erc20Abi } from "viem";
import { HYPERLEND } from "@snowball/core/src/config/hyperevm";

export function useHyperLendPositions() {
  const { address, chainId } = useAccount();

  const contracts = HYPERLEND.markets.flatMap((m) => [
    { address: m.hToken, abi: erc20Abi, functionName: "balanceOf" as const, args: [address!] as const },
    { address: m.debtToken, abi: erc20Abi, functionName: "balanceOf" as const, args: [address!] as const },
  ]);

  const { data, isLoading, refetch } = useReadContracts({
    contracts,
    query: { enabled: !!address && chainId === 999, refetchInterval: 15_000 },
  });

  const positions = HYPERLEND.markets.map((m, i) => {
    const supplyBal = data?.[i * 2]?.result as bigint | undefined;
    const borrowBal = data?.[i * 2 + 1]?.result as bigint | undefined;
    return {
      symbol: m.symbol, hToken: m.hToken, debtToken: m.debtToken,
      supplyBalance: supplyBal ?? 0n, borrowBalance: borrowBal ?? 0n,
      hasPosition: (supplyBal ?? 0n) > 0n || (borrowBal ?? 0n) > 0n,
    };
  });

  return { positions, isLoading, refetch };
}
