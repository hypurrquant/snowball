import { useState } from 'react'
import { useAccount, useBalance } from 'wagmi'
import { parseUnits, formatUnits } from 'viem'
import { useLendSupply } from '@/hooks/lend/useLendSupply'
import { useLendWithdraw } from '@/hooks/lend/useLendWithdraw'
import { useTokenApprove } from '@/hooks/lend/useTokenApprove'
import { LEND_ADDRESSES } from '@/config/lendContracts'
import { toAssetsDown } from '@/lib/lendMath'
import { Loader2 } from 'lucide-react'

export function SupplyPanel({ market, position }: { market: any, position: any }) {
    const { address } = useAccount()
    const [tab, setTab] = useState<'supply' | 'withdraw'>('supply')
    const [amount, setAmount] = useState('')

    const { data: balanceData } = useBalance({
        address,
        token: market.config.loanToken,
    })

    const { approve, isPending: approvePending } = useTokenApprove()
    const { supply, isPending: supplyPending } = useLendSupply()
    const { withdraw, isPending: withdrawPending } = useLendWithdraw()

    const maxSupply = balanceData ? Number(formatUnits(balanceData.value, market.config.loanDecimals)) : 0
    const suppliedAssets = position ? Number(formatUnits(toAssetsDown(position.supplyShares, market.totalSupplyAssets, market.totalSupplyShares), market.config.loanDecimals)) : 0

    const isPending = approvePending || supplyPending || withdrawPending

    const handleAction = async () => {
        if (!amount || isNaN(Number(amount)) || !address) return
        if (tab === 'supply') {
            const rawAmount = parseUnits(amount, market.config.loanDecimals)
            try {
                await approve({
                    token: market.config.loanToken,
                    spender: LEND_ADDRESSES.snowballLend as `0x${string}`,
                    amount: rawAmount,
                })
                await supply({
                    marketId: market.config.id,
                    assets: rawAmount,
                    shares: 0n,
                    onBehalf: address,
                })
                setAmount('')
            } catch (e) {
                console.error(e)
            }
        } else {
            const rawAmount = parseUnits(amount, market.config.loanDecimals)
            try {
                await withdraw({
                    marketId: market.config.id,
                    assets: rawAmount,
                    shares: 0n,
                    onBehalf: address,
                    receiver: address,
                })
                setAmount('')
            } catch (e) {
                console.error(e)
            }
        }
    }

    return (
        <div className="card p-5 space-y-4">
            <div className="flex p-1 bg-dark-600/50 rounded-lg">
                <button
                    className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-colors ${tab === 'supply' ? 'bg-dark-500 text-white' : 'text-gray-400 hover:text-white'}`}
                    onClick={() => setTab('supply')}
                >
                    Supply
                </button>
                <button
                    className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-colors ${tab === 'withdraw' ? 'bg-dark-500 text-white' : 'text-gray-400 hover:text-white'}`}
                    onClick={() => setTab('withdraw')}
                >
                    Withdraw
                </button>
            </div>

            <div className="space-y-1">
                <div className="flex justify-between text-xs text-gray-400 mb-1">
                    <span>Amount</span>
                    <span>
                        {tab === 'supply' ? `Wallet: ${maxSupply.toFixed(4)}` : `Supplied: ${suppliedAssets.toFixed(4)}`} {market.config.loanSymbol}
                    </span>
                </div>
                <div className="relative">
                    <input
                        type="number"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        placeholder="0.0"
                        className="input w-full pr-16 bg-dark-800 border-dark-500 py-3 text-lg"
                        disabled={isPending}
                    />
                    <button
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-ice-400 hover:text-ice-300"
                        onClick={() => setAmount(tab === 'supply' ? maxSupply.toString() : suppliedAssets.toString())}
                        disabled={isPending}
                    >
                        MAX
                    </button>
                </div>
            </div>

            <button
                className={`btn-primary w-full py-3 flex items-center justify-center gap-2 ${isPending ? 'opacity-50 cursor-not-allowed' : ''}`}
                onClick={handleAction}
                disabled={isPending || !amount || Number(amount) <= 0}
            >
                {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                {tab === 'supply' ? 'Supply' : 'Withdraw'} {market.config.loanSymbol}
            </button>
        </div>
    )
}
