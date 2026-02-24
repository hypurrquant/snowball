import { NavLink, useLocation } from 'react-router-dom'
import {
    LayoutDashboard,
    TrendingUp,
    Coins,
    BarChart3,
    Bot,
} from 'lucide-react'

const NAV_ITEMS = [
    { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/borrow', icon: TrendingUp, label: 'Borrow' },
    { to: '/earn', icon: Coins, label: 'Earn' },
    { to: '/stats', icon: BarChart3, label: 'Stats' },
    { to: '/agent', icon: Bot, label: 'Agent' },
]

export function MobileNav() {
    const location = useLocation()

    return (
        <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-dark-800/95 backdrop-blur-md border-t border-dark-400/30 safe-area-bottom">
            <div className="flex items-center justify-around px-2 py-1">
                {NAV_ITEMS.map(({ to, icon: Icon, label }) => {
                    const active = location.pathname === to
                    return (
                        <NavLink
                            key={to}
                            to={to}
                            className={`flex flex-col items-center justify-center min-w-[44px] min-h-[44px] px-2 py-1.5 rounded-xl text-[10px] font-medium transition-colors ${
                                active
                                    ? 'text-ice-400'
                                    : 'text-gray-500 active:text-gray-300'
                            }`}
                        >
                            <Icon className={`w-5 h-5 mb-0.5 ${active ? 'text-ice-400' : ''}`} />
                            {label}
                        </NavLink>
                    )
                })}
            </div>
        </nav>
    )
}
