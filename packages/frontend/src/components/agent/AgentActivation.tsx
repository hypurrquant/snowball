import { useState } from 'react'
import { useAccount, useWriteContract, useReadContract } from 'wagmi'
import { parseEther, erc20Abi } from 'viem'
import { Loader2, Bot, Shield, Zap, Check, ArrowRight, Wallet } from 'lucide-react'
import { useSmartAccount } from '@/hooks/useSmartAccount'
import addresses from '@/config/addresses.json'

const STRATEGIES = [
    { value: 'conservative', label: 'Conservative', desc: 'CR > 200% — Very safe, low risk' },
    { value: 'moderate', label: 'Moderate', desc: 'CR > 160% — Balanced approach' },
    { value: 'aggressive', label: 'Aggressive', desc: 'CR > 130% — Higher yield, higher risk' },
]

interface AgentActivationProps {
    onComplete?: () => void
}

type Step = 1 | 2 | 3

export function AgentActivation({ onComplete }: AgentActivationProps) {
    const { address: userAddress } = useAccount()
    const {
        hasAccount,
        accountAddress,
        isAgentAuthorized,
        agentAddress,
        createAccount,
        addAgent,
        registerWithBackend,
        refetch,
    } = useSmartAccount()
    const { writeContractAsync } = useWriteContract()

    const [strategy, setStrategy] = useState('conservative')
    const [minCR, setMinCR] = useState(200)
    const [autoRebalance, setAutoRebalance] = useState(true)
    const [autoRateAdjust, setAutoRateAdjust] = useState(true)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [transferAmount, setTransferAmount] = useState('')
    const [collType, setCollType] = useState<'wCTC' | 'lstCTC'>('wCTC')

    // Determine current step
    const currentStep: Step = !hasAccount ? 1 : !isAgentAuthorized ? 3 : 3

    // Step indicators
    const steps = [
        { num: 1 as Step, label: 'Create SmartAccount', done: hasAccount },
        { num: 2 as Step, label: 'Transfer Collateral', done: false },
        { num: 3 as Step, label: 'Authorize Agent', done: isAgentAuthorized },
    ]

    // Get wCTC balance in SmartAccount
    const tokenAddr = collType === 'wCTC' ? addresses.tokens.wCTC : addresses.tokens.lstCTC
    const { data: smartAccountBalance } = useReadContract({
        address: tokenAddr as `0x${string}`,
        abi: erc20Abi,
        functionName: 'balanceOf',
        args: accountAddress ? [accountAddress] : undefined,
        query: { enabled: !!accountAddress },
    })

    // If agent is already authorized and has a SmartAccount, hide this component
    if (hasAccount && isAgentAuthorized) return null

    const handleStep1 = async () => {
        setLoading(true)
        setError(null)
        try {
            await createAccount()
            await refetch()
        } catch (err: any) {
            setError(err.shortMessage || err.message || 'Failed to create SmartAccount')
        } finally {
            setLoading(false)
        }
    }

    const handleStep2 = async () => {
        if (!accountAddress || !transferAmount) return
        setLoading(true)
        setError(null)
        try {
            const amount = parseEther(transferAmount)
            await writeContractAsync({
                address: tokenAddr as `0x${string}`,
                abi: erc20Abi,
                functionName: 'transfer',
                args: [accountAddress, amount],
            })
            setTransferAmount('')
        } catch (err: any) {
            setError(err.shortMessage || err.message || 'Transfer failed')
        } finally {
            setLoading(false)
        }
    }

    const handleStep3 = async () => {
        if (!agentAddress) {
            setError('Agent address not configured (VITE_AGENT_ADDRESS)')
            return
        }
        setLoading(true)
        setError(null)
        try {
            await addAgent(agentAddress)
            // Register with backend
            await registerWithBackend({ strategy, minCR, autoRebalance, autoRateAdjust })
            await refetch()
            onComplete?.()
        } catch (err: any) {
            setError(err.shortMessage || err.message || 'Failed to authorize agent')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="bg-dark-700 border border-dark-400/40 rounded-2xl p-5 space-y-5">
            <div className="flex items-center gap-2">
                <Bot className="w-5 h-5 text-ice-400" />
                <h3 className="font-semibold text-white">Activate Agent</h3>
            </div>

            {/* Step indicator */}
            <div className="flex items-center gap-2">
                {steps.map((s, i) => (
                    <div key={s.num} className="flex items-center gap-2 flex-1">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold border-2 flex-shrink-0 ${
                            s.done
                                ? 'border-status-safe bg-status-safe text-white'
                                : currentStep === s.num && !s.done
                                    ? 'border-ice-400 text-ice-400 animate-pulse'
                                    : 'border-dark-400 text-gray-600'
                        }`}>
                            {s.done ? <Check className="w-3 h-3" /> : s.num}
                        </div>
                        <span className={`text-xs ${s.done ? 'text-status-safe' : currentStep === s.num ? 'text-ice-300' : 'text-gray-600'}`}>
                            {s.label}
                        </span>
                        {i < steps.length - 1 && (
                            <ArrowRight className="w-3 h-3 text-dark-400 flex-shrink-0" />
                        )}
                    </div>
                ))}
            </div>

            {/* Step 1: Create SmartAccount */}
            {!hasAccount && (
                <>
                    <p className="text-sm text-gray-400">
                        A SmartAccount is deployed on-chain as your personal vault.
                        It holds your collateral and acts as the trove owner, allowing
                        the agent to manage positions on your behalf.
                    </p>
                    <button
                        onClick={handleStep1}
                        disabled={loading || !userAddress}
                        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold bg-gradient-to-r from-ice-500 to-ice-600 text-white shadow-ice hover:shadow-ice-lg disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? (
                            <><Loader2 className="w-4 h-4 animate-spin" /> Deploying SmartAccount...</>
                        ) : (
                            <><Wallet className="w-4 h-4" /> Create SmartAccount</>
                        )}
                    </button>
                </>
            )}

            {/* Step 2: Transfer Collateral (optional, shown after SmartAccount created) */}
            {hasAccount && !isAgentAuthorized && (
                <>
                    <div className="bg-dark-600/50 rounded-xl p-3 space-y-2">
                        <div className="flex items-center justify-between text-xs">
                            <span className="text-gray-400 flex items-center gap-1">
                                <Wallet className="w-3 h-3" /> SmartAccount
                            </span>
                            <span className="text-white font-mono">
                                {accountAddress ? `${accountAddress.slice(0, 6)}...${accountAddress.slice(-4)}` : '—'}
                            </span>
                        </div>
                        {smartAccountBalance !== undefined && (
                            <div className="flex items-center justify-between text-xs">
                                <span className="text-gray-400">Balance ({collType})</span>
                                <span className="text-white font-mono">
                                    {(Number(smartAccountBalance) / 1e18).toFixed(4)}
                                </span>
                            </div>
                        )}
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs text-gray-500">Transfer Collateral to SmartAccount (optional)</label>
                        <div className="flex gap-2">
                            {(['wCTC', 'lstCTC'] as const).map((t) => (
                                <button
                                    key={t}
                                    onClick={() => setCollType(t)}
                                    className={`px-3 py-1 rounded-lg text-xs font-medium ${
                                        collType === t
                                            ? 'bg-ice-400/20 text-ice-300 border border-ice-400/40'
                                            : 'bg-dark-600 text-gray-400 border border-dark-400/40'
                                    }`}
                                >
                                    {t}
                                </button>
                            ))}
                        </div>
                        <div className="flex gap-2">
                            <input
                                type="number"
                                placeholder="Amount"
                                value={transferAmount}
                                onChange={(e) => setTransferAmount(e.target.value)}
                                className="flex-1 bg-dark-600 border border-dark-400/40 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-ice-400/50"
                            />
                            <button
                                onClick={handleStep2}
                                disabled={loading || !transferAmount}
                                className="px-4 py-2 rounded-xl text-sm font-semibold bg-ice-400/20 text-ice-300 border border-ice-400/40 hover:bg-ice-400/30 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Transfer'}
                            </button>
                        </div>
                    </div>
                </>
            )}

            {/* Step 3: Strategy + Authorize Agent */}
            {hasAccount && !isAgentAuthorized && (
                <>
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
                            <li>Your SmartAccount is an on-chain contract you fully control</li>
                            <li>Transfer collateral to this SmartAccount for agent management</li>
                            <li>The agent can only call approved protocol functions (BorrowerOperations)</li>
                            <li>You can remove agent access and withdraw funds at any time</li>
                        </ul>
                    </div>

                    <button
                        onClick={handleStep3}
                        disabled={loading || !userAddress || !agentAddress}
                        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold bg-gradient-to-r from-ice-500 to-ice-600 text-white shadow-ice hover:shadow-ice-lg disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? (
                            <><Loader2 className="w-4 h-4 animate-spin" /> Authorizing Agent...</>
                        ) : (
                            <><Zap className="w-4 h-4" /> Authorize Agent & Activate</>
                        )}
                    </button>
                </>
            )}

            {error && (
                <div className="text-xs text-status-danger bg-status-danger/10 border border-status-danger/20 rounded-xl px-3 py-2">
                    {error}
                </div>
            )}
        </div>
    )
}
