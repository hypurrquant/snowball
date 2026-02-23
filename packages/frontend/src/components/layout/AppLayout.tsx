import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { Header } from './Header'
import { MobileNav } from './MobileNav'
import { FloatingChat } from '@/components/chat/FloatingChat'

export function AppLayout() {
    return (
        <div className="flex h-screen bg-dark-900">
            {/* Sidebar — hidden on mobile */}
            <div className="hidden lg:flex">
                <Sidebar />
            </div>

            {/* Main */}
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
                <Header />
                <main className="flex-1 overflow-y-auto p-4 lg:p-6 pb-20 lg:pb-6">
                    <Outlet />
                </main>
            </div>

            {/* Mobile bottom navigation */}
            <MobileNav />

            {/* Floating chatbot — offset on mobile for bottom nav */}
            <FloatingChat />
        </div>
    )
}
