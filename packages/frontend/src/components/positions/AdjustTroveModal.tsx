import { useState, useEffect } from 'react'
import { useAccount, useWriteContract } from 'wagmi'
import { parseEther, formatEther, erc20Abi } from 'viem'
import { Position } from '@/hooks/useUserPositions'
import { useAdjustTrove } from '@/hooks/useAdjustTrove'
import { useQueryClient } from '@tanstack/react-query'
import { X, Loader2, CheckCircle, AlertTriangle } from 'lucide-react'
import { getCollToken, getSbUSDToken, getBranchAddresses } from '@/config/contracts'

type Tab = 'addColl' | 'withdrawColl' | 'addDebt' | 'repayDebt'
type Step = 'idle' | 'approving' | 'signing' | 'confirming' | 'done'

interface AdjustTroveModalProps {
    position: Position
    onClose: () => void
}

const TABS: { key: Tab; label: string }[] = [
    { key: 'addColl', label: 'Add Collateral' },
    { key: 'withdrawColl', label: 'Withdraw Collateral' },
    { key: 'addDebt', label: 'Borrow More' },
    { key: 'repayDebt', label: 'Repay Debt' },
]

export function AdjustTroveModal({ position, onClose }: AdjustTroveModalProps) {
    const { address } = useAccount()
    const queryClient = useQueryClient()
    const [activeTab, setActiveTab] = useState<Tab>('addColl')
    const [amount, setAmount] = useState('')
    const [step, setStep] = useState<Step>('idle')
    const [error, setError] = useState<string | null>(null)

    const { adjustTrove, isConfirmed, isReverted } = useAdjustTrove()
    const { writeContractAsync } = useWriteContract()

    const branch = position.branch as 0 | 1
    const collType = position.collateralSymbol
    const isLoading = step !== 'idle' && step !== 'done'

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

    // Reset when tab changes
    useEffect(() => {
        setAmount('')
        setStep('idle')
        setError(null)
    }, [activeTab])

    const handleExecute = async () => {
        if (!address || !amount || parseFloat(amount) <= 0) return
        setError(null)

        try {
            const parsedAmount = parseEther(amount)
            const { borrowerOperations } = getBranchAddresses(branch)
            const maxUpfrontFee = parseEther('1000') // generous max fee

            // Approve if needed
            const needsApprove = activeTab === 'addColl' || activeTab === 'repayDebt'
            if (needsApprove) {
                setStep('approving')
                const tokenAddr = activeTab === 'addColl' ? getCollToken(branch) : getSbUSDToken()
                await writeContractAsync({
                    address: tokenAddr,
                    abi: erc20Abi,
                    functionName: 'approve',
                    args: [borrowerOperations, parsedAmount],
                })
            }

            // Direct contract call
            setStep('signing')
            const isCollChange = activeTab === 'addColl' || activeTab === 'withdrawColl'

            await adjustTrove({
                branch,
                troveId: BigInt(position.troveId),
                collChange: isCollChange ? parsedAmount : 0n,
                isCollIncrease: activeTab === 'addColl',
                debtChange: isCollChange ? 0n : parsedAmount,
                isDebtIncrease: activeTab === 'addDebt',
                maxUpfrontFee,
            })
            setStep('confirming')
        } catch (err: any) {
            console.error('Adjust trove failed:', err)
            setError(err?.shortMessage ?? err?.message ?? 'Transaction failed')
            setStep('idle')
        }
    }

    const collateral = parseFloat(formatEther(BigInt(position.collateral))).toLocaleString('en-US', { maximumFractionDigits: 2 })
    const debt = parseFloat(formatEther(BigInt(position.debt))).toLocaleString('en-US', { maximumFractionDigits: 2 })

    const placeholderMap: Record<Tab, string> = {
        addColl: `Amount (${collType})`,
        withdrawColl: `Amount (${collType})`,
        addDebt: 'Amount (sbUSD)',
        repayDebt: 'Amount (sbUSD)',
    }

    const buttonLabelMap: Record<Tab, string> = {
        addColl: 'Add Collateral',
        withdrawColl: 'Withdraw Collateral',
        addDebt: 'Borrow More',
        repayDebt: 'Repay Debt',
    }

    const stepLabel: Record<Step, string> = {
        idle: '',
        approving: 'Approving...',
        signing: 'Sign in wallet...',
        confirming: 'Confirming...',
        done: 'Done!',
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
            <div
                className="bg-dark-700 border border-dark-400/40 rounded-2xl w-full max-w-md p-6 space-y-5 shadow-2xl animate-fade-in"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between">
                    <h2 className="text-lg font-bold text-white">
                        Adjust Trove #{position.troveId}
                    </h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Position summary */}
                <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="bg-dark-600/50 rounded-xl p-3">
                        <p className="text-gray-500 text-xs mb-1">Collateral</p>
                        <p className="text-white font-semibold">{collateral} {collType}</p>
                    </div>
                    <div className="bg-dark-600/50 rounded-xl p-3">
                        <p className="text-gray-500 text-xs mb-1">Debt</p>
                        <p className="text-white font-semibold">{debt} sbUSD</p>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex gap-1 bg-dark-600/50 rounded-xl p-1">
                    {TABS.map((tab) => (
                        <button
                            key={tab.key}
                            onClick={() => setActiveTab(tab.key)}
                            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
                                activeTab === tab.key
                                    ? 'bg-ice-400/20 text-ice-300'
                                    : 'text-gray-500 hover:text-gray-300'
                            }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Input */}
                <div className="flex items-center bg-dark-600 border border-dark-400/40 focus-within:border-ice-400/50 rounded-xl px-4 py-3 transition-colors">
                    <input
                        type="number"
                        placeholder={placeholderMap[activeTab]}
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        className="flex-1 bg-transparent text-white text-lg font-semibold outline-none placeholder-gray-600"
                        disabled={isLoading}
                    />
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
                        Transaction completed successfully!
                    </div>
                )}

                {/* Action button */}
                <button
                    onClick={handleExecute}
                    disabled={!amount || parseFloat(amount) <= 0 || isLoading || step === 'done'}
                    className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-gradient-to-r from-ice-500 to-ice-600 text-white font-bold text-base shadow-ice hover:shadow-ice-lg disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                >
                    {isLoading ? (
                        <>
                            <Loader2 className="w-5 h-5 animate-spin" />
                            {stepLabel[step]}
                        </>
                    ) : step === 'done' ? (
                        'Done'
                    ) : (
                        buttonLabelMap[activeTab]
                    )}
                </button>
            </div>
        </div>
    )
}
