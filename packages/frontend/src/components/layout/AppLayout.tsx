import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { Header } from './Header'
import { MobileNav } from './MobileNav'
import { FloatingChat } from '@/components/chat/FloatingChat'
import { OnboardingModal } from '@/components/onboarding/OnboardingModal'

export function AppLayout() {
    const [showOnboarding, setShowOnboarding] = useState(
        () => !localStorage.getItem('snowball_onboarding_seen')
    )

    return (
        <div className="flex min-h-screen bg-dark-900">
            {/* Sidebar — hidden on mobile */}
            <div className="hidden lg:flex">
                <Sidebar />
            </div>

            {/* Main */}
            <div className="flex-1 flex flex-col min-w-0">
                <Header />
                <main className="flex-1 overflow-auto p-4 lg:p-6 pb-20 lg:pb-6">
                    <Outlet />
                </main>
            </div>

            {/* Mobile bottom navigation */}
            <MobileNav />

            {/* Floating chatbot — offset on mobile for bottom nav */}
            <FloatingChat />

            {/* Onboarding modal */}
            {showOnboarding && <OnboardingModal onClose={() => setShowOnboarding(false)} />}
        </div>
    )
}
