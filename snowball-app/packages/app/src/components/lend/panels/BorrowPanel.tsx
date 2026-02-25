import { useState } from 'react'
import { useAccount, useBalance } from 'wagmi'
import { parseUnits, formatUnits } from 'viem'
import { useLendBorrow } from '@/hooks/lend/useLendBorrow'
import { useLendRepay } from '@/hooks/lend/useLendRepay'
import { useLendSupplyCollateral } from '@/hooks/lend/useLendSupplyCollateral'
import { useLendWithdrawCollateral } from '@/hooks/lend/useLendWithdrawCollateral'
import { toAssetsDown, calculateHealthFactor, borrowRateToAPR } from '@/lib/lendMath'
import { Loader2 } from 'lucide-react'

export function BorrowPanel({ market, position }: { market: any, position: any }) {
    const { address } = useAccount()
    const [action, setAction] = useState<'borrow' | 'repay'>('borrow')
    const [collateralAmount, setCollateralAmount] = useState('')
    const [borrowAmount, setBorrowAmount] = useState('')

    const { data: colBalance } = useBalance({ address, token: market.config.collateralToken })
    const { data: loanBalance } = useBalance({ address, token: market.config.loanToken })

    const maxColl = colBalance ? Number(formatUnits(colBalance.value, market.config.collDecimals)) : 0
    const maxRepay = loanBalance ? Number(formatUnits(loanBalance.value, market.config.loanDecimals)) : 0

    const suppliedColl = position ? Number(formatUnits(position.collateral, market.config.collDecimals)) : 0
    const borrowedAssetsNum = position ? Number(formatUnits(toAssetsDown(position.borrowShares, market.totalBorrowAssets, market.totalBorrowShares), market.config.loanDecimals)) : 0

    const { borrow, isPending: borrowPending } = useLendBorrow()
    const { repay, isPending: repayPending } = useLendRepay()
    const { supplyCollateral, isPending: collSupplyPending } = useLendSupplyCollateral()
    const { withdrawCollateral, isPending: collWithdrawPending } = useLendWithdrawCollateral()

    const isPending = borrowPending || repayPending || collSupplyPending || collWithdrawPending

    const handleCollateral = async (isDeposit: boolean) => {
        if (!collateralAmount || isNaN(Number(collateralAmount)) || !address) return
        try {
            const raw = parseUnits(collateralAmount, market.config.collDecimals)
            if (isDeposit) {
                await supplyCollateral({
                    marketId: market.config.id,
                    assets: raw,
                    onBehalf: address,
                })
            } else {
                await withdrawCollateral({
                    marketId: market.config.id,
                    assets: raw,
                    onBehalf: address,
                    receiver: address,
                })
            }
            setCollateralAmount('')
        } catch (e) {
            console.error(e)
        }
    }

    const handleBorrow = async () => {
        if (!borrowAmount || isNaN(Number(borrowAmount)) || !address) return
        try {
            const raw = parseUnits(borrowAmount, market.config.loanDecimals)
            if (action === 'borrow') {
                await borrow({
                    marketId: market.config.id,
                    assets: raw,
                    shares: 0n,
                    onBehalf: address,
                    receiver: address,
                })
            } else {
                await repay({
                    marketId: market.config.id,
                    assets: raw,
                    shares: 0n,
                    onBehalf: address,
                })
            }
            setBorrowAmount('')
        } catch (e) {
            console.error(e)
        }
    }

    const currentHF = calculateHealthFactor(
        position ? position.collateral : 0n,
        position ? toAssetsDown(position.borrowShares, market.totalBorrowAssets, market.totalBorrowShares) : 0n,
        market.oraclePrice,
        market.config.lltv,
        market.config.collDecimals,
        market.config.loanDecimals
    )

    const apr = borrowRateToAPR(market.borrowRatePerSecond)

    return (
        <div className="space-y-4">
            <div className="card p-5 space-y-4 border-dark-500 border">
                <h3 className="text-sm font-semibold text-white">1. Manage Collateral</h3>
                <div className="space-y-1">
                    <div className="flex justify-between text-xs text-gray-400 mb-1">
                        <span>Amount</span>
                        <span>Wallet: {maxColl.toFixed(4)} | Supplied: {suppliedColl.toFixed(4)} {market.config.collSymbol}</span>
                    </div>
                    <div className="relative">
                        <input
                            type="number"
                            value={collateralAmount}
                            onChange={(e) => setCollateralAmount(e.target.value)}
                            placeholder="0.0"
                            className="input w-full bg-dark-800 border-dark-500 py-3 text-lg"
                            disabled={isPending}
                        />
                    </div>
                </div>
                <div className="flex gap-2">
                    <button
                        className="btn-secondary flex-1 py-3 text-sm disabled:opacity-50"
                        onClick={() => handleCollateral(true)}
                        disabled={isPending || !collateralAmount || Number(collateralAmount) <= 0}
                    >
                        Deposit {market.config.collSymbol}
                    </button>
                    <button
                        className="btn-secondary flex-1 py-3 text-sm disabled:opacity-50"
                        onClick={() => handleCollateral(false)}
                        disabled={isPending || !collateralAmount || Number(collateralAmount) <= 0}
                    >
                        Withdraw {market.config.collSymbol}
                    </button>
                </div>
            </div>

            <div className="card p-5 space-y-4">
                <div className="flex justify-between items-center">
                    <h3 className="text-sm font-semibold text-white">2. Borrow / Repay</h3>
                    <div className="flex p-1 bg-dark-600/50 rounded-lg max-w-[150px]">
                        <button
                            className={`flex-1 py-1 text-xs font-medium rounded-md transition-colors ${action === 'borrow' ? 'bg-dark-500 text-white' : 'text-gray-400 hover:text-white'}`}
                            onClick={() => setAction('borrow')}
                        >
                            Borrow
                        </button>
                        <button
                            className={`flex-1 py-1 text-xs font-medium rounded-md transition-colors ${action === 'repay' ? 'bg-dark-500 text-white' : 'text-gray-400 hover:text-white'}`}
                            onClick={() => setAction('repay')}
                        >
                            Repay
                        </button>
                    </div>
                </div>

                <div className="space-y-1">
                    <div className="flex justify-between text-xs text-gray-400 mb-1">
                        <span>Amount</span>
                        <span>
                            {action === 'borrow' ? `Borrowed: ${borrowedAssetsNum.toFixed(4)}` : `Wallet: ${maxRepay.toFixed(4)}`} {market.config.loanSymbol}
                        </span>
                    </div>
                    <div className="relative">
                        <input
                            type="number"
                            value={borrowAmount}
                            onChange={(e) => setBorrowAmount(e.target.value)}
                            placeholder="0.0"
                            className="input w-full bg-dark-800 border-dark-500 py-3 text-lg"
                            disabled={isPending}
                        />
                    </div>
                </div>

                <div className="p-3 bg-dark-600/30 rounded-lg space-y-2 text-sm">
                    <div className="flex justify-between border-b border-dark-500/50 pb-2">
                        <span className="text-gray-400">Health Factor</span>
                        <span className={`font-semibold ${currentHF && currentHF < 1.5 ? 'text-red-400' : 'text-green-400'}`}>
                            {currentHF ? currentHF.toFixed(2) : '∞'}
                        </span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-gray-400">Borrow APR</span>
                        <span className="text-white font-semibold">{apr.toFixed(2)}%</span>
                    </div>
                </div>

                <button
                    className={`btn-primary w-full py-3 flex items-center justify-center gap-2 ${isPending ? 'opacity-50 cursor-not-allowed' : ''}`}
                    onClick={handleBorrow}
                    disabled={isPending || !borrowAmount || Number(borrowAmount) <= 0}
                >
                    {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                    {action === 'borrow' ? 'Borrow' : 'Repay'} {market.config.loanSymbol}
                </button>
            </div>
        </div>
    )
}
