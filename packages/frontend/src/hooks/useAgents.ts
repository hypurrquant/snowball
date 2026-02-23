import { useQuery } from '@tanstack/react-query'
import { API_BASE } from '@/config/api'

export interface Agent {
    id: number
    name: string
    type: string  // 'consumer' | 'cdp_provider' | etc.
    status: 'active' | 'inactive' | 'paused'
    strategy: string
    managedPositions: number
    totalValueManaged: string
    lastActionAt?: string
}

export function useAgents() {
    return useQuery<Agent[]>({
        queryKey: ['agents'],
        queryFn: async () => {
            const res = await fetch(`${API_BASE}/agents`)
            if (!res.ok) throw new Error('Failed to fetch agents')
            return res.json()
        },
        refetchInterval: 30_000,
        staleTime: 15_000,
    })
}

export function useAgent(id: number | undefined) {
    return useQuery<Agent>({
        queryKey: ['agent', id],
        queryFn: async () => {
            const res = await fetch(`${API_BASE}/agents/${id}`)
            if (!res.ok) throw new Error('Failed to fetch agent')
            return res.json()
        },
        enabled: id != null,
        refetchInterval: 30_000,
    })
}
