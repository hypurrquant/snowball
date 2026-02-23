import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { abis, getBranchAddresses } from '@/config/contracts'
import type { Hash } from 'viem'

export function useAdjustTrove() {
  const { writeContractAsync, data: txHash, isPending, error, reset } = useWriteContract()
  const receipt = useWaitForTransactionReceipt({ hash: txHash })
  const isConfirmed = receipt.isSuccess && receipt.data?.status === 'success'
  const isReverted = receipt.isSuccess && receipt.data?.status === 'reverted'

  const adjustTrove = async (params: {
    branch: 0 | 1
    troveId: bigint
    collChange: bigint
    isCollIncrease: boolean
    debtChange: bigint
    isDebtIncrease: boolean
    maxUpfrontFee: bigint
  }): Promise<Hash> => {
    const { borrowerOperations } = getBranchAddresses(params.branch)
    return writeContractAsync({
      address: borrowerOperations,
      abi: abis.borrowerOperations,
      functionName: 'adjustTrove',
      args: [
        params.troveId,
        params.collChange,
        params.isCollIncrease,
        params.debtChange,
        params.isDebtIncrease,
        0n,
        0n,
        params.maxUpfrontFee,
      ],
    })
  }

  return { adjustTrove, isPending, isConfirmed, isReverted, txHash, error: error as Error | null, reset }
}
