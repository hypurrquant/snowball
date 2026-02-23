interface CRGaugeProps {
    cr: number  // percentage, e.g. 200
    mcr: number // minimum CR, e.g. 110
    className?: string
}

function getCRStatus(cr: number) {
    if (cr >= 200) return { color: 'bg-status-safe', glow: 'shadow-[0_0_8px_rgba(34,197,94,0.5)]', text: 'text-status-safe', label: 'Safe' }
    if (cr >= 150) return { color: 'bg-status-warn', glow: 'shadow-[0_0_8px_rgba(234,179,8,0.5)]', text: 'text-status-warn', label: 'Warning' }
    return { color: 'bg-status-danger', glow: 'shadow-[0_0_8px_rgba(239,68,68,0.5)]', text: 'text-status-danger', label: 'Danger' }
}

export function CRGauge({ cr, mcr, className = '' }: CRGaugeProps) {
    const status = getCRStatus(cr)
    const maxCR = 300
    const minDisplay = mcr
    const range = maxCR - minDisplay
    const filled = Math.min(Math.max((cr - minDisplay) / range, 0), 1)

    return (
        <div className={`space-y-1 ${className}`}>
            <div className="flex items-center justify-between text-xs">
                <span className={`font-semibold ${status.text}`}>{cr.toFixed(2)}%</span>
                <span className="text-gray-500 text-[10px]">MCR: {mcr}%</span>
            </div>
            <div className="relative h-2 bg-dark-500 rounded-full overflow-hidden">
                {/* Background gradient track */}
                <div className="absolute inset-0 rounded-full bg-gradient-to-r from-status-danger via-status-warn to-status-safe opacity-20" />
                {/* Filled bar */}
                <div
                    className={`absolute left-0 top-0 h-full rounded-full transition-all duration-500 ${status.color} ${status.glow}`}
                    style={{ width: `${filled * 100}%` }}
                />
            </div>
            <div className="flex justify-between text-[10px] text-gray-500">
                <span>{mcr}%</span>
                <span>300%</span>
            </div>
        </div>
    )
}
