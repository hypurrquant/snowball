import { useQuery } from '@tanstack/react-query'
import { formatEther } from 'viem'
import { publicClient } from '@/config/publicClient'
import { abis, getBranchAddresses, BRANCH_SYMBOLS } from '@/config/contracts'

export interface Position {
    troveId: number
    branch: number
    collateralSymbol: string
    collateral: string
    collateralUSD: string
    debt: string
    cr: string
    interestRate: string
    liquidationPrice: string
    agentManaged: boolean
    agentStrategy: string
    status: string
}

// Trove status enum from Liquity v2
const TROVE_STATUS = ['nonExistent', 'active', 'closedByOwner', 'closedByLiquidation', 'zombie'] as const

export function useUserPositions(address?: string) {
    return useQuery<Position[]>({
        queryKey: ['user-positions', address],
        queryFn: async () => {
            const addr = address as `0x${string}`
            const branches = [0, 1] as const
            const positions: Position[] = []

            for (const branch of branches) {
                const { troveNFT, troveManager, priceFeed } = getBranchAddresses(branch)
                const mcr = branch === 0 ? 1.1 : 1.2

                // Get number of troves owned
                const count = await publicClient.readContract({
                    address: troveNFT,
                    abi: abis.troveNFT,
                    functionName: 'balanceOf',
                    args: [addr],
                })

                if (count === 0n) continue

                // Get price
                const price = await publicClient.readContract({
                    address: priceFeed,
                    abi: abis.priceFeed,
                    functionName: 'lastGoodPrice',
                })
                const priceNum = parseFloat(formatEther(price))

                // Get all trove IDs
                const troveIds = await Promise.all(
                    Array.from({ length: Number(count) }, (_, i) =>
                        publicClient.readContract({
                            address: troveNFT,
                            abi: abis.troveNFT,
                            functionName: 'tokenOfOwnerByIndex',
                            args: [addr, BigInt(i)],
                        })
                    )
                )

                // Get trove data for each ID
                const troveData = await Promise.all(
                    troveIds.map(async (troveId) => {
                        const [status, debt, coll, annualRate] = await Promise.all([
                            publicClient.readContract({
                                address: troveManager,
                                abi: abis.troveManager,
                                functionName: 'getTroveStatus',
                                args: [troveId],
                            }),
                            publicClient.readContract({
                                address: troveManager,
                                abi: abis.troveManager,
                                functionName: 'getTroveDebt',
                                args: [troveId],
                            }),
                            publicClient.readContract({
                                address: troveManager,
                                abi: abis.troveManager,
                                functionName: 'getTroveColl',
                                args: [troveId],
                            }),
                            publicClient.readContract({
                                address: troveManager,
                                abi: abis.troveManager,
                                functionName: 'getTroveAnnualInterestRate',
                                args: [troveId],
                            }),
                        ])

                        const statusName = TROVE_STATUS[Number(status)] ?? 'unknown'
                        if (statusName !== 'active') return null

                        const collNum = parseFloat(formatEther(coll))
                        const debtNum = parseFloat(formatEther(debt))
                        const collUSD = collNum * priceNum
                        const cr = debtNum > 0 ? (collUSD / debtNum) * 100 : 0
                        const liqPrice = debtNum > 0 && collNum > 0 ? (debtNum * mcr) / collNum : 0
                        const interestRate = parseFloat(formatEther(annualRate)) * 100 // wei → percentage

                        return {
                            troveId: Number(troveId),
                            branch: branch as number,
                            collateralSymbol: BRANCH_SYMBOLS[branch],
                            collateral: coll.toString(),
                            collateralUSD: collUSD.toFixed(2),
                            debt: debt.toString(),
                            cr: cr.toFixed(2),
                            interestRate: interestRate.toFixed(2),
                            liquidationPrice: liqPrice.toFixed(4),
                            agentManaged: false,
                            agentStrategy: 'none',
                            status: statusName as string,
                        } as Position
                    })
                )

                positions.push(...troveData.filter((p): p is Position => p != null))
            }

            return positions
        },
        enabled: !!address,
        staleTime: 15_000,
    })
}
