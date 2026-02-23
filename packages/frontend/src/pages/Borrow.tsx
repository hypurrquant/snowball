import { useState, useMemo, useEffect, useRef } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAccount, useWriteContract } from 'wagmi'
import { parseEther, erc20Abi } from 'viem'
import { useUserBalance } from '@/hooks/useUserBalance'
import { usePrice } from '@/hooks/usePrice'
import { useOpenTrove } from '@/hooks/useOpenTrove'
import { usePrivyServerWallet } from '@/hooks/usePrivyServerWallet'
import { formatToken } from '@/components/common/TokenAmount'
import { Info, Bot, ChevronRight, AlertTriangle, Loader2, CheckCircle, Snowflake, Fuel, ArrowRight } from 'lucide-react'
import { getCollToken, getBranchAddresses } from '@/config/contracts'
import { API_BASE } from '@/config/api'

type CollType = 'wCTC' | 'lstCTC'

const MCR: Record<CollType, number> = { wCTC: 110, lstCTC: 120 }
const CCR: Record<CollType, number> = { wCTC: 150, lstCTC: 160 }
const MIN_DEBT = 200 // sbUSD
const MARKET_AVG_RATE = 6.5 // simulated market average
const EST_GAS_TCTC = 0.0005 // estimated gas in tCTC

export function Borrow() {
    const navigate = useNavigate()
    const { address } = useAccount()
    const { data: balance } = useUserBalance(address)
    const { data: wCTCPrice = 0.20 } = usePrice(0)
    const { data: lstPrice = 0.21 } = usePrice(1)

    const [collType, setCollType] = useState<CollType>('wCTC')
    const [collAmount, setCollAmount] = useState('')
    const [debtAmount, setDebtAmount] = useState('')
    const [interestRate, setInterestRate] = useState(5)
    const [agentManaged, setAgentManaged] = useState(true)
    const [step, setStep] = useState<'idle' | 'approving' | 'signing' | 'confirming' | 'done'>('idle')
    const [error, setError] = useState<string | null>(null)

    const { openTrove, isConfirmed, isReverted } = useOpenTrove()
    const { hasServerWallet } = usePrivyServerWallet()
    const { writeContractAsync } = useWriteContract()

    const branch: 0 | 1 = collType === 'wCTC' ? 0 : 1

    const handleOpenPosition = async () => {
        if (!address || !canOpen) return
        setError(null)

        try {
            const collWei = parseEther(collAmount)
            const debtWei = parseEther(debtAmount)
            const rateWei = parseEther((interestRate / 100).toString())
            const maxUpfrontFee = parseEther('1000') // generous max fee
            const { borrowerOperations } = getBranchAddresses(branch)

            // Step 1: Approve collateral token
            setStep('approving')
            await writeContractAsync({
                address: getCollToken(branch),
                abi: erc20Abi,
                functionName: 'approve',
                args: [borrowerOperations, collWei],
            })

            // Step 2: Direct contract call
            setStep('signing')
            await openTrove({
                branch,
                owner: address,
                collAmount: collWei,
                debtAmount: debtWei,
                interestRate: rateWei,
                maxUpfrontFee,
            })
            setStep('confirming')
        } catch (err: any) {
            console.error('Open position failed:', err)
            setError(err?.shortMessage ?? err?.message ?? 'Transaction failed')
            setStep('idle')
        }
    }

    const redirectTimer = useRef<ReturnType<typeof setTimeout>>()

    useEffect(() => {
        if (isConfirmed && step === 'confirming') {
            setStep('done')
            // Auto-register with monitor if agent-managed via Privy server wallet
            if (agentManaged && hasServerWallet && address) {
                fetch(`${API_BASE}/agent/settings`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        userAddress: address,
                        branch,
                        autoRebalance: true,
                        autoRateAdjust: true,
                    }),
                }).catch(() => {})
            }
            redirectTimer.current = setTimeout(() => navigate('/dashboard'), 2000)
        }
    }, [isConfirmed, step, navigate, agentManaged, hasServerWallet, address, branch])

    useEffect(() => {
        return () => { if (redirectTimer.current) clearTimeout(redirectTimer.current) }
    }, [])

    useEffect(() => {
        if (isReverted && step === 'confirming') {
            setError('Transaction reverted on-chain.')
            setStep('idle')
        }
    }, [isReverted, step])

    const isLoading = step !== 'idle' && step !== 'done'

    const collPrice = collType === 'wCTC' ? wCTCPrice : lstPrice
    const mcr = MCR[collType]
    const ccr = CCR[collType]
    const balKey = collType === 'wCTC' ? 'wCTC' : 'lstCTC'
    const balanceDisplay = balance ? formatToken(balance[balKey]) : '—'

    const summary = useMemo(() => {
        const collNum = parseFloat(collAmount) || 0
        const debtNum = parseFloat(debtAmount) || 0
        const collValueUSD = collNum * collPrice
        const cr = debtNum > 0 ? (collValueUSD / debtNum) * 100 : 0
        const liqPrice = debtNum > 0 && collNum > 0 ? (debtNum * mcr / 100) / collNum : 0
        const upfrontFee = debtNum * (interestRate / 100) * (7 / 365)
        const maxDebt = collValueUSD / (mcr / 100)
        const annualInterest = debtNum * (interestRate / 100)
        return { cr, liqPrice, upfrontFee, maxDebt, collValueUSD, annualInterest }
    }, [collAmount, debtAmount, interestRate, collPrice, mcr])

    const debtNum = parseFloat(debtAmount) || 0
    const collNum = parseFloat(collAmount) || 0
    const crColor = summary.cr >= 200 ? 'text-status-safe' : summary.cr >= 150 ? 'text-status-warn' : summary.cr > 0 ? 'text-status-danger' : 'text-gray-500'

    const errors: string[] = []
    if (debtNum > 0 && debtNum < MIN_DEBT) errors.push(`Minimum debt is ${MIN_DEBT} sbUSD.`)
    if (summary.cr > 0 && summary.cr < mcr) errors.push(`Health Factor (${(summary.cr / 100).toFixed(2)}) is below minimum (${(mcr / 100).toFixed(2)}). Increase collateral or reduce debt.`)
    const canOpen = !!collAmount && !!debtAmount && debtNum >= MIN_DEBT && summary.cr >= mcr

    // HIGH-2: Dynamic button text
    const getButtonContent = () => {
        if (isLoading) {
            const stepText = step === 'approving'
                ? 'Step 1/2: Approving Token...'
                : step === 'signing'
                    ? 'Step 2/2: Sign in Wallet...'
                    : 'Confirming on-chain...'
            return (
                <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    {stepText}
                </>
            )
        }
        if (step === 'done') return <><CheckCircle className="w-5 h-5" /> Position Created!</>
        if (!address) return 'Connect Wallet'
        if (!collAmount) return 'Enter deposit amount'
        if (!debtAmount) return 'Enter borrow amount'
        if (debtNum > 0 && debtNum < MIN_DEBT) return `Min debt: ${MIN_DEBT} sbUSD`
        if (summary.cr > 0 && summary.cr < mcr) return `HF too low (min ${(mcr / 100).toFixed(2)})`
        return <>Open Position <ChevronRight className="w-5 h-5" /></>
    }

    // HIGH-5: Market average marker position (percentage on slider)
    const marketAvgPosition = ((MARKET_AVG_RATE - 0.5) / (25 - 0.5)) * 100

    // MEDIUM-4: Quick-fill helpers
    const handleHalf = () => {
        if (balance) {
            const fullBal = formatToken(balance[balKey], 4).replace(/,/g, '')
            const half = (parseFloat(fullBal) / 2).toFixed(4)
            setCollAmount(half)
        }
    }
    const handleSafeBorrow = () => {
        if (collNum > 0) {
            // Safe borrow = collateral value / 200% CR target
            const safeBorrow = (collNum * collPrice) / 2
            if (safeBorrow >= MIN_DEBT) {
                setDebtAmount(safeBorrow.toFixed(2))
            }
        }
    }

    return (
        <div className="max-w-xl mx-auto space-y-6 animate-fade-in">
            <div>
                <h1 className="text-2xl font-bold text-white">Open a Position</h1>
                <p className="text-gray-500 text-sm mt-1">Deposit CTC as collateral and borrow sbUSD.</p>
            </div>

            <div className="bg-dark-700 border border-dark-400/40 rounded-2xl p-6 space-y-5">
                {/* HIGH-1: Step indicator bar */}
                {isLoading && (
                    <div className="flex items-center gap-3">
                        <div className={`flex items-center gap-1.5 text-xs font-medium ${step === 'approving' ? 'text-ice-400' : 'text-status-safe'}`}>
                            <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold border-2 ${step === 'approving' ? 'border-ice-400 text-ice-400 animate-pulse' : 'border-status-safe bg-status-safe text-white'}`}>
                                {step === 'approving' ? '1' : <CheckCircle className="w-3 h-3" />}
                            </div>
                            Approve
                        </div>
                        <div className={`flex-1 h-0.5 rounded-full ${step === 'approving' ? 'bg-dark-500' : 'bg-ice-400'}`} />
                        <div className={`flex items-center gap-1.5 text-xs font-medium ${step === 'signing' || step === 'confirming' ? 'text-ice-400' : step === 'approving' ? 'text-gray-600' : 'text-status-safe'}`}>
                            <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold border-2 ${step === 'signing' || step === 'confirming' ? 'border-ice-400 text-ice-400 animate-pulse' : step === 'approving' ? 'border-dark-500 text-gray-600' : 'border-status-safe bg-status-safe text-white'}`}>
                                2
                            </div>
                            Open
                        </div>
                    </div>
                )}

                {/* Collateral type */}
                <div>
                    <label className="text-sm text-gray-400 mb-2 block">Collateral Token</label>
                    <div className="flex gap-2">
                        {(['wCTC', 'lstCTC'] as CollType[]).map((t) => (
                            <button
                                key={t}
                                onClick={() => setCollType(t)}
                                className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all ${collType === t
                                        ? 'bg-ice-400/20 text-ice-300 border border-ice-400/40 shadow-ice'
                                        : 'bg-dark-600 text-gray-400 border border-dark-400/40 hover:border-dark-300/40'
                                    }`}
                            >
                                {t}
                                <span className="ml-1.5 text-xs opacity-60">
                                    ${collType === t ? collPrice.toFixed(2) : (t === 'wCTC' ? wCTCPrice : lstPrice).toFixed(2)}
                                </span>
                            </button>
                        ))}
                    </div>
                    {/* MCR / CCR info */}
                    <div className="flex gap-4 mt-2 text-xs text-gray-500">
                        <span>MCR: <span className="text-gray-300">{mcr}%</span></span>
                        <span>CCR: <span className="text-gray-300">{ccr}%</span></span>
                        <span>Oracle: <span className="text-gray-300">${collPrice.toFixed(2)}</span></span>
                    </div>
                </div>

                {/* Deposit amount — MEDIUM-4: HALF + MAX buttons */}
                <div>
                    <div className="flex justify-between text-sm mb-2">
                        <label className="text-gray-400">Deposit Amount</label>
                        <div className="flex gap-2">
                            <button
                                onClick={handleHalf}
                                className="text-xs text-gray-500 hover:text-ice-300 transition-colors"
                            >
                                HALF
                            </button>
                            <button
                                onClick={() => balance && setCollAmount(formatToken(balance[balKey], 4).replace(/,/g, ''))}
                                className="text-xs text-ice-400 hover:text-ice-300 transition-colors"
                            >
                                MAX: {balanceDisplay} {collType}
                            </button>
                        </div>
                    </div>
                    <div className="flex items-center bg-dark-600 border border-dark-400/40 focus-within:border-ice-400/50 rounded-xl px-4 py-3 transition-colors">
                        <input
                            type="number"
                            placeholder="0.00"
                            value={collAmount}
                            onChange={(e) => setCollAmount(e.target.value)}
                            className="flex-1 bg-transparent text-white text-3xl font-semibold outline-none placeholder-gray-600"
                        />
                        <span className="text-gray-400 text-sm font-medium ml-2">{collType}</span>
                    </div>
                    {collAmount && (
                        <p className="text-xs text-gray-500 mt-1">
                            ≈ ${summary.collValueUSD.toFixed(2)} USD · Max borrow: <span className="text-gray-300">{summary.maxDebt.toFixed(2)} sbUSD</span>
                        </p>
                    )}
                </div>

                {/* Borrow amount — MEDIUM-4: SAFE button */}
                <div>
                    <div className="flex justify-between text-sm mb-2">
                        <label className="text-gray-400">Borrow Amount</label>
                        <div className="flex gap-2 items-center">
                            {collNum > 0 && (
                                <button
                                    onClick={handleSafeBorrow}
                                    className="text-xs text-status-safe/80 hover:text-status-safe transition-colors"
                                >
                                    SAFE
                                </button>
                            )}
                            <span className="text-xs text-gray-500">Min: {MIN_DEBT} sbUSD</span>
                        </div>
                    </div>
                    <div className={`flex items-center bg-dark-600 border rounded-xl px-4 py-3 transition-colors ${debtNum > 0 && debtNum < MIN_DEBT ? 'border-status-danger/50' : 'border-dark-400/40 focus-within:border-ice-400/50'
                        }`}>
                        <input
                            type="number"
                            placeholder="0.00"
                            value={debtAmount}
                            min={MIN_DEBT}
                            onChange={(e) => setDebtAmount(e.target.value)}
                            className="flex-1 bg-transparent text-white text-3xl font-semibold outline-none placeholder-gray-600"
                        />
                        <span className="text-gray-400 text-sm font-medium ml-2">sbUSD</span>
                    </div>
                </div>

                {/* Interest rate — MEDIUM-1: color spectrum + MEDIUM-2: annual cost */}
                <div>
                    <div className="flex justify-between text-sm mb-2">
                        <label className="text-gray-400">Interest Rate</label>
                        <span className="text-white font-semibold">{interestRate.toFixed(1)}% APR</span>
                    </div>
                    <div className="relative">
                        {/* MEDIUM-1: Color spectrum background */}
                        <div className="absolute top-[5px] left-0 right-0 h-1.5 rounded-full overflow-hidden pointer-events-none"
                             style={{ background: 'linear-gradient(to right, #ef4444, #f59e0b, #22c55e)' }}
                        />
                        <input
                            type="range" min={0.5} max={25} step={0.1} value={interestRate}
                            onChange={(e) => setInterestRate(Number(e.target.value))}
                            className="w-full h-1.5 rounded-full appearance-none bg-transparent accent-ice-400 cursor-pointer relative z-10"
                        />
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
                        <span className="flex items-center gap-0.5 text-red-400/70"><Info className="w-2.5 h-2.5" /> Higher redemption risk</span>
                        <span className="text-green-400/70">Lower redemption risk</span>
                    </div>
                    {/* MEDIUM-2: Annual interest cost */}
                    {debtNum > 0 && (
                        <div className="mt-2 text-xs text-gray-500 flex items-center gap-1">
                            Annual interest cost: <span className="text-gray-300">~{summary.annualInterest.toFixed(2)} sbUSD</span>
                            <span className="text-gray-600">(${summary.annualInterest.toFixed(2)})</span>
                        </div>
                    )}
                </div>

                {/* Position Summary — MEDIUM-3: gas estimation */}
                <div className="bg-dark-600/60 border border-dark-400/30 rounded-xl p-4 space-y-2.5">
                    <p className="font-semibold text-white text-sm mb-3 flex items-center gap-2">
                        Position Summary
                    </p>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                        <div className="flex justify-between col-span-2">
                            <span className="text-gray-400">Health Factor</span>
                            <span className={`font-bold ${crColor}`}>{summary.cr > 0 ? (summary.cr / 100).toFixed(2) : '—'}</span>
                        </div>
                        <div className="flex justify-between col-span-2">
                            <span className="text-gray-400">Liquidation Price</span>
                            <span className="text-white font-mono">{summary.liqPrice > 0 ? `$${summary.liqPrice.toFixed(4)}` : '—'}</span>
                        </div>
                        <div className="flex justify-between col-span-2">
                            <span className="text-gray-400">7-day Upfront Fee</span>
                            <span className="text-white font-mono">{summary.upfrontFee > 0 ? `${summary.upfrontFee.toFixed(4)} sbUSD` : '—'}</span>
                        </div>
                        <div className="flex justify-between col-span-2">
                            <span className="text-gray-400 flex items-center gap-1"><Fuel className="w-3 h-3" /> Est. Gas (2 txs)</span>
                            <span className="text-gray-400 font-mono text-xs">~{EST_GAS_TCTC} tCTC</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-400">Min HF</span>
                            <span className="text-gray-300">{(mcr / 100).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-400">System HF</span>
                            <span className="text-gray-300">{(ccr / 100).toFixed(2)}</span>
                        </div>
                    </div>
                </div>

                {/* Error messages */}
                {(errors.length > 0 || error) && (
                    <div className="space-y-1.5">
                        {errors.map((err, i) => (
                            <div key={i} className="flex items-center gap-2 text-xs text-status-danger bg-status-danger/10 border border-status-danger/20 rounded-xl px-3 py-2">
                                <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                                {err}
                            </div>
                        ))}
                        {error && (
                            <div className="flex items-center gap-2 text-xs text-status-danger bg-status-danger/10 border border-status-danger/20 rounded-xl px-3 py-2">
                                <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                                Transaction failed: {error}
                            </div>
                        )}
                    </div>
                )}

                {/* Agent toggle */}
                <label className="flex items-start gap-3 cursor-pointer p-3 rounded-xl hover:bg-dark-600/50 transition-colors border border-transparent hover:border-dark-400/30">
                    <input
                        type="checkbox"
                        checked={agentManaged}
                        onChange={(e) => setAgentManaged(e.target.checked)}
                        className="mt-0.5 accent-ice-400"
                    />
                    <div className="flex-1">
                        <div className="flex items-center gap-1.5 text-sm font-medium text-white">
                            <Bot className="w-4 h-4 text-ice-400" /> Let Agent manage this position
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5">AI automatically optimizes CR and interest rate</p>
                    </div>
                </label>

                {/* Agent permission banner */}
                {agentManaged && !hasServerWallet && (
                    <Link
                        to="/agent"
                        className="flex items-center justify-between gap-2 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-sm text-amber-400 hover:bg-amber-500/15 transition-colors"
                    >
                        <div className="flex items-center gap-2">
                            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                            <span>Agent not active. Activate on the Agent page first.</span>
                        </div>
                        <ArrowRight className="w-4 h-4 flex-shrink-0" />
                    </Link>
                )}

                {agentManaged && hasServerWallet && (
                    <div className="flex items-center gap-2 p-3 rounded-xl bg-status-safe/10 border border-status-safe/20 text-sm text-status-safe">
                        <CheckCircle className="w-4 h-4 flex-shrink-0" />
                        <span>Agent active. Position will be auto-registered for monitoring.</span>
                    </div>
                )}

                {/* HIGH-4: Success celebration with snowflake animation */}
                {step === 'done' && (
                    <div className="relative overflow-hidden rounded-xl">
                        <div className="snowflake-celebration">
                            {Array.from({ length: 12 }).map((_, i) => (
                                <Snowflake
                                    key={i}
                                    className="snowflake-particle"
                                    style={{
                                        left: `${(i / 12) * 100}%`,
                                        animationDelay: `${i * 0.15}s`,
                                        fontSize: `${10 + Math.random() * 8}px`,
                                    } as React.CSSProperties}
                                />
                            ))}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-status-safe bg-status-safe/10 border border-status-safe/20 px-4 py-3 relative z-10">
                            <CheckCircle className="w-4 h-4 flex-shrink-0" />
                            <span className="font-semibold">Position created successfully!</span>
                            <span className="text-status-safe/70 text-xs ml-auto">Redirecting to Dashboard...</span>
                        </div>
                    </div>
                )}

                {/* Open button */}
                <button
                    onClick={handleOpenPosition}
                    disabled={(!canOpen && step === 'idle') || isLoading || step === 'done'}
                    className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-gradient-to-r from-ice-500 to-ice-600 text-white font-bold text-base shadow-ice hover:shadow-ice-lg disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                >
                    {getButtonContent()}
                </button>
            </div>
        </div>
    )
}
