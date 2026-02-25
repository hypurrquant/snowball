import { useReadContracts } from 'wagmi';
import { LEND_ADDRESSES, LEND_MARKETS } from '../../config/lendContracts';
import { SnowballLendABI, AdaptiveCurveIRMABI, MockOracleABI } from '@snowball/shared/abis';

export function useLendMarkets() {
    const marketCalls = LEND_MARKETS.map((m) => ({
        address: LEND_ADDRESSES.snowballLend,
        abi: SnowballLendABI,
        functionName: 'market',
        args: [m.id],
    }));

    const oracleCalls = LEND_MARKETS.map((m) => ({
        address: m.oracle,
        abi: MockOracleABI,
        functionName: 'getPrice',
    }));

    const { data: baseData, isLoading: isBaseLoading, refetch: refetchBase } = useReadContracts({
        // @ts-ignore
        contracts: [...marketCalls, ...oracleCalls],
        query: { refetchInterval: 10_000 },
    });

    const marketsData = baseData?.slice(0, LEND_MARKETS.length) || [];
    const oraclesData = baseData?.slice(LEND_MARKETS.length) || [];

    const irmCalls = LEND_MARKETS.map((m, i) => {
        const mData = marketsData[i]?.result as readonly [bigint, bigint, bigint, bigint, bigint, bigint] | undefined;
        const totalSupply = mData ? mData[0] : 0n;
        const totalBorrow = mData ? mData[2] : 0n;

        return {
            address: m.irm,
            abi: AdaptiveCurveIRMABI,
            functionName: 'borrowRateView',
            args: [m.id, totalSupply, totalBorrow],
        };
    });

    const { data: irmData, isLoading: isIrmLoading } = useReadContracts({
        // @ts-ignore
        contracts: irmCalls,
        query: {
            enabled: !!baseData,
            refetchInterval: 10_000,
        }
    });

    const isLoading = isBaseLoading || isIrmLoading;

    const markets = LEND_MARKETS.map((config, i) => {
        const mData = marketsData[i]?.result as readonly [bigint, bigint, bigint, bigint, bigint, bigint] | undefined;
        const oraclePrice = (oraclesData[i]?.result as bigint) || 0n;
        const borrowRatePerSecond = (irmData?.[i]?.result as bigint) || 0n;

        return {
            config,
            totalSupplyAssets: mData ? mData[0] : 0n,
            totalSupplyShares: mData ? mData[1] : 0n,
            totalBorrowAssets: mData ? mData[2] : 0n,
            totalBorrowShares: mData ? mData[3] : 0n,
            lastUpdate: mData ? mData[4] : 0n,
            fee: mData ? mData[5] : 0n,
            oraclePrice,
            borrowRatePerSecond,
        };
    });

    return { markets, isLoading, refetch: refetchBase };
}
