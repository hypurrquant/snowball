import { useParams, useSearchParams, Link } from 'react-router-dom'
import { useLendMarkets } from '@/hooks/lend/useLendMarkets'
import { useLendPosition } from '@/hooks/lend/useLendPosition'
import { MarketTokenPair } from '@/components/lend/MarketTokenPair'
import { SupplyPanel } from '@/components/lend/panels/SupplyPanel'
import { BorrowPanel } from '@/components/lend/panels/BorrowPanel'
import { utilization, supplyAPY, borrowRateToAPR } from '@/lib/lendMath'
import { formatUnits } from 'viem'
import { ArrowLeft, ExternalLink } from 'lucide-react'

export function LendMarketDetail() {
    const { id } = useParams()
    const [searchParams, setSearchParams] = useSearchParams()

    // Default to 'supply' if 'tab' is missing or invalid
    const activeTab = searchParams.get('tab') === 'borrow' ? 'borrow' : 'supply'

    const { markets, isLoading: marketsLoading } = useLendMarkets()
    const market = markets.find(m => m.config.id === id)

    const { supplyShares, borrowShares, collateral, isLoading: positionLoading } = useLendPosition((id || '0x') as `0x${string}`)
    const position = { supplyShares, borrowShares, collateral }

    if (marketsLoading) {
        return <div className="max-w-4xl mx-auto p-4 animate-pulse"><div className="h-64 bg-dark-600/30 rounded-2xl" /></div>
    }

    if (!market) {
        return (
            <div className="max-w-4xl mx-auto p-4 text-center space-y-4">
                <h2 className="text-xl font-bold text-white">Market not found</h2>
                <Link to="/lend/markets" className="btn-secondary px-6 py-2 inline-flex items-center gap-2">
                    <ArrowLeft className="w-4 h-4" /> Back to Markets
                </Link>
            </div>
        )
    }

    const { config } = market
    const util = utilization(market.totalBorrowAssets, market.totalSupplyAssets)
    const apr = borrowRateToAPR(market.borrowRatePerSecond)
    const apy = supplyAPY(apr, util, Number(formatUnits(market.fee, 18)))

    const supplyNum = Number(formatUnits(market.totalSupplyAssets, config.loanDecimals))
    const borrowNum = Number(formatUnits(market.totalBorrowAssets, config.loanDecimals))

    const handleTabChange = (tab: 'supply' | 'borrow') => {
        setSearchParams({ tab })
    }

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <Link to="/lend/markets" className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors">
                <ArrowLeft className="w-4 h-4" /> Back to Markets
            </Link>

            <div className="grid lg:grid-cols-3 gap-6">
                {/* Left: Market Info */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="card p-6 space-y-6">
                        <div className="flex items-center gap-4">
                            <MarketTokenPair collSymbol={config.collSymbol} loanSymbol={config.loanSymbol} size="lg" />
                            <div>
                                <h1 className="text-2xl font-bold text-white tracking-tight">{config.name}</h1>
                                <a href={`https://explorer.morpho.org/market?id=${config.id}`} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-xs text-ice-400 hover:text-ice-300 transition-colors mt-1">
                                    View on Morpho <ExternalLink className="w-3 h-3" />
                                </a>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-dark-600/50">
                            <div className="flex flex-col">
                                <span className="text-sm text-gray-500">Utilization</span>
                                <span className="text-lg font-semibold text-white">{util.toFixed(2)}%</span>
                            </div>
                            <div className="flex flex-col">
                                <span className="text-sm text-gray-500">Earn APY</span>
                                <span className="text-lg font-semibold text-ice-400">{apy.toFixed(2)}%</span>
                            </div>
                            <div className="flex flex-col">
                                <span className="text-sm text-gray-500">Borrow APR</span>
                                <span className="text-lg font-semibold text-red-400">{apr.toFixed(2)}%</span>
                            </div>
                            <div className="flex flex-col">
                                <span className="text-sm text-gray-500">LLTV</span>
                                <span className="text-lg font-semibold text-white">{Number(formatUnits(config.lltv, 18)) * 100}%</span>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 pt-4 border-t border-dark-600/50">
                            <div className="flex flex-col">
                                <span className="text-sm text-gray-500">Total Supplied</span>
                                <span className="text-lg font-semibold text-white">{supplyNum.toLocaleString(undefined, { maximumFractionDigits: 2 })} <span className="text-sm text-gray-400">{config.loanSymbol}</span></span>
                            </div>
                            <div className="flex flex-col">
                                <span className="text-sm text-gray-500">Total Borrowed</span>
                                <span className="text-lg font-semibold text-white">{borrowNum.toLocaleString(undefined, { maximumFractionDigits: 2 })} <span className="text-sm text-gray-400">{config.loanSymbol}</span></span>
                            </div>
                        </div>

                        {/* More detailed market information could go here: Oracle Address, IRM Address, Fee, etc. */}
                    </div>

                    {/* Additional sections like User Position Details could go here */}
                </div>

                {/* Right: Actions */}
                <div className="space-y-4">
                    <div className="flex p-1 bg-dark-600/50 rounded-lg">
                        <button
                            className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${activeTab === 'supply' ? 'bg-dark-500 text-white shadow-sm' : 'text-gray-400 hover:text-white'}`}
                            onClick={() => handleTabChange('supply')}
                        >
                            Supply
                        </button>
                        <button
                            className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${activeTab === 'borrow' ? 'bg-dark-500 text-white shadow-sm' : 'text-gray-400 hover:text-white'}`}
                            onClick={() => handleTabChange('borrow')}
                        >
                            Borrow
                        </button>
                    </div>

                    {positionLoading ? (
                        <div className="card h-64 animate-pulse bg-dark-600/30" />
                    ) : activeTab === 'supply' ? (
                        <SupplyPanel market={market} position={position} />
                    ) : (
                        <BorrowPanel market={market} position={position} />
                    )}
                </div>
            </div>
        </div>
    )
}
