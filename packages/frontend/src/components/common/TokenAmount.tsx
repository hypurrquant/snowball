import { formatEther } from 'viem'

interface TokenAmountProps {
    value: string       // wei bigint as string
    decimals?: number   // display decimals, default 2
    suffix?: string     // e.g. 'wCTC', 'sbUSD'
    className?: string
}

export function TokenAmount({ value, decimals = 2, suffix, className = '' }: TokenAmountProps) {
    let display = '0'
    try {
        const num = parseFloat(formatEther(BigInt(value)))
        display = num.toLocaleString('en-US', {
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals,
        })
    } catch {
        display = '0'
    }

    return (
        <span className={className}>
            {display}
            {suffix && <span className="ml-1 text-gray-400 text-sm font-normal">{suffix}</span>}
        </span>
    )
}

export function formatToken(value: string, decimals = 2): string {
    try {
        const num = parseFloat(formatEther(BigInt(value)))
        return num.toLocaleString('en-US', {
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals,
        })
    } catch {
        return '0'
    }
}

export function formatInterestRate(value: string): string {
    try {
        const raw = parseFloat(formatEther(BigInt(value)))
        return (raw * 100).toFixed(2)
    } catch {
        return '0.00'
    }
}
