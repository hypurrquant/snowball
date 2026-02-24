import { useQuery } from '@tanstack/react-query'
import { publicClient } from '@/config/publicClient'
import { abis, getBranchAddresses, BRANCH_SYMBOLS } from '@/config/contracts'

export interface SPUserDeposit {
    branch: number
    collateralSymbol: string
    deposit: string       // wei string
    boldGain: string      // sbUSD reward (wei)
    collGain: string      // collateral reward (wei)
}

export function useUserSPDeposits(address?: string) {
    return useQuery<SPUserDeposit[]>({
        queryKey: ['user-sp-deposits', address],
        queryFn: async () => {
            const addr = address as `0x${string}`
            const branches = [0, 1] as const

            const results = await Promise.all(
                branches.map(async (branch) => {
                    const { stabilityPool } = getBranchAddresses(branch)

                    const [deposit, boldGain, collGain] = await Promise.all([
                        publicClient.readContract({
                            address: stabilityPool,
                            abi: abis.stabilityPool,
                            functionName: 'getCompoundedBoldDeposit',
                            args: [addr],
                        }),
                        publicClient.readContract({
                            address: stabilityPool,
                            abi: abis.stabilityPool,
                            functionName: 'getDepositorBoldGain',
                            args: [addr],
                        }),
                        publicClient.readContract({
                            address: stabilityPool,
                            abi: abis.stabilityPool,
                            functionName: 'getDepositorCollGain',
                            args: [addr],
                        }),
                    ])

                    return {
                        branch,
                        collateralSymbol: BRANCH_SYMBOLS[branch],
                        deposit: deposit.toString(),
                        boldGain: boldGain.toString(),
                        collGain: collGain.toString(),
                    }
                })
            )

            return results
        },
        enabled: !!address,
        staleTime: 15_000,
    })
}
