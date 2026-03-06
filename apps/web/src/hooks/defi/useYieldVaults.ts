import { useReadContracts, useAccount } from "wagmi";
import { YIELD } from "@/config/addresses";
import { SnowballYieldVaultABI, SnowballStrategyABI } from "@/abis";

export interface VaultData {
    address: `0x${string}`;
    strategy: `0x${string}`;
    want: `0x${string}`;
    wantSymbol: string;
    name: string;
    description: string;
    tvl: bigint | undefined;
    totalSupply: bigint | undefined;
    pricePerShare: bigint | undefined;
    userShares: bigint | undefined;
    lastHarvest: bigint | undefined;
    paused: boolean | undefined;
    withdrawFee: bigint | undefined;
}

type FieldKey = "tvl" | "totalSupply" | "pricePerShare" | "userShares" | "lastHarvest" | "paused" | "withdrawFee";

export function useYieldVaults() {
    const { address } = useAccount();

    const indices: Record<number, Partial<Record<FieldKey, number>>> = {};
    let idx = 0;

    const contracts = YIELD.vaults.flatMap((v, vaultIdx) => {
        indices[vaultIdx] = {};
        const calls = [
            (indices[vaultIdx].tvl = idx++, { address: v.address, abi: SnowballYieldVaultABI, functionName: "balance" as const }),
            (indices[vaultIdx].totalSupply = idx++, { address: v.address, abi: SnowballYieldVaultABI, functionName: "totalSupply" as const }),
            (indices[vaultIdx].pricePerShare = idx++, { address: v.address, abi: SnowballYieldVaultABI, functionName: "getPricePerFullShare" as const }),
            ...(address
                ? [(indices[vaultIdx].userShares = idx++, { address: v.address, abi: SnowballYieldVaultABI, functionName: "balanceOf" as const, args: [address] as const })]
                : []),
            (indices[vaultIdx].lastHarvest = idx++, { address: v.strategy, abi: SnowballStrategyABI, functionName: "lastHarvest" as const }),
            (indices[vaultIdx].paused = idx++, { address: v.strategy, abi: SnowballStrategyABI, functionName: "paused" as const }),
            (indices[vaultIdx].withdrawFee = idx++, { address: v.strategy, abi: SnowballStrategyABI, functionName: "withdrawFee" as const }),
        ];
        return calls;
    });

    const { data, isLoading, refetch } = useReadContracts({
        contracts,
        query: { refetchInterval: 15_000 },
    });

    const vaults: VaultData[] = YIELD.vaults.map((v, i) => {
        const map = indices[i];
        return {
            ...v,
            tvl: data?.[map.tvl!]?.result as bigint | undefined,
            totalSupply: data?.[map.totalSupply!]?.result as bigint | undefined,
            pricePerShare: data?.[map.pricePerShare!]?.result as bigint | undefined,
            userShares: map.userShares != null
                ? (data?.[map.userShares]?.result as bigint | undefined)
                : undefined,
            lastHarvest: data?.[map.lastHarvest!]?.result as bigint | undefined,
            paused: data?.[map.paused!]?.result as boolean | undefined,
            withdrawFee: data?.[map.withdrawFee!]?.result as bigint | undefined,
        };
    });

    return { vaults, isLoading, refetch };
}
