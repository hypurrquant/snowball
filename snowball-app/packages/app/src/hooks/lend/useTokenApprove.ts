import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { MockERC20ABI } from '@snowball/shared/abis';
import type { Hash } from 'viem';

export function useTokenApprove() {
    const { writeContractAsync, data: txHash, isPending, error, reset } = useWriteContract();
    const receipt = useWaitForTransactionReceipt({ hash: txHash });
    const isConfirmed = receipt.isSuccess && receipt.data?.status === 'success';
    const isReverted = receipt.isSuccess && receipt.data?.status === 'reverted';

    const approve = async (params: {
        token: `0x${string}`;
        spender: `0x${string}`;
        amount: bigint;
    }): Promise<Hash> => {
        return writeContractAsync({
            address: params.token,
            abi: MockERC20ABI,
            functionName: 'approve',
            args: [params.spender, params.amount],
        });
    };

    return { approve, isPending, isConfirmed, isReverted, txHash, error: error as Error | null, reset };
}
