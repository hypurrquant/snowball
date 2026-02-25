import { useReadContracts, useAccount } from 'wagmi';
import { LEND_ADDRESSES } from '../../config/lendContracts';
import { SnowballLendABI } from '@snowball/shared/abis';

export function useLendPosition(marketId: `0x${string}`) {
    const { address } = useAccount();

    const { data, isLoading, refetch } = useReadContracts({
        contracts: [
            {
                address: LEND_ADDRESSES.snowballLend,
                abi: SnowballLendABI,
                functionName: 'supplyShares',
                args: [marketId, address || '0x0000000000000000000000000000000000000000'],
            },
            {
                address: LEND_ADDRESSES.snowballLend,
                abi: SnowballLendABI,
                functionName: 'borrowShares',
                args: [marketId, address || '0x0000000000000000000000000000000000000000'],
            },
            {
                address: LEND_ADDRESSES.snowballLend,
                abi: SnowballLendABI,
                functionName: 'collateral',
                args: [marketId, address || '0x0000000000000000000000000000000000000000'],
            }
        ],
        query: {
            enabled: !!address,
            refetchInterval: 10_000,
        }
    });

    return {
        supplyShares: (data?.[0]?.result as bigint) || 0n,
        borrowShares: (data?.[1]?.result as bigint) || 0n,
        collateral: (data?.[2]?.result as bigint) || 0n,
        isLoading,
        refetch,
    };
}
