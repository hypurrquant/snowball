import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { abis, getBranchAddresses } from '@/config/contracts'
import type { Hash } from 'viem'

export function useCloseTrove() {
  const { writeContractAsync, data: txHash, isPending, error, reset } = useWriteContract()
  const receipt = useWaitForTransactionReceipt({ hash: txHash })
  const isConfirmed = receipt.isSuccess && receipt.data?.status === 'success'
  const isReverted = receipt.isSuccess && receipt.data?.status === 'reverted'

  const closeTrove = async (params: { branch: 0 | 1; troveId: bigint }): Promise<Hash> => {
    const { borrowerOperations } = getBranchAddresses(params.branch)
    return writeContractAsync({
      address: borrowerOperations,
      abi: abis.borrowerOperations,
      functionName: 'closeTrove',
      args: [params.troveId],
    })
  }

  return { closeTrove, isPending, isConfirmed, isReverted, txHash, error: error as Error | null, reset }
}
