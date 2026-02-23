import { useQuery } from '@tanstack/react-query'
import { formatEther } from 'viem'
import { publicClient } from '@/config/publicClient'
import { abis, getBranchAddresses, getCollToken, getMultiTroveGetter, BRANCH_SYMBOLS } from '@/config/contracts'

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

                    const [collBalance, boldDebt, totalBoldDeposits, price, troves] =
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
                                address: stabilityPool,
                                abi: abis.stabilityPool,
                                functionName: 'getTotalBoldDeposits',
                            }),
                            publicClient.readContract({
                                address: priceFeed,
                                abi: abis.priceFeed,
                                functionName: 'lastGoodPrice',
                            }),
                            publicClient.readContract({
                                address: getMultiTroveGetter(),
                                abi: abis.multiTroveGetter,
                                functionName: 'getMultipleSortedTroves',
                                args: [BigInt(branch), 0n, 1000n],
                            }),
                        ])

                    const priceNum = parseFloat(formatEther(price))
                    const collNum = parseFloat(formatEther(collBalance))
                    const debtNum = parseFloat(formatEther(boldDebt))
                    const totalCollUSD = collNum * priceNum
                    const currentCR = debtNum > 0 ? (totalCollUSD / debtNum) * 100 : 0

                    // Weighted average interest rate from each trove's annualInterestRate
                    let weightedSum = 0n
                    let totalDebtWei = 0n
                    for (const trove of troves) {
                        if (trove.status === 1) {
                            weightedSum += trove.debt * trove.annualInterestRate
                            totalDebtWei += trove.debt
                        }
                    }
                    const avgRate = totalDebtWei > 0n
                        ? parseFloat(formatEther(weightedSum / totalDebtWei)) * 100
                        : 0

                    const mcr = branch === 0 ? '110.00' : '120.00'
                    const ccr = branch === 0 ? '150.00' : '160.00'
                    const ltv = branch === 0 ? '90.91' : '83.33'

                    const spDepositsNum = parseFloat(formatEther(totalBoldDeposits))
                    const spAPY =
                        spDepositsNum > 0 && debtNum > 0
                            ? ((avgRate / 100) * debtNum / spDepositsNum * 100).toFixed(2)
                            : '0.00'

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
                        spAPY,
                    } satisfies Market
                })
            )

            return results
        },
        refetchInterval: 10_000,
        staleTime: 5_000,
    })
}
