import { useAgents } from '@/hooks/useAgents'
import { Bot, Activity, Shield, RefreshCw } from 'lucide-react'

const STRATEGY_LABELS: Record<string, string> = {
    conservative: 'Conservative (CR > 200%)',
    moderate: 'Moderate (CR > 160%)',
    aggressive: 'Aggressive (CR > 130%)',
}

interface AgentStatusProps {
    /** Agent ID to display (defaults to first cdp_provider) */
    agentId?: number
}

export function AgentStatus({ agentId }: AgentStatusProps) {
    const { data: agentsData, isLoading } = useAgents()
    const agents = agentsData ?? []

    // Use specified ID or prefer cdp_provider type agent
    const agent = agentId
        ? agents.find((a) => a.id === agentId)
        : agents.find((a) => a.type === 'cdp_provider') ?? agents[0]

    // Show skeleton only on first load (no data ever received)
    if (isLoading && agentsData === undefined) {
        return (
            <div className="bg-dark-700 border border-dark-400/40 rounded-2xl p-5">
                <div className="flex items-center gap-2 mb-4">
                    <Bot className="w-5 h-5 text-ice-400" />
                    <div className="h-4 w-28 bg-dark-500 rounded animate-pulse" />
                </div>
                <div className="space-y-2">
                    <div className="h-3 w-48 bg-dark-500 rounded animate-pulse" />
                    <div className="h-3 w-36 bg-dark-500 rounded animate-pulse" />
                </div>
            </div>
        )
    }

    const active = agent?.status === 'active'
    const strategy = agent?.strategy ?? 'conservative'
    const lastAction = agent?.lastActionAt
        ? new Date(agent.lastActionAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
        : undefined

    return (
        <div className="bg-dark-700 border border-dark-400/40 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Bot className="w-5 h-5 text-ice-400" />
                    <h3 className="font-semibold text-white">Agent Status</h3>
                    {agent && (
                        <span className="text-xs text-gray-500">#{agent.id}</span>
                    )}
                </div>
                <div
                    className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border ${active
                            ? 'bg-status-safe/10 text-status-safe border-status-safe/20'
                            : 'bg-dark-500 text-gray-500 border-dark-400/40'
                        }`}
                >
                    <div className={`w-1.5 h-1.5 rounded-full ${active ? 'bg-status-safe animate-pulse' : 'bg-gray-500'}`} />
                    {active ? 'Active' : agent?.status === 'paused' ? 'Paused' : 'Inactive'}
                </div>
            </div>

            <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2 text-gray-400">
                    <Shield className="w-4 h-4 text-ice-400 flex-shrink-0" />
                    <span>Strategy:</span>
                    <span className="text-white">{STRATEGY_LABELS[strategy] ?? strategy}</span>
                </div>
                {agent?.managedPositions != null && (
                    <div className="flex items-center gap-2 text-gray-400">
                        <Activity className="w-4 h-4 text-ice-400 flex-shrink-0" />
                        <span>Managed Positions:</span>
                        <span className="text-white">{agent.managedPositions}</span>
                    </div>
                )}
                {lastAction && (
                    <div className="flex items-center gap-2 text-gray-500 text-xs">
                        <RefreshCw className="w-3.5 h-3.5 flex-shrink-0" />
                        <span>Last action: {lastAction}</span>
                    </div>
                )}
            </div>
        </div>
    )
}
