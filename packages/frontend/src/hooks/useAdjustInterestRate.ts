import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { abis, getBranchAddresses } from '@/config/contracts'
import type { Hash } from 'viem'

export function useAdjustInterestRate() {
  const { writeContractAsync, data: txHash, isPending, error, reset } = useWriteContract()
  const receipt = useWaitForTransactionReceipt({ hash: txHash })
  const isConfirmed = receipt.isSuccess && receipt.data?.status === 'success'
  const isReverted = receipt.isSuccess && receipt.data?.status === 'reverted'

  const adjustRate = async (params: {
    branch: 0 | 1
    troveId: bigint
    newRate: bigint
    maxUpfrontFee: bigint
  }): Promise<Hash> => {
    const { borrowerOperations } = getBranchAddresses(params.branch)
    return writeContractAsync({
      address: borrowerOperations,
      abi: abis.borrowerOperations,
      functionName: 'adjustTroveInterestRate',
      args: [params.troveId, params.newRate, 0n, 0n, params.maxUpfrontFee],
    })
  }

  return { adjustRate, isPending, isConfirmed, isReverted, txHash, error: error as Error | null, reset }
}
