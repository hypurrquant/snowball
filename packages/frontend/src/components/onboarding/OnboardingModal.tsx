import { useState } from 'react'
import { Shield, TrendingUp, AlertTriangle, DollarSign, Bot, Vault } from 'lucide-react'

const STORAGE_KEY = 'snowball_onboarding_seen'

const steps = [
    {
        icon: Vault,
        title: 'Trove',
        description: 'A position where you deposit collateral and borrow sbUSD. Each Trove represents one loan position.',
        color: 'text-ice-400',
        bg: 'bg-ice-400/10',
    },
    {
        icon: TrendingUp,
        title: 'CR (Collateral Ratio)',
        description: 'The ratio of collateral value to debt. Higher is safer. When collateral price drops, CR decreases.',
        color: 'text-status-safe',
        bg: 'bg-status-safe/10',
    },
    {
        icon: AlertTriangle,
        title: 'MCR (Minimum CR)',
        description: 'Minimum Collateral Ratio. If CR falls below this, your position gets liquidated. wCTC: 110%, lstCTC: 120%.',
        color: 'text-status-danger',
        bg: 'bg-status-danger/10',
    },
    {
        icon: Shield,
        title: 'CCR (Critical CR)',
        description: 'System-wide risk threshold. Triggers Recovery Mode when the system falls below this ratio. wCTC: 150%, lstCTC: 160%.',
        color: 'text-status-warn',
        bg: 'bg-status-warn/10',
    },
    {
        icon: DollarSign,
        title: 'Liquidation Price',
        description: 'The collateral price at which CR reaches MCR. If the price drops to this level, liquidation may occur.',
        color: 'text-status-danger',
        bg: 'bg-status-danger/10',
    },
    {
        icon: Bot,
        title: 'AI Agent',
        description: 'An AI agent that automatically optimizes CR and interest rates. Manages your positions according to your chosen strategy.',
        color: 'text-ice-300',
        bg: 'bg-ice-300/10',
    },
]

interface OnboardingModalProps {
    onClose: () => void
}

export function OnboardingModal({ onClose }: OnboardingModalProps) {
    const [dontShowAgain, setDontShowAgain] = useState(false)

    const handleStart = () => {
        if (dontShowAgain) {
            localStorage.setItem(STORAGE_KEY, 'true')
        }
        onClose()
    }

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-dark-900/80 backdrop-blur-md animate-fade-in">
            <div className="relative w-full max-w-2xl max-h-[90vh] mx-4 overflow-y-auto bg-dark-700 border border-dark-400/40 rounded-2xl shadow-card animate-slide-up">
                {/* Header */}
                <div className="sticky top-0 z-10 bg-dark-700 border-b border-dark-400/40 px-6 pt-6 pb-4 rounded-t-2xl">
                    <h2 className="text-2xl font-bold text-white">
                        Snowball DeFi Key Concepts
                    </h2>
                    <p className="mt-1 text-sm text-gray-400">
                        Key terms to know before you start borrowing.
                    </p>
                </div>

                {/* Steps */}
                <div className="px-6 py-4 space-y-3">
                    {steps.map((step) => (
                        <div
                            key={step.title}
                            className="flex items-start gap-4 p-4 bg-dark-600/50 border border-dark-400/30 rounded-xl"
                        >
                            <div className={`flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-lg ${step.bg}`}>
                                <step.icon className={`w-5 h-5 ${step.color}`} />
                            </div>
                            <div className="min-w-0">
                                <h3 className="text-sm font-semibold text-white">{step.title}</h3>
                                <p className="mt-0.5 text-sm text-gray-400 leading-relaxed">{step.description}</p>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Footer */}
                <div className="sticky bottom-0 z-10 bg-dark-700 border-t border-dark-400/40 px-6 py-4 rounded-b-2xl">
                    <div className="flex items-center justify-between">
                        <label className="flex items-center gap-2 cursor-pointer select-none">
                            <input
                                type="checkbox"
                                checked={dontShowAgain}
                                onChange={(e) => setDontShowAgain(e.target.checked)}
                            />
                            <span className="text-sm text-gray-400">Don't show again</span>
                        </label>
                        <button
                            onClick={handleStart}
                            className="btn-primary px-8"
                        >
                            Get Started
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}
