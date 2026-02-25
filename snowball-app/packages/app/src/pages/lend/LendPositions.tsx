import { useLendMarkets } from '@/hooks/lend/useLendMarkets'
import { useLendPositions } from '@/hooks/lend/useLendPositions'
import { Link } from 'react-router-dom'
import { MarketTokenPair } from '@/components/lend/MarketTokenPair'
import { formatUnits } from 'viem'
import { utilization, supplyAPY, borrowRateToAPR, calculateHealthFactor, toAssetsDown } from '@/lib/lendMath'
import { Coins } from 'lucide-react'

export function LendPositions() {
    const { markets, isLoading: marketsLoading } = useLendMarkets();
    const { positions, isLoading: positionsLoading } = useLendPositions();

    const isLoading = marketsLoading || positionsLoading;
    const activePositions = positions.filter(p => p.supplyShares > 0n || p.borrowShares > 0n || p.collateral > 0n);

    return (
        <div className="max-w-5xl mx-auto space-y-6">
            <h1 className="text-2xl font-bold tracking-tight text-white">My Positions</h1>

            {isLoading ? (
                <div className="card h-64 animate-pulse bg-dark-600/30" />
            ) : activePositions.length === 0 ? (
                <div className="card py-24 flex flex-col items-center justify-center text-gray-500 gap-4">
                    <Coins className="w-12 h-12 opacity-50" />
                    <p className="text-lg">No active positions found.</p>
                    <Link to="/lend/markets" className="btn-primary px-6 py-2 mt-2 font-medium">Explore Markets</Link>
                </div>
            ) : (
                <div className="grid gap-6">
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
                            <div key={pos.marketId} className="card p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                                <div className="flex items-center gap-4 min-w-[250px]">
                                    <MarketTokenPair collSymbol={config.collSymbol} loanSymbol={config.loanSymbol} size="lg" />
                                    <div className="flex flex-col">
                                        <h3 className="text-lg font-bold text-white">{config.name}</h3>
                                        <span className="text-sm text-gray-400">LLTV {Number(formatUnits(config.lltv, 18)) * 100}%</span>
                                    </div>
                                </div>

                                <div className="flex-1 grid grid-cols-2 lg:grid-cols-4 gap-6">
                                    <div className="flex flex-col space-y-1">
                                        <span className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Supplied</span>
                                        <span className="text-lg font-bold text-white">{supplyNum > 0 ? supplyNum.toFixed(2) : '0'} <span className="text-sm font-normal text-gray-400">{config.loanSymbol}</span></span>
                                        {supplyNum > 0 && <span className="text-xs text-ice-400 font-medium">+{apy.toFixed(2)}% APY</span>}
                                    </div>
                                    <div className="flex flex-col space-y-1">
                                        <span className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Borrowed</span>
                                        <span className="text-lg font-bold text-white">{borrowNum > 0 ? borrowNum.toFixed(2) : '0'} <span className="text-sm font-normal text-gray-400">{config.loanSymbol}</span></span>
                                        {borrowNum > 0 && <span className="text-xs text-red-400 font-medium">{apr.toFixed(2)}% APR</span>}
                                    </div>
                                    <div className="flex flex-col space-y-1">
                                        <span className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Collateral</span>
                                        <span className="text-lg font-bold text-white">{collNum > 0 ? collNum.toFixed(4) : '0'} <span className="text-sm font-normal text-gray-400">{config.collSymbol}</span></span>
                                    </div>
                                    <div className="flex flex-col space-y-1">
                                        <span className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Health Factor</span>
                                        <span className={`text-lg font-bold ${hf && hf < 1.5 ? 'text-red-400' : hf && hf < 2 ? 'text-yellow-400' : 'text-green-400'}`}>
                                            {hf ? hf.toFixed(2) : '∞'}
                                        </span>
                                    </div>
                                </div>

                                <div className="flex gap-2 shrink-0">
                                    <Link to={`/lend/markets/${pos.marketId}?tab=supply`} className="btn-secondary px-4 py-2">Supply/Withdraw</Link>
                                    <Link to={`/lend/markets/${pos.marketId}?tab=borrow`} className="btn-secondary px-4 py-2">Manage Borrow</Link>
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}
        </div>
    )
}
