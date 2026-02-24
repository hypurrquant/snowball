import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { abis, getBranchAddresses } from '@/config/contracts'
import type { Hash } from 'viem'

export function useOpenTrove() {
  const { writeContractAsync, data: txHash, isPending, error, reset } = useWriteContract()
  const receipt = useWaitForTransactionReceipt({ hash: txHash })
  const isConfirmed = receipt.isSuccess && receipt.data?.status === 'success'
  const isReverted = receipt.isSuccess && receipt.data?.status === 'reverted'

  const openTrove = async (params: {
    branch: 0 | 1
    owner: `0x${string}`
    collAmount: bigint
    debtAmount: bigint
    interestRate: bigint
    maxUpfrontFee: bigint
  }): Promise<Hash> => {
    const { borrowerOperations } = getBranchAddresses(params.branch)
    return writeContractAsync({
      address: borrowerOperations,
      abi: abis.borrowerOperations,
      functionName: 'openTrove',
      args: [
        params.owner,
        0n,            // troveIndex (0 = auto)
        params.collAmount,
        params.debtAmount,
        0n,            // upperHint
        0n,            // lowerHint
        params.interestRate,
        params.maxUpfrontFee,
      ],
    })
  }

  return { openTrove, isPending, isConfirmed, isReverted, txHash, error: error as Error | null, reset }
}
