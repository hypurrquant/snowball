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

export function useYieldVaults() {
    const { address } = useAccount();

    const contracts = YIELD.vaults.flatMap((v) => [
        { address: v.address, abi: SnowballYieldVaultABI, functionName: "balance" as const },
        { address: v.address, abi: SnowballYieldVaultABI, functionName: "totalSupply" as const },
        { address: v.address, abi: SnowballYieldVaultABI, functionName: "getPricePerFullShare" as const },
        ...(address
            ? [{ address: v.address, abi: SnowballYieldVaultABI, functionName: "balanceOf" as const, args: [address] }]
            : []),
        { address: v.strategy, abi: SnowballStrategyABI, functionName: "lastHarvest" as const },
        { address: v.strategy, abi: SnowballStrategyABI, functionName: "paused" as const },
        { address: v.strategy, abi: SnowballStrategyABI, functionName: "withdrawFee" as const },
    ]);

    const { data, isLoading, refetch } = useReadContracts({
        contracts,
        query: { refetchInterval: 15_000 },
    });

    const callsPerVault = address ? 7 : 6;
    const vaults: VaultData[] = YIELD.vaults.map((v, i) => {
        const offset = i * callsPerVault;
        return {
            ...v,
            tvl: data?.[offset]?.result as bigint | undefined,
            totalSupply: data?.[offset + 1]?.result as bigint | undefined,
            pricePerShare: data?.[offset + 2]?.result as bigint | undefined,
            userShares: address
                ? (data?.[offset + 3]?.result as bigint | undefined)
                : undefined,
            lastHarvest: data?.[offset + (address ? 4 : 3)]?.result as bigint | undefined,
            paused: data?.[offset + (address ? 5 : 4)]?.result as boolean | undefined,
            withdrawFee: data?.[offset + (address ? 6 : 5)]?.result as bigint | undefined,
        };
    });

    return { vaults, isLoading, refetch };
}
