import { useAccount } from 'wagmi'
import { useProtocolStats } from '@/hooks/useProtocolStats'
import { useUserPositions } from '@/hooks/useUserPositions'
import { useAgents } from '@/hooks/useAgents'
import { StatCard } from '@/components/common/StatCard'
import { AgentStatus } from '@/components/agent/AgentStatus'
import { ActivityLog } from '@/components/agent/ActivityLog'
import { PositionsList } from '@/components/positions/PositionsList'
import { Wallet, TrendingUp, DollarSign, Bot, PlusCircle } from 'lucide-react'
import addresses from '@/config/addresses.json'

export function Dashboard() {
    const { address, isConnected } = useAccount()
    const { data: stats, isLoading: statsLoading } = useProtocolStats()
    const { data: positions = [], isLoading: posLoading } = useUserPositions(address)
    const { data: agents = [] } = useAgents()

    // Use cdp_provider agent as default agentId
    const cdpAgent = agents.find((a) => a.type === 'cdp_provider') ?? agents[0]
    const agentId = cdpAgent?.id

    if (!isConnected) {
        return (
            <div className="flex flex-col items-center justify-center h-full min-h-[60vh] space-y-4">
                <div className="w-16 h-16 rounded-2xl bg-dark-700 border border-dark-400/40 flex items-center justify-center">
                    <Wallet className="w-8 h-8 text-ice-400" />
                </div>
                <h2 className="text-xl font-bold text-white">Connect Your Wallet</h2>
                <p className="text-gray-400 text-sm">Use the Connect Wallet button in the top right to connect MetaMask.</p>
            </div>
        )
    }

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-white">Dashboard</h1>
                    <p className="text-gray-500 text-sm mt-1">View protocol status and your positions.</p>
                </div>
                <button
                    onClick={async () => {
                        const tokens = [
                            { address: addresses.tokens.wCTC, symbol: 'wCTC', decimals: 18 },
                            { address: addresses.tokens.lstCTC, symbol: 'lstCTC', decimals: 18 },
                            { address: addresses.tokens.sbUSD, symbol: 'sbUSD', decimals: 18 },
                        ]
                        for (const t of tokens) {
                            try {
                                await (window as any).ethereum?.request({
                                    method: 'wallet_watchAsset',
                                    params: { type: 'ERC20', options: t },
                                })
                            } catch {}
                        }
                    }}
                    className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl bg-ice-400/10 text-ice-400 border border-ice-400/20 hover:bg-ice-400/20 transition-colors"
                >
                    <PlusCircle className="w-3.5 h-3.5" /> Add Tokens
                </button>
            </div>

            {/* Protocol Stats */}
            <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
                <StatCard
                    label="TVL"
                    value={`$${Number(stats?.totalCollateralUSD ?? 0).toLocaleString()}`}
                    icon={<TrendingUp className="w-4 h-4" />}
                    loading={statsLoading}
                />
                <StatCard
                    label="Total Borrowed"
                    value={`$${Number(stats?.totalBorrowedUSD ?? 0).toLocaleString()}`}
                    icon={<DollarSign className="w-4 h-4" />}
                    loading={statsLoading}
                />
                <StatCard
                    label="sbUSD Price"
                    value={`$${Number(stats?.sbUSDPrice ?? 1).toFixed(2)}`}
                    sub="1:1 USD peg"
                    loading={statsLoading}
                />
                <StatCard
                    label="Active Agents"
                    value={String(stats?.activeAgents ?? 0)}
                    icon={<Bot className="w-4 h-4" />}
                    loading={statsLoading}
                />
            </div>

            <div className="grid xl:grid-cols-3 gap-6">
                {/* Left: Agent status + Positions */}
                <div className="xl:col-span-2 space-y-4">
                    {/* AgentStatus: cdp_provider agent from API */}
                    <AgentStatus agentId={agentId} />

                    <div>
                        <h2 className="text-base font-semibold text-white mb-3">My Positions</h2>
                        <PositionsList positions={positions} loading={posLoading} />
                    </div>
                </div>

                {/* Right: Activity log */}
                <div>
                    <div className="bg-dark-700 border border-dark-400/40 rounded-2xl p-5">
                        <h3 className="text-base font-semibold text-white mb-4">Agent Activity</h3>
                        <ActivityLog agentId={agentId} />
                    </div>
                </div>
            </div>
        </div>
    )
}
