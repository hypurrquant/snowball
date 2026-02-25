import { Snowflake, DollarSign, Circle } from 'lucide-react'

export function TokenIcon({ symbol, className = "w-8 h-8" }: { symbol: string, className?: string }) {
    switch (symbol) {
        case 'wCTC':
            return (
                <div className={`rounded-full bg-blue-500/20 flex items-center justify-center border border-blue-500/50 ${className}`}>
                    <span className="text-blue-400 font-bold text-xs">C</span>
                </div>
            )
        case 'lstCTC':
            return (
                <div className={`rounded-full bg-purple-500/20 flex items-center justify-center border border-purple-500/50 ${className}`}>
                    <span className="text-purple-400 font-bold text-[10px]">lst</span>
                </div>
            )
        case 'sbUSD':
            return (
                <div className={`rounded-full bg-ice-500/20 flex items-center justify-center border border-ice-500/50 ${className}`}>
                    <Snowflake className="w-1/2 h-1/2 text-ice-400" />
                </div>
            )
        case 'USDC':
            return (
                <div className={`rounded-full bg-blue-600/20 flex items-center justify-center border border-blue-600/50 ${className}`}>
                    <DollarSign className="w-1/2 h-1/2 text-blue-500" />
                </div>
            )
        default:
            return (
                <div className={`rounded-full bg-gray-500/20 flex items-center justify-center border border-gray-500/50 ${className}`}>
                    <Circle className="w-1/2 h-1/2 text-gray-400" />
                </div>
            )
    }
}

export function MarketTokenPair({ loanSymbol, collSymbol, size = "md" }: { loanSymbol: string, collSymbol: string, size?: "sm" | "md" | "lg" }) {
    const sizeClasses = {
        sm: "w-6 h-6",
        md: "w-8 h-8",
        lg: "w-10 h-10"
    }
    const offsetClasses = {
        sm: "-ml-2",
        md: "-ml-3",
        lg: "-ml-4"
    }

    return (
        <div className="flex items-center">
            <div className="z-10 bg-dark-800 rounded-full p-0.5">
                <TokenIcon symbol={collSymbol} className={sizeClasses[size]} />
            </div>
            <div className={`bg-dark-800 rounded-full p-0.5 ${offsetClasses[size]}`}>
                <TokenIcon symbol={loanSymbol} className={sizeClasses[size]} />
            </div>
        </div>
    )
}
