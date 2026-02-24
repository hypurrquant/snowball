import { useState } from 'react'
import { Loader2, Bot, Shield, Zap } from 'lucide-react'
import { usePrivyServerWallet } from '@/hooks/usePrivyServerWallet'

const STRATEGIES = [
    { value: 'conservative', label: 'Conservative', desc: 'CR > 200% — Very safe, low risk' },
    { value: 'moderate', label: 'Moderate', desc: 'CR > 160% — Balanced approach' },
    { value: 'aggressive', label: 'Aggressive', desc: 'CR > 130% — Higher yield, higher risk' },
]

interface AgentActivationProps {
    onComplete?: () => void
}

export function AgentActivation({ onComplete }: AgentActivationProps) {
    const { activeAddress, createServerWallet, hasServerWallet } = usePrivyServerWallet()
    const [strategy, setStrategy] = useState('conservative')
    const [minCR, setMinCR] = useState(200)
    const [autoRebalance, setAutoRebalance] = useState(true)
    const [autoRateAdjust, setAutoRateAdjust] = useState(true)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const handleActivate = async () => {
        if (!activeAddress) return
        setLoading(true)
        setError(null)
        try {
            await createServerWallet({ strategy, minCR, autoRebalance, autoRateAdjust })
            onComplete?.()
        } catch (err: any) {
            setError(err.message || 'Failed to activate agent')
        } finally {
            setLoading(false)
        }
    }

    if (hasServerWallet) return null

    return (
        <div className="bg-dark-700 border border-dark-400/40 rounded-2xl p-5 space-y-5">
            <div className="flex items-center gap-2">
                <Bot className="w-5 h-5 text-ice-400" />
                <h3 className="font-semibold text-white">Activate Agent</h3>
            </div>

            <p className="text-sm text-gray-400">
                Privy creates a secure server wallet for your account. The agent uses this wallet
                to automatically manage your positions based on your strategy settings.
            </p>

            {/* Strategy selection */}
            <div className="space-y-2">
                <label className="text-xs text-gray-500">Strategy</label>
                {STRATEGIES.map((s) => (
                    <button
                        key={s.value}
                        onClick={() => {
                            setStrategy(s.value)
                            if (s.value === 'conservative') setMinCR(200)
                            else if (s.value === 'moderate') setMinCR(160)
                            else setMinCR(130)
                        }}
                        className={`w-full text-left px-4 py-3 rounded-xl text-sm transition-colors border ${
                            strategy === s.value
                                ? 'bg-ice-400/10 border-ice-400/30 text-ice-300'
                                : 'bg-dark-600 border-dark-400/30 text-gray-300 hover:border-dark-300/50'
                        }`}
                    >
                        <p className="font-medium">{s.label}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{s.desc}</p>
                    </button>
                ))}
            </div>

            {/* Min CR slider */}
            <div className="space-y-2">
                <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Min CR Target</span>
                    <span className="text-white font-semibold">{minCR}%</span>
                </div>
                <input
                    type="range" min={130} max={300} value={minCR}
                    onChange={(e) => setMinCR(Number(e.target.value))}
                    className="w-full h-1.5 rounded-full appearance-none bg-dark-500 accent-ice-400 cursor-pointer"
                />
            </div>

            {/* Auto toggles */}
            <div className="space-y-2">
                {[
                    { label: 'Auto-Rebalance (add collateral when CR drops)', checked: autoRebalance, set: setAutoRebalance },
                    { label: 'Auto-Rate Adjust (optimize interest rate)', checked: autoRateAdjust, set: setAutoRateAdjust },
                ].map(({ label, checked, set }) => (
                    <label key={label} className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => set(!checked)}
                            className="accent-ice-400"
                        />
                        {label}
                    </label>
                ))}
            </div>

            {/* How it works */}
            <div className="bg-dark-600/50 rounded-xl p-3 space-y-2 text-xs text-gray-500">
                <p className="font-medium text-gray-400 flex items-center gap-1">
                    <Shield className="w-3 h-3" /> How it works
                </p>
                <ul className="space-y-1 ml-4 list-disc">
                    <li>A secure Privy server wallet is created for your account</li>
                    <li>Transfer collateral to this wallet for agent management</li>
                    <li>The agent monitors your positions and executes based on your strategy</li>
                    <li>You can deactivate at any time and withdraw your funds</li>
                </ul>
            </div>

            {error && (
                <div className="text-xs text-status-danger bg-status-danger/10 border border-status-danger/20 rounded-xl px-3 py-2">
                    {error}
                </div>
            )}

            <button
                onClick={handleActivate}
                disabled={loading || !activeAddress}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold bg-gradient-to-r from-ice-500 to-ice-600 text-white shadow-ice hover:shadow-ice-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
                {loading ? (
                    <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Creating Server Wallet...
                    </>
                ) : (
                    <>
                        <Zap className="w-4 h-4" />
                        Activate Agent
                    </>
                )}
            </button>
        </div>
    )
}
