import { useState, useEffect } from 'react'
import { useAccount, useWriteContract } from 'wagmi'
import { parseEther, formatEther, erc20Abi } from 'viem'
import { Position } from '@/hooks/useUserPositions'
import { useCloseTrove } from '@/hooks/useCloseTrove'
import { useQueryClient } from '@tanstack/react-query'
import { X, Loader2, CheckCircle, AlertTriangle } from 'lucide-react'
import { getSbUSDToken, getBranchAddresses } from '@/config/contracts'

type Step = 'idle' | 'approving' | 'signing' | 'confirming' | 'done'

interface CloseTroveModalProps {
    position: Position
    onClose: () => void
}

export function CloseTroveModal({ position, onClose }: CloseTroveModalProps) {
    const { address } = useAccount()
    const queryClient = useQueryClient()
    const [step, setStep] = useState<Step>('idle')
    const [error, setError] = useState<string | null>(null)

    const { closeTrove, isConfirmed, isReverted, reset } = useCloseTrove()
    const { writeContractAsync } = useWriteContract()

    const branch = position.branch as 0 | 1
    const collType = position.collateralSymbol
    const isLoading = step !== 'idle' && step !== 'done'

    const collateral = parseFloat(formatEther(BigInt(position.collateral))).toLocaleString('en-US', { maximumFractionDigits: 2 })
    const debt = parseFloat(formatEther(BigInt(position.debt))).toLocaleString('en-US', { maximumFractionDigits: 2 })
    const cr = parseFloat(position.cr)

    useEffect(() => {
        if (isConfirmed && step === 'confirming') {
            setStep('done')
            queryClient.invalidateQueries({ queryKey: ['user-positions'] })
        }
    }, [isConfirmed, step, queryClient])

    useEffect(() => {
        if (isReverted && step === 'confirming') {
            setError('Transaction reverted on-chain.')
            setStep('idle')
        }
    }, [isReverted, step])

    const handleClose = async () => {
        if (!address) return
        setError(null)

        try {
            const { borrowerOperations } = getBranchAddresses(branch)

            // Approve sbUSD for debt repayment
            setStep('approving')
            await writeContractAsync({
                address: getSbUSDToken(),
                abi: erc20Abi,
                functionName: 'approve',
                args: [borrowerOperations, parseEther(formatEther(BigInt(position.debt)))],
            })

            // Direct contract call
            setStep('signing')
            await closeTrove({ branch, troveId: BigInt(position.troveId) })
            setStep('confirming')
        } catch (err: any) {
            console.error('Close trove failed:', err)
            setError(err?.shortMessage ?? err?.message ?? 'Transaction failed')
            setStep('idle')
        }
    }

    const stepLabel: Record<Step, string> = {
        idle: '',
        approving: 'Approving sbUSD...',
        signing: 'Sign in wallet...',
        confirming: 'Confirming...',
        done: 'Done!',
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
            <div
                className="bg-dark-700 border border-dark-400/40 rounded-2xl w-full max-w-sm p-6 space-y-5 shadow-2xl animate-fade-in"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between">
                    <h2 className="text-lg font-bold text-white">Close Trove</h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Position summary */}
                <div className="bg-dark-600/50 rounded-xl p-4 space-y-2 text-sm">
                    <div className="flex justify-between">
                        <span className="text-gray-400">Trove</span>
                        <span className="text-white font-semibold">#{position.troveId} ({collType})</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-gray-400">Collateral</span>
                        <span className="text-white font-semibold">{collateral} {collType}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-gray-400">Debt</span>
                        <span className="text-white font-semibold">{debt} sbUSD</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-gray-400">Collateral Ratio</span>
                        <span className={`font-bold ${cr >= 200 ? 'text-status-safe' : cr >= 150 ? 'text-status-warn' : 'text-status-danger'}`}>
                            {position.cr}%
                        </span>
                    </div>
                </div>

                {/* Warning */}
                <div className="flex items-start gap-2 text-xs text-status-warn bg-status-warn/10 border border-status-warn/20 rounded-xl px-3 py-2.5">
                    <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <span>Closing this Trove will repay your debt ({debt} sbUSD) and return your collateral ({collateral} {collType}). This action cannot be undone.</span>
                </div>

                {/* Error */}
                {error && (
                    <div className="flex items-center gap-2 text-xs text-status-danger bg-status-danger/10 border border-status-danger/20 rounded-xl px-3 py-2">
                        <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                        Transaction failed: {error}
                    </div>
                )}

                {/* Success */}
                {step === 'done' && (
                    <div className="flex items-center gap-2 text-xs text-status-safe bg-status-safe/10 border border-status-safe/20 rounded-xl px-3 py-2">
                        <CheckCircle className="w-3.5 h-3.5 flex-shrink-0" />
                        Trove closed successfully!
                    </div>
                )}

                {/* Buttons */}
                <div className="flex gap-2">
                    <button
                        onClick={onClose}
                        className="flex-1 py-3 rounded-xl bg-dark-600 text-gray-400 font-semibold border border-dark-400/40 hover:bg-dark-500 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleClose}
                        disabled={isLoading || step === 'done'}
                        className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-status-danger/20 text-status-danger font-bold border border-status-danger/30 hover:bg-status-danger/30 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                    >
                        {isLoading ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                {stepLabel[step]}
                            </>
                        ) : step === 'done' ? (
                            'Done'
                        ) : (
                            'Close Trove'
                        )}
                    </button>
                </div>
            </div>
        </div>
    )
}
