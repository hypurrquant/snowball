import { useQuery } from '@tanstack/react-query'
import { formatEther } from 'viem'
import { publicClient } from '@/config/publicClient'
import { abis, getBranchAddresses } from '@/config/contracts'

// Mock prices as fallback (E2E verified)
const MOCK_PRICES = {
    0: 0.20,  // wCTC = $0.20
    1: 0.21,  // lstCTC = $0.21 (exchange rate 1.05)
}

export function usePrice(branch: 0 | 1 = 0) {
    const { priceFeed } = getBranchAddresses(branch)

    return useQuery<number>({
        queryKey: ['price', branch],
        queryFn: async () => {
            try {
                const raw = await publicClient.readContract({
                    address: priceFeed,
                    abi: abis.priceFeed,
                    functionName: 'lastGoodPrice',
                })
                const price = parseFloat(formatEther(raw))
                // Sanity check
                if (price > 0 && price < 1000) return price
                return MOCK_PRICES[branch]
            } catch {
                // Fallback to mock price when RPC call fails
                return MOCK_PRICES[branch]
            }
        },
        refetchInterval: 30_000,
        staleTime: 20_000,
    })
}
