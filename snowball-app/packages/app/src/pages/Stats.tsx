import { useProtocolStats } from '@/hooks/useProtocolStats'
import { useMarkets } from '@/hooks/useMarkets'
import { formatEther } from 'viem'
import { RefreshCw, HelpCircle, TrendingUp, DollarSign, Coins } from 'lucide-react'

// Token icons (simple colored circles with initials)
function CollateralBadge({ symbol }: { symbol: string }) {
    const colors: Record<string, string> = {
        wCTC: 'bg-gradient-to-br from-blue-400 to-blue-600',
        lstCTC: 'bg-gradient-to-br from-emerald-400 to-emerald-600',
    }
    const initials: Record<string, string> = {
        wCTC: 'wC',
        lstCTC: 'lst',
    }
    return (
        <div className={`w-8 h-8 rounded-full ${colors[symbol] ?? 'bg-gray-600'} flex items-center justify-center text-white text-[10px] font-bold shadow-md flex-shrink-0`}>
            {initials[symbol] ?? symbol.slice(0, 2)}
        </div>
    )
}

// Info tooltip trigger
function InfoIcon({ tip }: { tip: string }) {
    return (
        <span className="group relative inline-flex ml-1 align-middle cursor-pointer">
            <HelpCircle className="w-3.5 h-3.5 text-gray-600 hover:text-gray-400 transition-colors" />
            <span className="absolute left-1/2 -translate-x-1/2 bottom-full mb-1.5 px-2 py-1 rounded-lg bg-dark-600 border border-dark-400/50 text-[11px] text-gray-300 whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none z-50 shadow-card transition-opacity">
                {tip}
            </span>
        </span>
    )
}

// Collateral Ratio color
function crColor(cr: number) {
    if (cr >= 200) return 'text-status-safe'
    if (cr >= 150) return 'text-status-warn'
    return 'text-status-danger'
}

export function Stats() {
    const { data: stats, isLoading: statsLoading, dataUpdatedAt } = useProtocolStats()
    const { data: markets = [], isLoading: marketsLoading, isFetching } = useMarkets()

    const lastUpdate = dataUpdatedAt
        ? new Date(dataUpdatedAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
        : '—'

    // Summary values
    const tvl = Number(stats?.totalCollateralUSD ?? 0)
    const borrowed = Number(stats?.totalBorrowedUSD ?? 0)
    const sbUSDPrice = Number(stats?.sbUSDPrice ?? 1)

    return (
        <div className="space-y-8 animate-fade-in">
            {/* Page header */}
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-white">Stats</h1>
                <div className="flex items-center gap-2 text-xs text-gray-500">
                    {isFetching && <RefreshCw className="w-3 h-3 animate-spin text-ice-400" />}
                    <span>Auto-refresh every 10s · Last: {lastUpdate}</span>
                </div>
            </div>

            {/* ── General ─────────────────────────────────────────── */}
            <section>
                <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">General</h2>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {/* Total Collateralized */}
                    <div className="bg-dark-700/60 border border-dark-400/40 rounded-2xl p-6 hover:border-ice-400/20 transition-colors hover:shadow-card-hover">
                        <div className="flex items-center gap-2 mb-2">
                            <TrendingUp className="w-4 h-4 text-ice-400" />
                            <p className="text-sm text-gray-400">Total Collateralized</p>
                        </div>
                        {statsLoading ? (
                            <div className="h-9 w-40 bg-dark-500 rounded-lg animate-pulse" />
                        ) : (
                            <p className="text-3xl font-bold text-white tracking-tight">
                                ${tvl.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </p>
                        )}
                    </div>

                    {/* Total Borrowed */}
                    <div className="bg-dark-700/60 border border-dark-400/40 rounded-2xl p-6 hover:border-ice-400/20 transition-colors hover:shadow-card-hover">
                        <div className="flex items-center gap-2 mb-2">
                            <DollarSign className="w-4 h-4 text-ice-400" />
                            <p className="text-sm text-gray-400">Total Borrowed</p>
                        </div>
                        {statsLoading ? (
                            <div className="h-9 w-40 bg-dark-500 rounded-lg animate-pulse" />
                        ) : (
                            <p className="text-3xl font-bold text-white tracking-tight">
                                ${borrowed.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </p>
                        )}
                    </div>

                    {/* sbUSD Price */}
                    <div className="bg-dark-700/60 border border-dark-400/40 rounded-2xl p-6 hover:border-ice-400/20 transition-colors hover:shadow-card-hover">
                        <div className="flex items-center gap-2 mb-2">
                            <Coins className="w-4 h-4 text-ice-400" />
                            <p className="text-sm text-gray-400">sbUSD Price</p>
                        </div>
                        {statsLoading ? (
                            <div className="h-9 w-24 bg-dark-500 rounded-lg animate-pulse" />
                        ) : (
                            <div className="flex items-end gap-2">
                                <p className="text-3xl font-bold text-white tracking-tight">
                                    ${sbUSDPrice.toFixed(2)}
                                </p>
                                <span className={`text-sm font-medium mb-0.5 ${Math.abs(sbUSDPrice - 1) < 0.005 ? 'text-status-safe' : 'text-status-warn'}`}>
                                    {Math.abs(sbUSDPrice - 1) < 0.005 ? '✓ Pegged' : '⚠ Depegged'}
                                </span>
                            </div>
                        )}
                    </div>
                </div>
            </section>

            {/* ── Individual Markets ──────────────────────────────── */}
            <section>
                <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">Individual Markets</h2>

                <div className="bg-dark-700/40 border border-dark-400/40 rounded-2xl overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-dark-400/40 bg-dark-700/60">
                                    <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                        Collateral
                                    </th>
                                    <th className="text-right px-4 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                        Total Collateral
                                    </th>
                                    <th className="text-right px-4 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                        Health Factor
                                        <InfoIcon tip="Health Factor = Collateral Value / Debt. Min 1.10 (wCTC) or 1.20 (lstCTC)" />
                                    </th>
                                    <th className="text-right px-4 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                        System HF
                                        <InfoIcon tip="System Health Factor threshold — triggers Recovery Mode when system falls below this level" />
                                    </th>
                                    <th className="text-right px-4 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                        LTV
                                        <InfoIcon tip="Max Loan-to-Value ratio = 1 / MCR" />
                                    </th>
                                    <th className="text-right px-4 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                        Total Borrow
                                    </th>
                                    <th className="text-right px-4 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                        Avg Interest
                                    </th>
                                    <th className="text-right px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                        SP APY
                                        <InfoIcon tip="Estimated APY for Stability Pool depositors" />
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {marketsLoading ? (
                                    <tr>
                                        <td colSpan={8} className="px-5 py-10 text-center">
                                            <div className="flex items-center justify-center gap-2 text-gray-500">
                                                <RefreshCw className="w-4 h-4 animate-spin text-ice-400" />
                                                <span>Loading markets...</span>
                                            </div>
                                        </td>
                                    </tr>
                                ) : markets.length === 0 ? (
                                    <tr>
                                        <td colSpan={8} className="px-5 py-10 text-center text-gray-500 text-sm">
                                            No markets found. Check API connection.
                                        </td>
                                    </tr>
                                ) : markets.map((market, idx) => {
                                    const totalCollUSD = Number(market.totalCollateralUSD)
                                    const totalBorrow = parseFloat(formatEther(BigInt(market.totalBorrow)))
                                    const currentCR = parseFloat(market.currentCR)
                                    const spDeposits = parseFloat(formatEther(BigInt(market.spDeposits)))
                                    const isLast = idx === markets.length - 1

                                    return (
                                        <tr
                                            key={market.branch}
                                            className={`group hover:bg-dark-600/40 transition-colors ${!isLast ? 'border-b border-dark-400/25' : ''}`}
                                        >
                                            {/* Collateral */}
                                            <td className="px-5 py-4">
                                                <div className="flex items-center gap-3">
                                                    <CollateralBadge symbol={market.collateralSymbol} />
                                                    <div>
                                                        <p className="font-semibold text-white group-hover:text-ice-300 transition-colors">
                                                            {market.collateralSymbol}
                                                        </p>
                                                        <p className="text-[11px] text-gray-500 font-mono">
                                                            Branch {market.branch}
                                                        </p>
                                                    </div>
                                                </div>
                                            </td>

                                            {/* Total Collateral */}
                                            <td className="px-4 py-4 text-right">
                                                <p className="font-semibold text-white">
                                                    ${totalCollUSD.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                </p>
                                            </td>

                                            {/* Health Factor */}
                                            <td className="px-4 py-4 text-right">
                                                <span className={`font-bold ${crColor(currentCR)}`}>
                                                    {(currentCR / 100).toFixed(2)}
                                                </span>
                                                <span className="text-gray-500 mx-1">/</span>
                                                <span className="text-gray-400 font-medium">{(parseFloat(market.mcr) / 100).toFixed(2)}</span>
                                            </td>

                                            {/* System HF */}
                                            <td className="px-4 py-4 text-right">
                                                <span className="text-gray-300 font-medium">{(parseFloat(market.ccr) / 100).toFixed(2)}</span>
                                            </td>

                                            {/* LTV */}
                                            <td className="px-4 py-4 text-right">
                                                <div className="inline-flex items-center gap-1.5">
                                                    <span className="text-gray-300 font-medium">{market.ltv}%</span>
                                                </div>
                                            </td>

                                            {/* Total Borrow */}
                                            <td className="px-4 py-4 text-right">
                                                <p className="font-semibold text-white">
                                                    {totalBorrow.toLocaleString('en-US', { maximumFractionDigits: 2 })}
                                                </p>
                                                <p className="text-[11px] text-gray-500">sbUSD</p>
                                            </td>

                                            {/* Avg Interest */}
                                            <td className="px-4 py-4 text-right">
                                                <span className="text-gray-300 font-medium">{market.avgInterestRate}%</span>
                                            </td>

                                            {/* SP APY */}
                                            <td className="px-5 py-4 text-right">
                                                <div className="flex flex-col items-end gap-0.5">
                                                    <span className="font-bold text-status-safe">{market.spAPY}%</span>
                                                    <span className="text-[11px] text-gray-500">
                                                        {spDeposits.toLocaleString('en-US', { maximumFractionDigits: 0 })} sbUSD
                                                    </span>
                                                </div>
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>

                    {/* Table footer — utilization bar */}
                    {!marketsLoading && markets.length > 0 && (
                        <div className="border-t border-dark-400/25 px-5 py-3 flex items-center justify-between">
                            <span className="text-xs text-gray-600">
                                {markets.length} {markets.length === 1 ? 'market' : 'markets'} · Updates every 10s
                            </span>
                            <div className="flex items-center gap-4 text-xs text-gray-600">
                                <span className="flex items-center gap-1">
                                    <span className="w-2 h-2 rounded-full bg-status-safe inline-block" /> HF ≥ 2.00: Healthy
                                </span>
                                <span className="flex items-center gap-1">
                                    <span className="w-2 h-2 rounded-full bg-status-warn inline-block" /> 1.50–2.00: At Risk
                                </span>
                                <span className="flex items-center gap-1">
                                    <span className="w-2 h-2 rounded-full bg-status-danger inline-block" /> &lt; 1.50: Danger
                                </span>
                            </div>
                        </div>
                    )}
                </div>
            </section>

            {/* ── Protocol Parameters ─────────────────────────────── */}
            <section>
                <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">Protocol Parameters</h2>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[
                        { label: 'wCTC Min HF', value: '1.10', tip: 'Minimum Health Factor — wCTC branch (liquidated below this)' },
                        { label: 'lstCTC Min HF', value: '1.20', tip: 'Minimum Health Factor — lstCTC branch (liquidated below this)' },
                        { label: 'wCTC Price', value: '$0.20', tip: 'Current mock oracle price' },
                        { label: 'lstCTC Price', value: '$0.21', tip: 'Current mock oracle price (1.05× exchange rate)' },
                        { label: 'Min Debt', value: '200 sbUSD', tip: 'Minimum amount to borrow per Trove' },
                        { label: 'wCTC System HF', value: '1.50', tip: 'System Health Factor — triggers Recovery Mode when system falls below' },
                        { label: 'lstCTC System HF', value: '1.60', tip: 'System Health Factor — triggers Recovery Mode when system falls below' },
                        { label: 'Network', value: 'Testnet', tip: 'Creditcoin Testnet (chainId: 102031)' },
                    ].map(({ label, value, tip }) => (
                        <div
                            key={label}
                            className="bg-dark-700/40 border border-dark-400/30 rounded-xl p-4 hover:border-ice-400/15 transition-colors"
                        >
                            <div className="flex items-center gap-1 mb-1">
                                <p className="text-xs text-gray-500">{label}</p>
                                <InfoIcon tip={tip} />
                            </div>
                            <p className="text-base font-bold text-white">{value}</p>
                        </div>
                    ))}
                </div>
            </section>
        </div>
    )
}
