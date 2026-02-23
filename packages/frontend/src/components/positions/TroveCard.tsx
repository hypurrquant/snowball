import { formatEther } from 'viem'
import { CRGauge } from '@/components/common/CRGauge'
import { Position } from '@/hooks/useUserPositions'
import { Settings2, X, Bot, Percent } from 'lucide-react'

interface TroveCardProps {
    position: Position
    onAdjust?: () => void
    onClose?: () => void
    onAdjustRate?: () => void
}

export function TroveCard({ position, onAdjust, onClose, onAdjustRate }: TroveCardProps) {
    const collateral = parseFloat(formatEther(BigInt(position.collateral))).toLocaleString('en-US', { maximumFractionDigits: 2 })
    const debt = parseFloat(formatEther(BigInt(position.debt))).toLocaleString('en-US', { maximumFractionDigits: 2 })
    const cr = parseFloat(position.cr)
    const interestRate = parseFloat(position.interestRate)

    const mcr = position.branch === 1 ? 120 : 110
    const crColor = cr >= 200 ? 'text-status-safe' : cr >= 150 ? 'text-status-warn' : 'text-status-danger'
    const liqPriceFormatted = parseFloat(position.liquidationPrice).toFixed(4)

    // MEDIUM-5: Color-coded left border based on CR health
    const safetyColor = cr >= 200 ? '#22c55e' : cr >= 150 ? '#f59e0b' : '#ef4444'

    return (
        <div
            className="bg-dark-700 border border-dark-400/40 border-l-[3px] hover:border-ice-400/20 hover:border-l-[3px] rounded-2xl p-5 transition-all duration-300 hover:shadow-card-hover space-y-4"
            style={{ borderLeftColor: safetyColor }}
        >
            {/* Header */}
            <div className="flex items-start justify-between">
                <div>
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-mono text-gray-500">Trove #{position.troveId}</span>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-ice-400/10 text-ice-400 border border-ice-400/20 font-medium">
                            {position.collateralSymbol}
                        </span>
                        {position.agentManaged && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-status-safe/10 text-status-safe border border-status-safe/20 flex items-center gap-1">
                                <Bot className="w-3 h-3" /> AI Managed
                            </span>
                        )}
                    </div>
                </div>
                <span className={`text-sm font-bold ${crColor}`}>HF {(cr / 100).toFixed(2)}</span>
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                    <p className="text-gray-500 text-xs mb-0.5">Collateral</p>
                    <p className="text-white font-medium">{collateral} <span className="text-gray-400 text-xs">{position.collateralSymbol}</span></p>
                    <p className="text-gray-500 text-[11px]">${position.collateralUSD}</p>
                </div>
                <div>
                    <p className="text-gray-500 text-xs mb-0.5">Debt</p>
                    <p className="text-white font-medium">{debt} <span className="text-gray-400 text-xs">sbUSD</span></p>
                </div>
                <div>
                    <p className="text-gray-500 text-xs mb-0.5">Interest Rate</p>
                    <p className="text-white font-medium">{interestRate}% <span className="text-gray-400 text-xs">APR</span></p>
                </div>
                <div>
                    <p className="text-gray-500 text-xs mb-0.5">Liquidation Price</p>
                    <p className="text-status-danger font-mono font-medium text-sm">${liqPriceFormatted}</p>
                </div>
            </div>

            {/* CR Gauge */}
            <CRGauge cr={cr} mcr={mcr} />

            {/* Actions */}
            <div className="flex gap-2 pt-1">
                <button
                    onClick={onAdjust}
                    className="flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold py-2 rounded-xl bg-ice-400/10 text-ice-400 border border-ice-400/20 hover:bg-ice-400/20 transition-colors"
                >
                    <Settings2 className="w-3.5 h-3.5" /> Adjust
                </button>
                <button
                    onClick={onAdjustRate}
                    className="flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold py-2 rounded-xl bg-dark-500 text-gray-400 border border-dark-400/40 hover:bg-ice-400/10 hover:text-ice-400 hover:border-ice-400/20 transition-colors"
                >
                    <Percent className="w-3.5 h-3.5" /> Rate
                </button>
                <button
                    onClick={onClose}
                    className="flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold py-2 rounded-xl bg-dark-500 text-gray-400 border border-dark-400/40 hover:bg-status-danger/10 hover:text-status-danger hover:border-status-danger/30 transition-colors"
                >
                    <X className="w-3.5 h-3.5" /> Close
                </button>
            </div>
        </div>
    )
}
