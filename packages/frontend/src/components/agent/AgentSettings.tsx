import { useState } from 'react'
import { Sliders, ToggleLeft, ToggleRight, ChevronDown } from 'lucide-react'

interface AgentSettingsProps {
    onSave?: (settings: {
        minCR: number
        autoRebalance: boolean
        liquidationAlert: boolean
        strategy: string
    }) => void
}

const STRATEGIES = [
    { value: 'conservative', label: 'Conservative', desc: 'CR > 200% — Very safe' },
    { value: 'moderate', label: 'Moderate', desc: 'CR > 160% — Balanced' },
    { value: 'aggressive', label: 'Aggressive', desc: 'CR > 130% — High yield' },
]

export function AgentSettings({ onSave }: AgentSettingsProps) {
    const [minCR, setMinCR] = useState(200)
    const [autoRebalance, setAutoRebalance] = useState(true)
    const [liquidationAlert, setLiquidationAlert] = useState(true)
    const [strategy, setStrategy] = useState('conservative')
    const [stratOpen, setStratOpen] = useState(false)
    const [saved, setSaved] = useState(false)

    const handleSave = () => {
        onSave?.({ minCR, autoRebalance, liquidationAlert, strategy })
        setSaved(true)
        setTimeout(() => setSaved(false), 2000)
    }

    const currentStrategy = STRATEGIES.find((s) => s.value === strategy)

    return (
        <div className="bg-dark-700 border border-dark-400/40 rounded-2xl p-5 space-y-5">
            <div className="flex items-center gap-2">
                <Sliders className="w-5 h-5 text-ice-400" />
                <h3 className="font-semibold text-white">Agent Settings</h3>
            </div>

            {/* Min CR */}
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
                <div className="flex justify-between text-[10px] text-gray-600">
                    <span>130% (Risky)</span>
                    <span>300% (Safe)</span>
                </div>
            </div>

            {/* Strategy dropdown */}
            <div className="space-y-1.5 relative">
                <span className="text-sm text-gray-400">Strategy</span>
                <button
                    onClick={() => setStratOpen(!stratOpen)}
                    className="w-full flex items-center justify-between bg-dark-600 border border-dark-400/40 rounded-xl px-4 py-2.5 text-sm text-white"
                >
                    <span>{currentStrategy?.label} — {currentStrategy?.desc}</span>
                    <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${stratOpen ? 'rotate-180' : ''}`} />
                </button>
                {stratOpen && (
                    <div className="absolute left-0 right-0 top-[calc(100%+4px)] z-50 bg-dark-700 border border-dark-400/40 rounded-xl shadow-card overflow-hidden">
                        {STRATEGIES.map((s) => (
                            <button
                                key={s.value}
                                onClick={() => { setStrategy(s.value); setStratOpen(false) }}
                                className={`w-full text-left px-4 py-3 text-sm hover:bg-dark-600 transition-colors ${strategy === s.value ? 'text-ice-400' : 'text-gray-300'}`}
                            >
                                <p className="font-medium">{s.label}</p>
                                <p className="text-xs text-gray-500">{s.desc}</p>
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* Toggles */}
            <div className="space-y-3">
                {[
                    { label: 'Auto-Rebalance', value: autoRebalance, set: setAutoRebalance },
                    { label: 'Liquidation Alert', value: liquidationAlert, set: setLiquidationAlert },
                ].map(({ label, value, set }) => (
                    <div key={label} className="flex items-center justify-between">
                        <span className="text-sm text-gray-300">{label}</span>
                        <button onClick={() => set(!value)} className={`transition-colors ${value ? 'text-status-safe' : 'text-gray-600'}`}>
                            {value ? <ToggleRight className="w-6 h-6" /> : <ToggleLeft className="w-6 h-6" />}
                        </button>
                    </div>
                ))}
            </div>

            <button
                onClick={handleSave}
                className={`w-full py-2.5 rounded-xl text-sm font-semibold transition-all ${saved
                        ? 'bg-status-safe/20 text-status-safe border border-status-safe/30'
                        : 'bg-gradient-to-r from-ice-500 to-ice-600 text-white shadow-ice hover:shadow-ice-lg'
                    }`}
            >
                {saved ? '✓ Saved!' : 'Save Settings'}
            </button>
        </div>
    )
}
