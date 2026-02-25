import { useLendMarkets } from '@/hooks/lend/useLendMarkets'
import { useLendPositions } from '@/hooks/lend/useLendPositions'
import { Link } from 'react-router-dom'
import { MarketTokenPair } from '@/components/lend/MarketTokenPair'
import { formatUnits } from 'viem'
import { utilization, supplyAPY, borrowRateToAPR, calculateHealthFactor, toAssetsDown } from '@/lib/lendMath'
import { Activity, Database, Coins, LayoutDashboard } from 'lucide-react'

function StatCard({ title, value, icon: Icon }: { title: string, value: string, icon: any }) {
    return (
        <div className="card p-5 flex flex-col gap-3">
            <div className="flex items-center gap-2 text-gray-400">
                <Icon className="w-4 h-4" />
                <span className="text-sm font-medium">{title}</span>
            </div>
            <span className="text-2xl font-bold text-white">{value}</span>
        </div>
    )
}

export function LendDashboard() {
    const { markets, isLoading: marketsLoading } = useLendMarkets();
    const { positions, isLoading: positionsLoading } = useLendPositions();

    const isLoading = marketsLoading || positionsLoading;

    let totalSupplyUSD = 0;
    let totalBorrowUSD = 0;

    markets.forEach(m => {
        const supplyAssets = Number(formatUnits(m.totalSupplyAssets, m.config.loanDecimals));
        const borrowAssets = Number(formatUnits(m.totalBorrowAssets, m.config.loanDecimals));
        totalSupplyUSD += supplyAssets;
        totalBorrowUSD += borrowAssets;
    });

    const totalLiquidityUSD = totalSupplyUSD - totalBorrowUSD;

    const activePositions = positions.filter(p => p.supplyShares > 0n || p.borrowShares > 0n || p.collateral > 0n);

    return (
        <div className="max-w-5xl mx-auto space-y-8">
            <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold tracking-tight text-white">Snowball Lend</h1>
                <span className="px-2.5 py-1 rounded-md bg-ice-500/20 text-ice-400 text-xs font-semibold">Morpho Protocol</span>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard title="Total Supply" value={`$${totalSupplyUSD.toLocaleString(undefined, { maximumFractionDigits: 0 })}`} icon={Database} />
                <StatCard title="Total Borrow" value={`$${totalBorrowUSD.toLocaleString(undefined, { maximumFractionDigits: 0 })}`} icon={Activity} />
                <StatCard title="Available Liquidity" value={`$${totalLiquidityUSD.toLocaleString(undefined, { maximumFractionDigits: 0 })}`} icon={Coins} />
                <StatCard title="Active Markets" value={`${markets.length}`} icon={LayoutDashboard} />
            </div>

            <div className="space-y-4">
                <h2 className="text-lg font-semibold text-white">My Positions</h2>
                {isLoading ? (
                    <div className="card h-24 animate-pulse bg-dark-600/30" />
                ) : activePositions.length === 0 ? (
                    <div className="card py-12 flex flex-col items-center justify-center text-gray-500 gap-2">
                        <Coins className="w-8 h-8 opacity-50" />
                        <p>No active positions found.</p>
                        <Link to="/lend/markets" className="text-ice-400 text-sm hover:underline mt-2">Explore Markets →</Link>
                    </div>
                ) : (
                    <div className="grid gap-4">
                        {activePositions.map(pos => {
                            const market = markets.find(m => m.config.id === pos.marketId);
                            if (!market) return null;
                            const { config } = market;

                            const supplyAssets = toAssetsDown(pos.supplyShares, market.totalSupplyAssets, market.totalSupplyShares);
                            const borrowAssets = toAssetsDown(pos.borrowShares, market.totalBorrowAssets, market.totalBorrowShares);

                            const supplyNum = Number(formatUnits(supplyAssets, config.loanDecimals));
                            const borrowNum = Number(formatUnits(borrowAssets, config.loanDecimals));
                            const collNum = Number(formatUnits(pos.collateral, config.collDecimals));

                            const util = utilization(market.totalBorrowAssets, market.totalSupplyAssets);
                            const apr = borrowRateToAPR(market.borrowRatePerSecond);
                            const apy = supplyAPY(apr, util, Number(formatUnits(market.fee, 18)));

                            const hf = calculateHealthFactor(pos.collateral, borrowAssets, market.oraclePrice, config.lltv, config.collDecimals, config.loanDecimals);

                            return (
                                <div key={pos.marketId} className="card p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                                    <div className="flex items-center gap-4 min-w-[200px]">
                                        <MarketTokenPair collSymbol={config.collSymbol} loanSymbol={config.loanSymbol} />
                                        <div className="flex flex-col">
                                            <span className="font-semibold text-white">{config.name}</span>
                                            <span className="text-xs text-gray-400">LLTV {Number(formatUnits(config.lltv, 18)) * 100}%</span>
                                        </div>
                                    </div>

                                    <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-4">
                                        {supplyNum > 0 && (
                                            <>
                                                <div className="flex flex-col">
                                                    <span className="text-xs text-gray-500">Supplied</span>
                                                    <span className="text-sm font-semibold text-white">{supplyNum.toFixed(2)} {config.loanSymbol}</span>
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="text-xs text-gray-500">APY</span>
                                                    <span className="text-sm font-semibold text-ice-400">{apy.toFixed(2)}%</span>
                                                </div>
                                            </>
                                        )}
                                        {(borrowNum > 0 || collNum > 0) && (
                                            <>
                                                <div className="flex flex-col">
                                                    <span className="text-xs text-gray-500">Borrowed</span>
                                                    <span className="text-sm font-semibold text-white">{borrowNum > 0 ? borrowNum.toFixed(2) : '0.00'} {config.loanSymbol}</span>
                                                    {collNum > 0 && <span className="text-xs text-gray-400">Coll: {collNum.toFixed(2)} {config.collSymbol}</span>}
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="text-xs text-gray-500">Health / APR</span>
                                                    <span className={`text-sm font-semibold ${hf && hf < 1.5 ? 'text-red-400' : hf && hf < 2 ? 'text-yellow-400' : 'text-green-400'}`}>
                                                        HF: {hf ? hf.toFixed(2) : '∞'}
                                                    </span>
                                                    <span className="text-xs text-gray-400">APR: {apr.toFixed(2)}%</span>
                                                </div>
                                            </>
                                        )}
                                    </div>

                                    <Link to={`/lend/positions`} className="btn-secondary text-xs px-4 py-2 shrink-0 h-auto rounded-lg">Manage →</Link>
                                </div>
                            )
                        })}
                    </div>
                )}
            </div>

            <div className="space-y-4">
                <div className="flex justify-between items-center">
                    <h2 className="text-lg font-semibold text-white">Top Markets</h2>
                    <Link to="/lend/markets" className="text-sm text-ice-400 hover:text-ice-300 transition-colors">View All Markets →</Link>
                </div>

                <div className="card overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-dark-600/50 text-xs text-gray-500 uppercase tracking-wider">
                                <th className="px-6 py-4 font-medium">Market</th>
                                <th className="px-6 py-4 font-medium">Supply APY</th>
                                <th className="px-6 py-4 font-medium">Borrow APR</th>
                                <th className="px-6 py-4 font-medium text-right">Total Supplied</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-dark-600/50">
                            {isLoading ? (
                                <tr>
                                    <td colSpan={4} className="px-6 py-8 text-center text-gray-500 animate-pulse">Loading markets...</td>
                                </tr>
                            ) : (
                                markets.slice(0, 3).map(market => {
                                    const util = utilization(market.totalBorrowAssets, market.totalSupplyAssets);
                                    const apr = borrowRateToAPR(market.borrowRatePerSecond);
                                    const apy = supplyAPY(apr, util, Number(formatUnits(market.fee, 18)));
                                    const supplyNum = Number(formatUnits(market.totalSupplyAssets, market.config.loanDecimals));

                                    return (
                                        <tr key={market.config.id} className="hover:bg-dark-600/20 transition-colors cursor-pointer">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <MarketTokenPair collSymbol={market.config.collSymbol} loanSymbol={market.config.loanSymbol} size="sm" />
                                                    <Link to={`/lend/markets/${market.config.id}`} className="font-semibold text-white text-sm hover:underline">{market.config.name}</Link>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="text-ice-400 font-medium text-sm">{apy.toFixed(2)}%</span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="text-red-400 font-medium text-sm">{apr.toFixed(2)}%</span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <span className="text-white font-medium text-sm">{supplyNum.toLocaleString(undefined, { maximumFractionDigits: 0 })} {market.config.loanSymbol}</span>
                                            </td>
                                        </tr>
                                    )
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    )
}
