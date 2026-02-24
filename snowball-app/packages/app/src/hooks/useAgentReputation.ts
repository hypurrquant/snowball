import { useQuery } from '@tanstack/react-query'
import { API_BASE } from '@/config/api'

export interface AgentReputation {
    agentId: number
    score: number           // 0–5
    reviewCount: number
    successRate: string     // e.g. "98.5%"
    uptime: string          // e.g. "99.9%"
    avgResponseMs: number
    type: string            // "CDP Provider"
}

export function useAgentReputation(agentId: number | undefined) {
    return useQuery<AgentReputation>({
        queryKey: ['agent-reputation', agentId],
        queryFn: async () => {
            const res = await fetch(`${API_BASE}/agents/${agentId}/reputation`)
            if (!res.ok) throw new Error('Failed to fetch agent reputation')
            return res.json()
        },
        enabled: agentId != null,
        staleTime: 60_000,
        refetchInterval: 60_000,
    })
}
