import { useNavigate } from 'react-router-dom'
import { ArrowRight, Snowflake, TrendingUp, Shield, Zap, ChevronRight } from 'lucide-react'
import { useProtocolStats } from '@/hooks/useProtocolStats'
import { StatCard } from '@/components/common/StatCard'
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Legend,
} from 'recharts'

// Mock comparison chart data
const chartData = [
    { day: 'Jan', agent: 100, manual: 100 },
    { day: 'Feb', agent: 108, manual: 103 },
    { day: 'Mar', agent: 118, manual: 104 },
    { day: 'Apr', agent: 131, manual: 106 },
    { day: 'May', agent: 147, manual: 107 },
    { day: 'Jun', agent: 165, manual: 110 },
    { day: 'Jul', agent: 184, manual: 112 },
]

const HOW_IT_WORKS = [
    { step: '1', icon: Shield, title: 'Deposit CTC', desc: 'Deposit wCTC or lstCTC as collateral.' },
    { step: '2', icon: Zap, title: 'AI Manages', desc: 'The AI agent monitors your CR and auto-optimizes.' },
    { step: '3', icon: TrendingUp, title: 'Receive sbUSD', desc: 'Mint and utilize sbUSD while maintaining a safe collateral ratio.' },
]

export function Landing() {
    const navigate = useNavigate()
    const { data: stats, isLoading } = useProtocolStats()

    return (
        <div className="min-h-screen bg-dark-900 text-white font-sans">
            {/* Navbar */}
            <nav className="fixed top-0 inset-x-0 z-50 flex items-center justify-between px-8 py-4 bg-dark-900/80 backdrop-blur-lg border-b border-dark-400/20">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-ice-400 to-ice-600 flex items-center justify-center shadow-ice">
                        <Snowflake className="w-4 h-4 text-white" />
                    </div>
                    <span className="text-white font-bold text-lg tracking-tight">Snowball</span>
                </div>
                <button
                    onClick={() => navigate('/dashboard')}
                    className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-ice-500 to-ice-600 rounded-xl text-sm font-semibold shadow-ice hover:shadow-ice-lg transition-all duration-200"
                >
                    Launch App <ArrowRight className="w-4 h-4" />
                </button>
            </nav>

            {/* Hero */}
            <section className="relative flex flex-col items-center justify-center min-h-screen text-center px-6 overflow-hidden">
                {/* Background glow */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-ice-400/5 blur-3xl pointer-events-none" />
                <div className="absolute top-1/3 left-1/4 w-64 h-64 rounded-full bg-ice-600/5 blur-3xl pointer-events-none" />

                {/* Snowball SVG animation */}
                <div className="animate-float mb-8">
                    <div className="w-24 h-24 rounded-full bg-gradient-to-br from-ice-300/30 to-ice-600/30 border border-ice-400/20 backdrop-blur flex items-center justify-center shadow-ice-lg">
                        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-ice-400 to-ice-600 flex items-center justify-center shadow-ice animate-glow">
                            <Snowflake className="w-8 h-8 text-white" />
                        </div>
                    </div>
                </div>

                <div className="relative z-10 space-y-6 max-w-3xl">
                    <div className="inline-flex items-center gap-2 bg-ice-400/10 border border-ice-400/20 rounded-full px-4 py-1.5 text-xs font-medium text-ice-300 mb-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-status-safe animate-pulse" />
                        Creditcoin Testnet · AI Agent DeFi
                    </div>
                    <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight leading-tight">
                        Stop just<br />
                        <span className="bg-gradient-to-r from-ice-300 to-ice-500 bg-clip-text text-transparent">holding.</span>
                        <br />Start earning.
                    </h1>
                    <p className="text-lg text-gray-400 max-w-xl mx-auto leading-relaxed">
                        AI Agent automatically puts your CTC to work.<br />
                        Collateral deposits, sbUSD minting, yield optimization.
                    </p>
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                        <button
                            onClick={() => navigate('/dashboard')}
                            className="flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-ice-400 to-ice-600 rounded-2xl text-base font-bold shadow-ice-lg hover:shadow-[0_0_48px_rgba(96,165,250,0.5)] transition-all duration-300 hover:scale-105"
                        >
                            Launch Agent <ChevronRight className="w-5 h-5" />
                        </button>
                        <a
                            href="#how"
                            className="px-8 py-4 bg-dark-700 border border-dark-400/50 rounded-2xl text-base font-semibold text-gray-300 hover:text-white hover:border-ice-400/30 transition-all duration-200"
                        >
                            How it Works
                        </a>
                    </div>
                </div>

                {/* Stats row */}
                <div className="relative z-10 mt-16 grid grid-cols-2 md:grid-cols-4 gap-4 w-full max-w-3xl">
                    {[
                        { label: 'TVL', value: isLoading ? '...' : `$${Number(stats?.totalCollateralUSD ?? 0).toLocaleString('en-US', { maximumFractionDigits: 0 })}` },
                        { label: 'Total Borrowed', value: isLoading ? '...' : `$${Number(stats?.totalBorrowedUSD ?? 0).toLocaleString('en-US', { maximumFractionDigits: 0 })}` },
                        { label: 'sbUSD Price', value: isLoading ? '...' : `$${Number(stats?.sbUSDPrice ?? 1).toFixed(2)}` },
                        { label: 'Active Agents', value: isLoading ? '...' : String(stats?.activeAgents ?? 0) },
                    ].map(({ label, value }) => (
                        <div key={label} className="bg-dark-800/60 backdrop-blur border border-dark-400/30 rounded-2xl p-4 text-center hover:border-ice-400/20 transition-colors">
                            <p className="text-2xl font-bold text-white">{value}</p>
                            <p className="text-xs text-gray-500 mt-1">{label}</p>
                        </div>
                    ))}
                </div>
            </section>

            {/* How it Works */}
            <section id="how" className="px-6 py-24 max-w-5xl mx-auto">
                <h2 className="text-3xl font-bold text-center mb-12 text-white">How Snowball Works</h2>
                <div className="grid md:grid-cols-3 gap-6">
                    {HOW_IT_WORKS.map(({ step, icon: Icon, title, desc }) => (
                        <div key={step} className="relative bg-dark-800 border border-dark-400/40 rounded-2xl p-6 text-center hover:border-ice-400/30 hover:shadow-card-hover transition-all duration-300 group">
                            <div className="absolute top-4 right-4 text-4xl font-black text-dark-600 group-hover:text-ice-400/10 transition-colors">{step}</div>
                            <div className="w-12 h-12 rounded-2xl bg-ice-400/10 flex items-center justify-center mx-auto mb-4 group-hover:bg-ice-400/20 transition-colors">
                                <Icon className="w-6 h-6 text-ice-400" />
                            </div>
                            <h3 className="text-lg font-bold text-white mb-2">{title}</h3>
                            <p className="text-sm text-gray-400 leading-relaxed">{desc}</p>
                        </div>
                    ))}
                </div>
            </section>

            {/* Chart */}
            <section className="px-6 pb-24 max-w-5xl mx-auto">
                <h2 className="text-3xl font-bold text-center mb-4 text-white">Agent vs Manual Returns</h2>
                <p className="text-center text-gray-500 text-sm mb-10">Using the AI agent enables automatic optimization for higher expected returns.</p>
                <div className="bg-dark-800 border border-dark-400/40 rounded-2xl p-6">
                    <ResponsiveContainer width="100%" height={280}>
                        <AreaChart data={chartData}>
                            <defs>
                                <linearGradient id="gradAgent" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#60a5fa" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#60a5fa" stopOpacity={0} />
                                </linearGradient>
                                <linearGradient id="gradManual" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#6b7280" stopOpacity={0.2} />
                                    <stop offset="95%" stopColor="#6b7280" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                            <XAxis dataKey="day" stroke="#4b5563" tick={{ fill: '#6b7280', fontSize: 12 }} />
                            <YAxis stroke="#4b5563" tick={{ fill: '#6b7280', fontSize: 12 }} tickFormatter={(v) => `${v}`} />
                            <Tooltip
                                contentStyle={{ background: '#111827', border: '1px solid #374151', borderRadius: 12, color: '#fff' }}
                                formatter={(val: number, name: string) => [`${val}`, name === 'agent' ? '🤖 AI Agent' : '👤 Manual']}
                            />
                            <Legend formatter={(v) => v === 'agent' ? '🤖 AI Agent' : '👤 Manual'} />
                            <Area type="monotone" dataKey="agent" stroke="#60a5fa" strokeWidth={2} fill="url(#gradAgent)" name="agent" />
                            <Area type="monotone" dataKey="manual" stroke="#6b7280" strokeWidth={2} fill="url(#gradManual)" name="manual" />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </section>

            {/* Footer */}
            <footer className="border-t border-dark-400/20 py-8 px-6 text-center text-gray-600 text-sm">
                <div className="flex items-center justify-center gap-6 mb-4">
                    <a href="#" className="hover:text-ice-400 transition-colors">Docs</a>
                    <a href="#" className="hover:text-ice-400 transition-colors">Twitter</a>
                    <a href="#" className="hover:text-ice-400 transition-colors">Discord</a>
                </div>
                <p>© 2025 Snowball Protocol · Creditcoin Network</p>
            </footer>
        </div>
    )
}
