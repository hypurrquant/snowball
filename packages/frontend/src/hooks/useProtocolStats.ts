import { useQuery } from '@tanstack/react-query'
import { formatEther } from 'viem'
import { publicClient } from '@/config/publicClient'
import { abis, getBranchAddresses } from '@/config/contracts'

export interface ProtocolStats {
    totalCollateralUSD: string
    totalBorrowedUSD: string
    sbUSDPrice: string
    activeAgents: number
}

export function useProtocolStats() {
    return useQuery<ProtocolStats>({
        queryKey: ['protocol-stats'],
        queryFn: async () => {
            const branches = [0, 1] as const

            let totalCollateralUSD = 0
            let totalBorrowedUSD = 0

            await Promise.all(
                branches.map(async (branch) => {
                    const { activePool, priceFeed } = getBranchAddresses(branch)

                    const [collBalance, boldDebt, price] = await Promise.all([
                        publicClient.readContract({
                            address: activePool,
                            abi: abis.activePool,
                            functionName: 'getCollBalance',
                        }),
                        publicClient.readContract({
                            address: activePool,
                            abi: abis.activePool,
                            functionName: 'getBoldDebt',
                        }),
                        publicClient.readContract({
                            address: priceFeed,
                            abi: abis.priceFeed,
                            functionName: 'lastGoodPrice',
                        }),
                    ])

                    const priceNum = parseFloat(formatEther(price))
                    const collNum = parseFloat(formatEther(collBalance))
                    const debtNum = parseFloat(formatEther(boldDebt))

                    totalCollateralUSD += collNum * priceNum
                    totalBorrowedUSD += debtNum
                })
            )

            return {
                totalCollateralUSD: totalCollateralUSD.toFixed(2),
                totalBorrowedUSD: totalBorrowedUSD.toFixed(2),
                sbUSDPrice: '1.00',
                activeAgents: 0,
            }
        },
        refetchInterval: 10_000,
        staleTime: 5_000,
    })
}
