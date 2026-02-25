import { useReadContract, useReadContracts } from "wagmi";
import { Address } from "viem";
import { CONTRACTS } from "@/config/contracts";
import { SnowballFactoryABI, SnowballPoolABI, DynamicFeePluginABI } from "@/abis";
import { sortTokens } from "@/lib/tokens";

export function usePool(tokenA?: Address, tokenB?: Address) {
    const [token0, token1] = tokenA && tokenB ? sortTokens(tokenA, tokenB) : [undefined, undefined];

    // 1. Get Pool Address
    const { data: poolAddress, isLoading: isPoolLoading } = useReadContract({
        address: CONTRACTS.snowballFactory,
        abi: SnowballFactoryABI,
        functionName: "poolByPair",
        args: token0 && token1 ? [token0, token1] : undefined,
        query: { enabled: !!token0 && !!token1 },
    });

    // 2. Fetch globalState and Dynamic Fee
    const { data: poolData, isLoading: isDataLoading } = useReadContracts({
        contracts: [
            {
                address: poolAddress as Address,
                abi: SnowballPoolABI,
                functionName: "globalState",
            },
            {
                address: poolAddress as Address,
                abi: SnowballPoolABI,
                functionName: "liquidity",
            },
            {
                address: CONTRACTS.dynamicFeePlugin,
                abi: DynamicFeePluginABI,
                functionName: "getFee",
                args: poolAddress ? [poolAddress] : undefined,
            },
        ],
        query: {
            enabled: !!poolAddress,
            refetchInterval: 10000, // refresh every 10s
        }
    });

    const [globalState, liquidity, dynamicFee] = poolData || [];

    return {
        poolAddress,
        token0,
        token1,
        globalState: globalState?.status === "success" ? globalState.result : undefined,
        liquidity: liquidity?.status === "success" ? liquidity.result : undefined,
        dynamicFee: dynamicFee?.status === "success" ? dynamicFee.result : undefined,
        isLoading: isPoolLoading || isDataLoading,
    };
}
