import { useCallback } from 'react'
import { useAccount } from 'wagmi'
import { useAgents } from '@/hooks/useAgents'
import { useAgentReputation } from '@/hooks/useAgentReputation'
import { useUserPositions } from '@/hooks/useUserPositions'
import { usePrivyServerWallet } from '@/hooks/usePrivyServerWallet'
import { AgentStatus } from '@/components/agent/AgentStatus'
import { AgentSettings } from '@/components/agent/AgentSettings'
import { AgentActivation } from '@/components/agent/AgentActivation'
import { PermissionStatus } from '@/components/agent/PermissionStatus'
import { ActivityLog } from '@/components/agent/ActivityLog'
import { Star, CheckCircle2, Clock, Activity, RefreshCw } from 'lucide-react'
import { API_BASE } from '@/config/api'

function ReputationCard({ agentId }: { agentId: number }) {
    const { data: rep, isLoading } = useAgentReputation(agentId)

    const score = rep?.score ?? 0
    const reviewCount = rep?.reviewCount ?? 0
    const successRate = rep?.successRate ?? '—'
    const uptime = rep?.uptime ?? '—'
    const avgResponse = rep?.avgResponseMs ? `${(rep.avgResponseMs / 1000).toFixed(1)}s` : '—'
    const type = rep?.type ?? 'CDP Provider'

    return (
        <div className="bg-dark-700 border border-dark-400/40 rounded-2xl p-5 space-y-4">
            <h3 className="font-semibold text-white">Agent Reputation (ERC-8004)</h3>

            {isLoading ? (
                <div className="space-y-2">
                    {[1, 2, 3].map((i) => <div key={i} className="h-4 bg-dark-500 rounded animate-pulse" />)}
                </div>
            ) : (
                <>
                    <div className="flex items-center gap-2">
                        <div className="flex gap-0.5">
                            {[1, 2, 3, 4, 5].map((s) => (
                                <Star
                                    key={s}
                                    className={`w-5 h-5 ${s <= Math.round(score) ? 'text-yellow-400 fill-yellow-400' : 'text-dark-400'}`}
                                />
                            ))}
                        </div>
                        <span className="text-white font-bold">{score > 0 ? `${score.toFixed(1)}/5.0` : '—'}</span>
                        <span className="text-gray-500 text-sm">({reviewCount} reviews)</span>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-sm">
                        {[
                            { label: 'Success Rate', value: successRate },
                            { label: 'Uptime', value: uptime },
                            { label: 'Avg Response', value: avgResponse },
                            { label: 'Type', value: type },
                        ].map(({ label, value }) => (
                            <div key={label} className="bg-dark-600/50 rounded-xl p-3">
                                <p className="text-gray-500 text-xs">{label}</p>
                                <p className="text-white font-semibold">{value}</p>
                            </div>
                        ))}
                    </div>
                </>
            )}
        </div>
    )
}

export function Agent() {
    const { address } = useAccount()
    const { data: agents = [], isLoading: agentsLoading } = useAgents()
    const { data: positions = [] } = useUserPositions(address)
    const { hasServerWallet, refetchServerWallet } = usePrivyServerWallet()

    // Prefer cdp_provider agent
    const cdpAgent = agents.find((a) => a.type === 'cdp_provider') ?? agents[0]
    const agentId = cdpAgent?.id

    const managedCount = positions.filter((p) => p.agentManaged).length
    const totalValueManaged = positions
        .filter((p) => p.agentManaged)
        .reduce((acc, p) => acc + parseFloat(p.collateralUSD), 0)

    const handleSettingsSave = useCallback(async (settings: { minCR: number; autoRebalance: boolean; liquidationAlert: boolean; strategy: string }) => {
        try {
            await fetch(`${API_BASE}/agent/settings`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userAddress: address,
                    ...settings,
                }),
            })
        } catch {
            // Settings saved locally even if backend fails
        }
    }, [address])

    return (
        <div className="space-y-6 animate-fade-in">
            <div>
                <h1 className="text-2xl font-bold text-white">Your Snowball Agent</h1>
                <p className="text-gray-500 text-sm mt-1">View agent status, settings, and reputation.</p>
            </div>

            {/* Overview cards */}
            <div className="grid sm:grid-cols-3 gap-4 text-sm">
                {[
                    {
                        label: 'Managed Positions',
                        value: agentsLoading ? '—' : String(cdpAgent?.managedPositions ?? managedCount),
                        icon: <Activity className="w-4 h-4" />,
                    },
                    {
                        label: 'Total Value Managed',
                        value: agentsLoading
                            ? '—'
                            : `$${(parseFloat(cdpAgent?.totalValueManaged ?? '0') || totalValueManaged).toLocaleString('en-US', { maximumFractionDigits: 0 })}`,
                        icon: <CheckCircle2 className="w-4 h-4" />,
                    },
                    {
                        label: 'Last Action',
                        value: cdpAgent?.lastActionAt
                            ? new Date(cdpAgent.lastActionAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
                            : '—',
                        icon: <Clock className="w-4 h-4" />,
                    },
                ].map(({ label, value, icon }) => (
                    <div key={label} className="bg-dark-700 border border-dark-400/40 rounded-2xl p-4 flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-ice-400/10 flex items-center justify-center text-ice-400 flex-shrink-0">
                            {icon}
                        </div>
                        <div>
                            <p className="text-gray-500 text-xs">{label}</p>
                            {agentsLoading
                                ? <div className="h-4 w-16 bg-dark-500 rounded animate-pulse mt-1" />
                                : <p className="text-white font-bold">{value}</p>
                            }
                        </div>
                    </div>
                ))}
            </div>

            <div className="grid xl:grid-cols-2 gap-6">
                {/* Left */}
                <div className="space-y-5">
                    <AgentStatus agentId={agentId} />

                    {/* Server wallet status */}
                    <PermissionStatus onDeactivated={() => refetchServerWallet()} />

                    {/* Activation wizard (shows only when no server wallet) */}
                    {!hasServerWallet && (
                        <AgentActivation onComplete={() => refetchServerWallet()} />
                    )}

                    <AgentSettings onSave={handleSettingsSave} />
                </div>

                {/* Right */}
                <div className="space-y-5">
                    {agentId != null && <ReputationCard agentId={agentId} />}

                    <div className="bg-dark-700 border border-dark-400/40 rounded-2xl p-5 space-y-3">
                        <div className="flex items-center justify-between">
                            <h3 className="font-semibold text-white">Activity History</h3>
                            {agentId != null && (
                                <span className="text-xs text-gray-500 flex items-center gap-1">
                                    <RefreshCw className="w-3 h-3" /> Auto-refresh 15s
                                </span>
                            )}
                        </div>
                        <ActivityLog agentId={agentId} />
                    </div>
                </div>
            </div>
        </div>
    )
}
