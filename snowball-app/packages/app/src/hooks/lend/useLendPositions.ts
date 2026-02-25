import { useReadContracts, useAccount } from 'wagmi';
import { LEND_ADDRESSES, LEND_MARKETS } from '../../config/lendContracts';
import { SnowballLendABI } from '@snowball/shared/abis';

export function useLendPositions() {
    const { address } = useAccount();

    const calls = LEND_MARKETS.flatMap(m => ([
        {
            address: LEND_ADDRESSES.snowballLend,
            abi: SnowballLendABI,
            functionName: 'supplyShares',
            args: [m.id, address || '0x0000000000000000000000000000000000000000'],
        },
        {
            address: LEND_ADDRESSES.snowballLend,
            abi: SnowballLendABI,
            functionName: 'borrowShares',
            args: [m.id, address || '0x0000000000000000000000000000000000000000'],
        },
        {
            address: LEND_ADDRESSES.snowballLend,
            abi: SnowballLendABI,
            functionName: 'collateral',
            args: [m.id, address || '0x0000000000000000000000000000000000000000'],
        }
    ]));

    const { data, isLoading, refetch } = useReadContracts({
        // @ts-ignore dynamic length
        contracts: calls,
        query: {
            enabled: !!address,
            refetchInterval: 10_000,
        }
    });

    const positions = LEND_MARKETS.map((m, i) => {
        const offset = i * 3;
        return {
            marketId: m.id,
            supplyShares: (data?.[offset]?.result as bigint) || 0n,
            borrowShares: (data?.[offset + 1]?.result as bigint) || 0n,
            collateral: (data?.[offset + 2]?.result as bigint) || 0n,
        };
    });

    return { positions, isLoading, refetch };
}
