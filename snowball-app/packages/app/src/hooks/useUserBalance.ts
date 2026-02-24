import { useQuery } from '@tanstack/react-query'
import { erc20Abi } from 'viem'
import { publicClient } from '@/config/publicClient'
import { getCollToken, getSbUSDToken } from '@/config/contracts'

export interface UserBalance {
    nativeCTC: string
    wCTC: string
    lstCTC: string
    sbUSD: string
}

export function useUserBalance(address?: string) {
    return useQuery<UserBalance>({
        queryKey: ['user-balance', address],
        queryFn: async () => {
            const addr = address as `0x${string}`

            const [nativeBalance, wCTCBalance, lstCTCBalance, sbUSDBalance] = await Promise.all([
                publicClient.getBalance({ address: addr }),
                publicClient.readContract({
                    address: getCollToken(0),
                    abi: erc20Abi,
                    functionName: 'balanceOf',
                    args: [addr],
                }),
                publicClient.readContract({
                    address: getCollToken(1),
                    abi: erc20Abi,
                    functionName: 'balanceOf',
                    args: [addr],
                }),
                publicClient.readContract({
                    address: getSbUSDToken(),
                    abi: erc20Abi,
                    functionName: 'balanceOf',
                    args: [addr],
                }),
            ])

            return {
                nativeCTC: nativeBalance.toString(),
                wCTC: wCTCBalance.toString(),
                lstCTC: lstCTCBalance.toString(),
                sbUSD: sbUSDBalance.toString(),
            }
        },
        enabled: !!address,
        staleTime: 15_000,
    })
}
