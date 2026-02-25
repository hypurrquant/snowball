import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { LEND_ADDRESSES } from '../../config/lendContracts';
import { SnowballLendABI } from '@snowball/shared/abis';
import type { Hash } from 'viem';

export function useLendRepay() {
    const { writeContractAsync, data: txHash, isPending, error, reset } = useWriteContract();
    const receipt = useWaitForTransactionReceipt({ hash: txHash });
    const isConfirmed = receipt.isSuccess && receipt.data?.status === 'success';
    const isReverted = receipt.isSuccess && receipt.data?.status === 'reverted';

    const repay = async (params: {
        marketId: `0x${string}`;
        assets: bigint;
        shares: bigint;
        onBehalf: `0x${string}`;
    }): Promise<Hash> => {
        return writeContractAsync({
            address: LEND_ADDRESSES.snowballLend,
            abi: SnowballLendABI,
            functionName: 'repay',
            args: [params.marketId, params.assets, params.shares, params.onBehalf, "0x"],
        });
    };

    return { repay, isPending, isConfirmed, isReverted, txHash, error: error as Error | null, reset };
}
