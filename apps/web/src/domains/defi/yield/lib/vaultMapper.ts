import { YIELD } from "@/core/config/addresses";
import { SnowballYieldVaultABI, SnowballStrategyABI } from "@/core/abis";
import type { VaultData, FieldKey } from "../types";
import type { Address } from "viem";

type ContractCall = {
    address: Address;
    abi: typeof SnowballYieldVaultABI | typeof SnowballStrategyABI;
    functionName: string;
    args?: readonly unknown[];
};

export function buildVaultReadPlan(vaults: typeof YIELD.vaults, address?: Address) {
    const indices: Record<number, Partial<Record<FieldKey, number>>> = {};
    let idx = 0;

    const contracts: ContractCall[] = vaults.flatMap((v, vaultIdx) => {
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

    return { contracts, indices };
}

export function mapVaultResults(
    vaults: typeof YIELD.vaults,
    data: readonly { status: string; result?: unknown }[] | undefined,
    indices: Record<number, Partial<Record<FieldKey, number>>>,
): VaultData[] {
    return vaults.map((v, i) => {
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
}
