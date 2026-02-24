import { useState, useEffect } from 'react'
import { useAccount, useWriteContract, usePublicClient } from 'wagmi'
import { useMarkets, Market } from '@/hooks/useMarkets'
import { useUserSPDeposits, SPUserDeposit } from '@/hooks/useUserSPDeposits'
import { useSPDeposit } from '@/hooks/useSPDeposit'
import { useSPWithdraw } from '@/hooks/useSPWithdraw'
import { useSPClaim } from '@/hooks/useSPClaim'
import { formatEther, parseEther, erc20Abi } from 'viem'
import { useQueryClient } from '@tanstack/react-query'
import { Coins, TrendingUp, Wallet, ChevronDown, ChevronUp, Loader2, CheckCircle, AlertTriangle } from 'lucide-react'
import { getSbUSDToken, getBranchAddresses } from '@/config/contracts'
import { useUserBalance } from '@/hooks/useUserBalance'

type Step = 'idle' | 'approving' | 'signing' | 'confirming' | 'done'

function PoolCard({ market, userDeposit }: { market: Market; userDeposit?: SPUserDeposit }) {
    const { address } = useAccount()
    const queryClient = useQueryClient()
    const [amount, setAmount] = useState('')
    const [activeTab, setActiveTab] = useState<'deposit' | 'withdraw' | 'claim'>('deposit')
    const [step, setStep] = useState<Step>('idle')
    const [error, setError] = useState<string | null>(null)

    const { data: balances } = useUserBalance(address)
    const sbUSDBalance = balances ? parseFloat(formatEther(BigInt(balances.sbUSD))) : 0

    const { writeContractAsync } = useWriteContract()
    const publicClient = usePublicClient()
    const { deposit, isConfirmed: isDepositConfirmed, isReverted: isDepositReverted, reset: resetDeposit } = useSPDeposit()
    const { withdraw, isConfirmed: isWithdrawConfirmed, isReverted: isWithdrawReverted, reset: resetWithdraw } = useSPWithdraw()
    const { claim, isConfirmed: isClaimConfirmed, isReverted: isClaimReverted, reset: resetClaim } = useSPClaim()

    const spDeposits = parseFloat(formatEther(BigInt(market.spDeposits))).toLocaleString('en-US', { maximumFractionDigits: 0 })
    const myDeposit = userDeposit ? parseFloat(formatEther(BigInt(userDeposit.deposit))) : 0
    const myDepositFormatted = myDeposit.toLocaleString('en-US', { maximumFractionDigits: 2 })
    const boldGain = userDeposit ? parseFloat(formatEther(BigInt(userDeposit.boldGain))) : 0
    const collGain = userDeposit ? parseFloat(formatEther(BigInt(userDeposit.collGain))) : 0

    const collType = market.collateralSymbol
    const isLoading = step !== 'idle' && step !== 'done'
    const branch = market.branch as 0 | 1

    const isConfirmed = isDepositConfirmed || isWithdrawConfirmed || isClaimConfirmed
    const isReverted = isDepositReverted || isWithdrawReverted || isClaimReverted

    useEffect(() => {
        if (isConfirmed && step === 'confirming') {
            setStep('done')
            queryClient.invalidateQueries({ queryKey: ['user-sp-deposits'] })
            queryClient.invalidateQueries({ queryKey: ['markets'] })
        }
    }, [isConfirmed, step, queryClient])

    useEffect(() => {
        if (isReverted && step === 'confirming') {
            setError('Transaction reverted on-chain.')
            setStep('idle')
        }
    }, [isReverted, step])

    // Reset on tab change
    useEffect(() => {
        setAmount('')
        setStep('idle')
        setError(null)
        resetDeposit()
        resetWithdraw()
        resetClaim()
    }, [activeTab, resetDeposit, resetWithdraw, resetClaim])

    const handleAction = async () => {
        if (!address) return
        setError(null)

        try {
            if (activeTab === 'deposit') {
                if (!amount || parseFloat(amount) <= 0) return
                const parsedAmount = parseEther(amount)
                const { stabilityPool } = getBranchAddresses(branch)

                // Approve sbUSD
                setStep('approving')
                const approveTxHash = await writeContractAsync({
                    address: getSbUSDToken(),
                    abi: erc20Abi,
                    functionName: 'approve',
                    args: [stabilityPool, parsedAmount],
                })
                await publicClient!.waitForTransactionReceipt({ hash: approveTxHash })

                // Direct contract call
                setStep('signing')
                await deposit({ branch, amount: parsedAmount })
                setStep('confirming')
            } else if (activeTab === 'withdraw') {
                if (!amount || parseFloat(amount) <= 0) return

                setStep('signing')
                await withdraw({ branch, amount: parseEther(amount) })
                setStep('confirming')
            } else if (activeTab === 'claim') {
                setStep('signing')
                await claim({ branch })
                setStep('confirming')
            }
        } catch (err: any) {
            console.error(`SP ${activeTab} failed:`, err)
            setError(err?.shortMessage ?? err?.message ?? 'Transaction failed')
            setStep('idle')
        }
    }

    const stepLabel: Record<Step, string> = {
        idle: '',
        approving: 'Approving...',
        signing: 'Sign in wallet...',
        confirming: 'Confirming...',
        done: 'Done!',
    }

    return (
        <div className="bg-dark-700 border border-dark-400/40 hover:border-ice-400/20 rounded-2xl p-5 space-y-4 transition-all duration-300 hover:shadow-card-hover">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-ice-400/10 flex items-center justify-center">
                        <Coins className="w-5 h-5 text-ice-400" />
                    </div>
                    <div>
                        <h3 className="font-bold text-white">{market.collateralSymbol} Pool</h3>
                        <p className="text-xs text-gray-500">Stability Pool · Branch {market.branch}</p>
                    </div>
                </div>
                <div className="text-right">
                    <p className="text-lg font-bold text-status-safe">{market.spAPY}% APY</p>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-3 text-sm">
                <div className="bg-dark-600/50 rounded-xl p-3">
                    <p className="text-gray-500 text-xs mb-1">Total Deposits</p>
                    <p className="text-white font-semibold">{spDeposits} sbUSD</p>
                </div>
                <div className="bg-dark-600/50 rounded-xl p-3">
                    <p className="text-gray-500 text-xs mb-1">My Deposit</p>
                    <p className="text-white font-semibold">{myDepositFormatted} sbUSD</p>
                </div>
                <div className="bg-dark-600/50 rounded-xl p-3">
                    <p className="text-gray-500 text-xs mb-1">Rewards</p>
                    <p className="text-white font-semibold text-xs">
                        {boldGain > 0 ? `${boldGain.toFixed(2)} sbUSD` : '—'}
                        {collGain > 0 && ` + ${collGain.toFixed(2)} ${collType}`}
                    </p>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 bg-dark-600/50 rounded-xl p-1">
                {(['deposit', 'withdraw', 'claim'] as const).map((tab) => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`flex-1 py-2 text-xs font-semibold rounded-lg capitalize transition-all ${activeTab === tab ? 'bg-ice-400/20 text-ice-300' : 'text-gray-500 hover:text-gray-300'
                            }`}
                    >
                        {tab === 'deposit' ? 'Deposit' : tab === 'withdraw' ? 'Withdraw' : 'Claim'}
                    </button>
                ))}
            </div>

            {/* Error */}
            {error && (
                <div className="flex items-center gap-2 text-xs text-status-danger bg-status-danger/10 border border-status-danger/20 rounded-xl px-3 py-2">
                    <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                    {error}
                </div>
            )}

            {/* Success */}
            {step === 'done' && (
                <div className="flex items-center gap-2 text-xs text-status-safe bg-status-safe/10 border border-status-safe/20 rounded-xl px-3 py-2">
                    <CheckCircle className="w-3.5 h-3.5 flex-shrink-0" />
                    Transaction completed successfully!
                </div>
            )}

            {/* Action */}
            {activeTab !== 'claim' ? (
                <div className="space-y-2">
                    {/* 잔액 표시 */}
                    {activeTab === 'deposit' && sbUSDBalance > 0 && (
                        <div className="flex items-center justify-between text-xs text-gray-500">
                            <span>Wallet Balance</span>
                            <button
                                onClick={() => setAmount(sbUSDBalance.toFixed(6))}
                                className="font-mono text-ice-400 hover:text-ice-300 transition-colors"
                            >
                                {sbUSDBalance.toLocaleString('en-US', { maximumFractionDigits: 2 })} sbUSD
                            </button>
                        </div>
                    )}
                    {activeTab === 'withdraw' && myDeposit > 0 && (
                        <div className="flex items-center justify-between text-xs text-gray-500">
                            <span>Deposited</span>
                            <button
                                onClick={() => setAmount(myDeposit.toFixed(6))}
                                className="font-mono text-ice-400 hover:text-ice-300 transition-colors"
                            >
                                {myDepositFormatted} sbUSD
                            </button>
                        </div>
                    )}
                    <div className="flex gap-2">
                        <input
                            type="number"
                            placeholder={activeTab === 'deposit' ? 'sbUSD amount to deposit' : 'sbUSD amount to withdraw'}
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            className="flex-1 bg-dark-600 border border-dark-400/40 focus:border-ice-400/50 rounded-xl px-4 py-2.5 text-sm text-white outline-none placeholder-gray-600 transition-colors"
                            disabled={isLoading}
                        />
                        <button
                            onClick={handleAction}
                            disabled={!amount || parseFloat(amount) <= 0 || isLoading}
                            className="px-4 py-2.5 bg-gradient-to-r from-ice-500 to-ice-600 text-white text-sm font-semibold rounded-xl shadow-ice disabled:opacity-40 disabled:cursor-not-allowed hover:shadow-ice-lg transition-all flex items-center gap-1.5 whitespace-nowrap"
                        >
                            {isLoading ? (
                                <><Loader2 className="w-4 h-4 animate-spin" />{activeTab === 'deposit' ? 'Depositing...' : 'Withdrawing...'}</>
                            ) : activeTab === 'deposit' ? (
                                <><ChevronDown className="w-4 h-4" />Deposit</>
                            ) : (
                                <><ChevronUp className="w-4 h-4" />Withdraw</>
                            )}
                        </button>
                    </div>
                </div>
            ) : (
                <button
                    onClick={handleAction}
                    disabled={isLoading || (boldGain <= 0 && collGain <= 0)}
                    className="w-full py-2.5 bg-status-safe/10 border border-status-safe/30 text-status-safe text-sm font-semibold rounded-xl hover:bg-status-safe/20 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                >
                    {isLoading ? (
                        <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            {stepLabel[step]}
                        </>
                    ) : (
                        <>
                            <TrendingUp className="w-4 h-4" /> Claim Rewards
                        </>
                    )}
                </button>
            )}
        </div>
    )
}

export function Earn() {
    const { isConnected, address } = useAccount()
    const { data: markets = [], isLoading } = useMarkets()
    const { data: spDeposits = [] } = useUserSPDeposits(address)

    if (!isConnected) {
        return (
            <div className="flex flex-col items-center justify-center h-full min-h-[60vh] space-y-4">
                <Wallet className="w-12 h-12 text-ice-400" />
                <h2 className="text-xl font-bold text-white">Connect Your Wallet</h2>
                <p className="text-gray-400 text-sm">Connect a wallet to deposit into Stability Pools and earn rewards.</p>
            </div>
        )
    }

    return (
        <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
            <div>
                <h1 className="text-2xl font-bold text-white">Stability Pools</h1>
                <p className="text-gray-500 text-sm mt-1">Deposit sbUSD and earn rewards from liquidations.</p>
            </div>

            {isLoading ? (
                <div className="space-y-6">
                    {[1, 2].map((i) => <div key={i} className="h-72 bg-dark-700 rounded-2xl animate-pulse" />)}
                </div>
            ) : (
                <div className="space-y-6">
                    {markets.map((market) => {
                        const userDep = spDeposits.find((d) => d.branch === market.branch)
                        return <PoolCard key={market.branch} market={market} userDeposit={userDep} />
                    })}
                    {markets.length === 0 && (
                        <div className="text-center py-12 text-gray-500">Loading market data...</div>
                    )}
                </div>
            )}
        </div>
    )
}
