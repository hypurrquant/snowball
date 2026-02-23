import { usePrivy, useWallets } from '@privy-io/react-auth'
import { useQuery } from '@tanstack/react-query'
import { API_BASE } from '@/config/api'

/**
 * Hook to access the user's Privy embedded wallet and server wallet status.
 *
 * - embeddedWallet: the Privy-created wallet (client-side, for user signing)
 * - serverWallet: a server-managed wallet created via backend API for agent execution
 */
export function usePrivyServerWallet() {
    const { user, authenticated, ready } = usePrivy()
    const { wallets } = useWallets()

    // Find the embedded wallet (Privy-created)
    const embeddedWallet = wallets.find((w) => w.walletClientType === 'privy')
    const externalWallet = wallets.find((w) => w.walletClientType !== 'privy')

    // The address to use (prefer external wallet if connected, otherwise embedded)
    const activeAddress = externalWallet?.address ?? embeddedWallet?.address

    // Check if this user has a server wallet registered for agent execution
    const { data: serverWalletInfo, isLoading: serverWalletLoading, refetch: refetchServerWallet } = useQuery({
        queryKey: ['server-wallet', activeAddress],
        queryFn: async () => {
            const res = await fetch(`${API_BASE}/agent/server-wallet?userAddress=${activeAddress}`)
            if (!res.ok) return null
            return res.json() as Promise<{
                serverWalletAddress: string
                active: boolean
                strategy: string
                createdAt: string
            }>
        },
        enabled: !!activeAddress && authenticated,
        staleTime: 30_000,
    })

    // Create or activate a server wallet for this user
    const createServerWallet = async (params: {
        strategy: string
        minCR: number
        autoRebalance: boolean
        autoRateAdjust: boolean
    }) => {
        if (!activeAddress) throw new Error('No wallet connected')

        const res = await fetch(`${API_BASE}/agent/server-wallet`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                userAddress: activeAddress,
                ...params,
            }),
        })

        if (!res.ok) {
            const body = await res.json().catch(() => null)
            const message = body?.error?.message ?? body?.error ?? body?.message ?? 'Failed to create server wallet'
            throw new Error(typeof message === 'string' ? message : JSON.stringify(message))
        }

        const data = await res.json()
        await refetchServerWallet()
        return data
    }

    // Deactivate the server wallet (stop agent)
    const deactivateServerWallet = async () => {
        if (!activeAddress) return

        await fetch(`${API_BASE}/agent/server-wallet`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userAddress: activeAddress }),
        })

        await refetchServerWallet()
    }

    return {
        ready,
        authenticated,
        user,
        embeddedWallet,
        externalWallet,
        activeAddress,
        serverWallet: serverWalletInfo,
        serverWalletLoading,
        hasServerWallet: !!serverWalletInfo?.active,
        createServerWallet,
        deactivateServerWallet,
        refetchServerWallet,
    }
}
