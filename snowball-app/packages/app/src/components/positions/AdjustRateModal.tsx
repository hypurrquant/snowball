import { useState, useEffect } from 'react'
import { useAccount } from 'wagmi'
import { parseEther } from 'viem'
import { Position } from '@/hooks/useUserPositions'
import { useAdjustInterestRate } from '@/hooks/useAdjustInterestRate'
import { useQueryClient } from '@tanstack/react-query'
import { X, Loader2, CheckCircle, AlertTriangle, Snowflake } from 'lucide-react'

type Step = 'idle' | 'signing' | 'confirming' | 'done'

const MARKET_AVG_RATE = 6.5

interface AdjustRateModalProps {
    position: Position
    onClose: () => void
}

export function AdjustRateModal({ position, onClose }: AdjustRateModalProps) {
    const { address } = useAccount()
    const queryClient = useQueryClient()
    const currentRate = parseFloat(position.interestRate)
    const [newRate, setNewRate] = useState(currentRate)
    const [step, setStep] = useState<Step>('idle')
    const [error, setError] = useState<string | null>(null)

    const { adjustRate, isConfirmed, isReverted } = useAdjustInterestRate()

    const branch = position.branch as 0 | 1
    const isLoading = step !== 'idle' && step !== 'done'

    useEffect(() => {
        if (isConfirmed && step === 'confirming') {
            setStep('done')
            queryClient.invalidateQueries({ queryKey: ['user-positions'] })
        }
    }, [isConfirmed, step, queryClient])

    useEffect(() => {
        if (isReverted && step === 'confirming') {
            setError('Transaction reverted on-chain. Interest rate adjustment is not supported by the current contract.')
            setStep('idle')
        }
    }, [isReverted, step])

    const handleAdjustRate = async () => {
        if (!address) return
        setError(null)

        try {
            const newRateWei = parseEther((newRate / 100).toString())
            const maxUpfrontFee = parseEther('1000') // generous max fee

            setStep('signing')
            await adjustRate({
                branch,
                troveId: BigInt(position.troveId),
                newRate: newRateWei,
                maxUpfrontFee,
            })
            setStep('confirming')
        } catch (err: any) {
            console.error('Adjust rate failed:', err)
            setError(err?.shortMessage ?? err?.message ?? 'Failed to adjust interest rate')
            setStep('idle')
        }
    }

    const rateChanged = Math.abs(newRate - currentRate) > 0.05
    const marketAvgPosition = ((MARKET_AVG_RATE - 0.5) / (25 - 0.5)) * 100
    const currentRatePosition = ((currentRate - 0.5) / (25 - 0.5)) * 100

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
            <div
                className="bg-dark-700 border border-dark-400/40 rounded-2xl w-full max-w-sm p-6 space-y-5 shadow-2xl animate-fade-in"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between">
                    <h2 className="text-lg font-bold text-white">Adjust Interest Rate</h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Current rate */}
                <div className="bg-dark-600/50 rounded-xl p-4 text-sm">
                    <div className="flex justify-between mb-1">
                        <span className="text-gray-400">Trove</span>
                        <span className="text-white font-semibold">#{position.troveId} ({position.collateralSymbol})</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-gray-400">Current Rate</span>
                        <span className="text-white font-semibold">{currentRate}% APR</span>
                    </div>
                </div>

                {/* Rate slider with market average marker */}
                <div>
                    <div className="flex justify-between text-sm mb-2">
                        <label className="text-gray-400">New Rate</label>
                        <span className="text-white font-bold">{newRate.toFixed(1)}% APR</span>
                    </div>
                    <div className="relative">
                        <input
                            type="range"
                            min={0.5}
                            max={25}
                            step={0.1}
                            value={newRate}
                            onChange={(e) => setNewRate(Number(e.target.value))}
                            className="w-full h-1.5 rounded-full appearance-none bg-dark-500 accent-ice-400 cursor-pointer"
                            disabled={isLoading}
                        />
                        {/* Current rate marker */}
                        <div
                            className="absolute top-0 flex flex-col items-center pointer-events-none"
                            style={{ left: `${currentRatePosition}%`, transform: 'translateX(-50%)' }}
                        >
                            <div className="w-0.5 h-3 bg-gray-400/60 rounded-full mt-[1px]" />
                            <span className="text-[9px] text-gray-400/80 mt-0.5 whitespace-nowrap">Current</span>
                        </div>
                        {/* Market average marker */}
                        <div
                            className="absolute top-0 flex flex-col items-center pointer-events-none"
                            style={{ left: `${marketAvgPosition}%`, transform: 'translateX(-50%)' }}
                        >
                            <div className="w-0.5 h-3 bg-amber-400/80 rounded-full mt-[1px]" />
                            <span className="text-[9px] text-amber-400/80 mt-0.5 whitespace-nowrap">Avg {MARKET_AVG_RATE}%</span>
                        </div>
                    </div>
                    <div className="flex justify-between text-[10px] text-gray-600 mt-3">
                        <span>0.5%</span>
                        <span>25%</span>
                    </div>
                </div>

                {/* Error */}
                {error && (
                    <div className="flex items-center gap-2 text-xs text-status-danger bg-status-danger/10 border border-status-danger/20 rounded-xl px-3 py-2">
                        <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                        {error}
                    </div>
                )}

                {/* Success with snowflake celebration */}
                {step === 'done' && (
                    <div className="relative overflow-hidden rounded-xl">
                        <div className="snowflake-celebration">
                            {Array.from({ length: 8 }).map((_, i) => (
                                <Snowflake
                                    key={i}
                                    className="snowflake-particle"
                                    style={{
                                        left: `${(i / 8) * 100}%`,
                                        animationDelay: `${i * 0.15}s`,
                                        fontSize: `${10 + Math.random() * 6}px`,
                                    } as React.CSSProperties}
                                />
                            ))}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-status-safe bg-status-safe/10 border border-status-safe/20 px-4 py-3 relative z-10">
                            <CheckCircle className="w-4 h-4 flex-shrink-0" />
                            <span className="font-semibold">Interest rate changed to {newRate.toFixed(1)}%!</span>
                        </div>
                    </div>
                )}

                {/* Button with step indicator */}
                <button
                    onClick={handleAdjustRate}
                    disabled={!rateChanged || isLoading || step === 'done'}
                    className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-gradient-to-r from-ice-500 to-ice-600 text-white font-bold text-base shadow-ice hover:shadow-ice-lg disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                >
                    {isLoading ? (
                        <>
                            <Loader2 className="w-5 h-5 animate-spin" />
                            {step === 'signing' ? 'Sign in Wallet...' : 'Confirming on-chain...'}
                        </>
                    ) : step === 'done' ? (
                        <><CheckCircle className="w-5 h-5" /> Done</>
                    ) : (
                        'Adjust Rate'
                    )}
                </button>
            </div>
        </div>
    )
}
