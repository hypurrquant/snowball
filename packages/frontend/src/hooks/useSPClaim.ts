import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { abis, getBranchAddresses } from '@/config/contracts'
import type { Hash } from 'viem'

export function useSPClaim() {
  const { writeContractAsync, data: txHash, isPending, error, reset } = useWriteContract()
  const receipt = useWaitForTransactionReceipt({ hash: txHash })
  const isConfirmed = receipt.isSuccess && receipt.data?.status === 'success'
  const isReverted = receipt.isSuccess && receipt.data?.status === 'reverted'

  const claim = async (params: { branch: 0 | 1 }): Promise<Hash> => {
    const { stabilityPool } = getBranchAddresses(params.branch)
    return writeContractAsync({
      address: stabilityPool,
      abi: abis.stabilityPool,
      functionName: 'claimReward',
    })
  }

  return { claim, isPending, isConfirmed, isReverted, txHash, error: error as Error | null, reset }
}
