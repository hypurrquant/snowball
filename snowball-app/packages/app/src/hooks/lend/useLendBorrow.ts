import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { LEND_ADDRESSES } from '../../config/lendContracts';
import { SnowballLendABI } from '@snowball/shared/abis';
import type { Hash } from 'viem';

export function useLendBorrow() {
    const { writeContractAsync, data: txHash, isPending, error, reset } = useWriteContract();
    const receipt = useWaitForTransactionReceipt({ hash: txHash });
    const isConfirmed = receipt.isSuccess && receipt.data?.status === 'success';
    const isReverted = receipt.isSuccess && receipt.data?.status === 'reverted';

    const borrow = async (params: {
        marketId: `0x${string}`;
        assets: bigint;
        shares: bigint;
        onBehalf: `0x${string}`;
        receiver: `0x${string}`;
    }): Promise<Hash> => {
        return writeContractAsync({
            address: LEND_ADDRESSES.snowballLend,
            abi: SnowballLendABI,
            functionName: 'borrow',
            args: [params.marketId, params.assets, params.shares, params.onBehalf, params.receiver],
        });
    };

    return { borrow, isPending, isConfirmed, isReverted, txHash, error: error as Error | null, reset };
}
