import { NavLink, useLocation } from 'react-router-dom'
import {
    LayoutDashboard,
    TrendingUp,
    Coins,
    BarChart3,
    Bot,
    MessageCircle,
    Snowflake,
    Store,
    ListOrdered,
} from 'lucide-react'

const PROTOCOL_ITEMS = [
    { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/borrow', icon: TrendingUp, label: 'Borrow (Trove)' },
    { to: '/earn', icon: Coins, label: 'Earn (SP)' },
    { to: '/stats', icon: BarChart3, label: 'Stats' },
]

const LEND_ITEMS = [
    { to: '/lend', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/lend/markets', icon: Store, label: 'Markets' },
    { to: '/lend/positions', icon: ListOrdered, label: 'Positions' },
]

const AI_ITEMS = [
    { to: '/agent', icon: Bot, label: 'Agent' },
    { to: '/chat', icon: MessageCircle, label: 'Chat' },
]

function NavGroup({ title, items, location }: { title: string, items: any[], location: any }) {
    return (
        <div className="mb-6">
            <h3 className="px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                {title}
            </h3>
            <div className="space-y-1">
                {items.map(({ to, icon: Icon, label }) => {
                    const active = location.pathname.startsWith(to) && (to !== '/lend' || location.pathname === '/lend') && (to !== '/dashboard' || location.pathname === '/dashboard')
                    return (
                        <NavLink
                            key={to}
                            to={to}
                            className={`flex items-center gap-3 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 group ${active
                                ? 'bg-ice-400/15 text-ice-300 shadow-ice'
                                : 'text-gray-400 hover:text-white hover:bg-dark-600/50'
                                }`}
                        >
                            <Icon className={`w-4 h-4 transition-colors ${active ? 'text-ice-400' : 'group-hover:text-ice-400'}`} />
                            {label}
                            {active && (
                                <div className="ml-auto w-1.5 h-1.5 rounded-full bg-ice-400" />
                            )}
                        </NavLink>
                    )
                })}
            </div>
        </div>
    )
}

export function Sidebar() {
    const location = useLocation()

    return (
        <aside className="w-60 min-h-screen bg-dark-800 border-r border-dark-400/40 flex flex-col">
            {/* Logo */}
            <div className="px-6 py-6 border-b border-dark-400/30">
                <NavLink to="/" className="flex items-center gap-2 group">
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-ice-400 to-ice-600 flex items-center justify-center shadow-ice group-hover:shadow-ice-lg transition-shadow">
                        <Snowflake className="w-4 h-4 text-white" />
                    </div>
                    <span className="text-white font-bold text-lg tracking-tight">Snowball</span>
                </NavLink>
            </div>

            {/* Navigation */}
            <nav className="flex-1 px-3 py-4 overflow-y-auto">
                <NavGroup title="Protocol" items={PROTOCOL_ITEMS} location={location} />
                <NavGroup title="Lend" items={LEND_ITEMS} location={location} />
                <NavGroup title="AI" items={AI_ITEMS} location={location} />
            </nav>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-dark-400/30">
                <p className="text-[10px] text-gray-600 text-center">Creditcoin Testnet · v0.1.0</p>
            </div>
        </aside>
    )
}
