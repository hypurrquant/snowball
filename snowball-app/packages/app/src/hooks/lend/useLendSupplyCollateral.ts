import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { LEND_ADDRESSES } from '../../config/lendContracts';
import { SnowballLendABI } from '@snowball/shared/abis';
import type { Hash } from 'viem';

export function useLendSupplyCollateral() {
    const { writeContractAsync, data: txHash, isPending, error, reset } = useWriteContract();
    const receipt = useWaitForTransactionReceipt({ hash: txHash });
    const isConfirmed = receipt.isSuccess && receipt.data?.status === 'success';
    const isReverted = receipt.isSuccess && receipt.data?.status === 'reverted';

    const supplyCollateral = async (params: {
        marketId: `0x${string}`;
        assets: bigint;
        onBehalf: `0x${string}`;
    }): Promise<Hash> => {
        return writeContractAsync({
            address: LEND_ADDRESSES.snowballLend,
            abi: SnowballLendABI,
            functionName: 'supplyCollateral',
            args: [params.marketId, params.assets, params.onBehalf, "0x"],
        });
    };

    return { supplyCollateral, isPending, isConfirmed, isReverted, txHash, error: error as Error | null, reset };
}
