import { useQuery } from '@tanstack/react-query'
import { API_BASE } from '@/config/api'

export interface AgentHistoryEntry {
    timestamp: number   // unix ms
    action: string
    txHash?: string
    details?: string
}

export interface AgentHistory {
    agentId: number
    entries: AgentHistoryEntry[]
}

export function useAgentHistory(agentId: number | undefined) {
    return useQuery<AgentHistory>({
        queryKey: ['agent-history', agentId],
        queryFn: async () => {
            const res = await fetch(`${API_BASE}/agents/${agentId}/history`)
            if (!res.ok) throw new Error('Failed to fetch agent history')
            return res.json()
        },
        enabled: agentId != null,
        refetchInterval: 15_000,
        staleTime: 10_000,
    })
}
