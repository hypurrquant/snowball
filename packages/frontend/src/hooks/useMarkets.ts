import { useQuery } from '@tanstack/react-query'
import { formatEther } from 'viem'
import { publicClient } from '@/config/publicClient'
import { abis, getBranchAddresses, getCollToken, BRANCH_SYMBOLS } from '@/config/contracts'

export interface Market {
    branch: number
    collateralSymbol: string
    collateralAddress: string
    totalCollateral: string
    totalCollateralUSD: string
    currentCR: string
    mcr: string
    ccr: string
    ltv: string
    totalBorrow: string
    avgInterestRate: string
    spDeposits: string
    spAPY: string
}

export function useMarkets() {
    return useQuery<Market[]>({
        queryKey: ['markets'],
        queryFn: async () => {
            const branches = [0, 1] as const

            const results = await Promise.all(
                branches.map(async (branch) => {
                    const { activePool, priceFeed, stabilityPool } = getBranchAddresses(branch)

                    const [collBalance, boldDebt, aggWeightedDebtSum, totalBoldDeposits, price] =
                        await Promise.all([
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
                                address: activePool,
                                abi: abis.activePool,
                                functionName: 'aggWeightedDebtSum',
                            }),
                            publicClient.readContract({
                                address: stabilityPool,
                                abi: abis.stabilityPool,
                                functionName: 'getTotalBoldDeposits',
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
                    const totalCollUSD = collNum * priceNum
                    const currentCR = debtNum > 0 ? (totalCollUSD / debtNum) * 100 : 0
                    const avgRate =
                        debtNum > 0
                            ? (parseFloat(formatEther(aggWeightedDebtSum)) / debtNum) * 100
                            : 0

                    const mcr = branch === 0 ? '110.00' : '120.00'
                    const ccr = branch === 0 ? '150.00' : '160.00'
                    const ltv = branch === 0 ? '90.91' : '83.33'

                    return {
                        branch,
                        collateralSymbol: BRANCH_SYMBOLS[branch],
                        collateralAddress: getCollToken(branch),
                        totalCollateral: collBalance.toString(),
                        totalCollateralUSD: totalCollUSD.toFixed(2),
                        currentCR: currentCR.toFixed(2),
                        mcr,
                        ccr,
                        ltv,
                        totalBorrow: boldDebt.toString(),
                        avgInterestRate: avgRate.toFixed(2),
                        spDeposits: totalBoldDeposits.toString(),
                        spAPY: '0.00', // calculated from liquidation gains, not available on-chain directly
                    } satisfies Market
                })
            )

            return results
        },
        refetchInterval: 10_000,
        staleTime: 5_000,
    })
}
