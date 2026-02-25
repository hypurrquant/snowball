import { MarketTokenPair } from './MarketTokenPair'
import { UtilizationBar } from './UtilizationBar'
import { utilization, supplyAPY, borrowRateToAPR } from '@/lib/lendMath'
import { formatUnits } from 'viem'
import { Link } from 'react-router-dom'

export function MarketCard({ market }: { market: any }) {
    const { config, totalSupplyAssets, totalBorrowAssets, borrowRatePerSecond, fee } = market;

    const util = utilization(totalBorrowAssets, totalSupplyAssets);
    const apr = borrowRateToAPR(borrowRatePerSecond);
    const apy = supplyAPY(apr, util, Number(formatUnits(fee, 18)));

    const supplyNum = Number(formatUnits(totalSupplyAssets, config.loanDecimals));
    const borrowNum = Number(formatUnits(totalBorrowAssets, config.loanDecimals));

    return (
        <div className="card card-hover flex flex-col p-5 space-y-4">
            <div className="flex justify-between items-center">
                <div className="flex flex-col">
                    <span className="text-lg font-bold text-white flex gap-3 items-center">
                        <MarketTokenPair collSymbol={config.collSymbol} loanSymbol={config.loanSymbol} />
                        {config.name}
                    </span>
                    <span className="text-xs text-gray-400">LLTV {Number(formatUnits(config.lltv, 18)) * 100}%</span>
                </div>
                <div className="flex gap-2">
                    <Link to={`/lend/markets/${config.id}?tab=supply`} className="btn-primary text-xs px-4 py-2 h-auto text-white rounded-lg">Supply</Link>
                    <Link to={`/lend/markets/${config.id}?tab=borrow`} className="btn-secondary text-xs px-4 py-2 h-auto rounded-lg">Borrow</Link>
                </div>
            </div>

            <div className="grid grid-cols-4 gap-2 pt-2">
                <div className="flex flex-col">
                    <span className="text-xs text-gray-500">Utilization</span>
                    <span className="text-sm font-semibold text-white">{util.toFixed(2)}%</span>
                </div>
                <div className="flex flex-col">
                    <span className="text-xs text-gray-500">Supply APY</span>
                    <span className="text-sm font-semibold text-ice-400">{apy.toFixed(2)}%</span>
                </div>
                <div className="flex flex-col">
                    <span className="text-xs text-gray-500">Borrow APR</span>
                    <span className="text-sm font-semibold text-red-400">{apr.toFixed(2)}%</span>
                </div>
                <div className="flex flex-col items-end">
                    <span className="text-xs text-gray-500">Available</span>
                    <span className="text-sm font-semibold text-white">
                        {((supplyNum - borrowNum)).toLocaleString(undefined, { maximumFractionDigits: 0 })} {config.loanSymbol}
                    </span>
                </div>
            </div>

            <UtilizationBar utilization={util} target={90} />

            <div className="flex justify-between text-xs text-gray-500 pt-2 border-t border-dark-600/50">
                <span>Total Supply: {supplyNum.toLocaleString(undefined, { maximumFractionDigits: 0 })} {config.loanSymbol}</span>
                <span>Total Borrow: {borrowNum.toLocaleString(undefined, { maximumFractionDigits: 0 })} {config.loanSymbol}</span>
            </div>
        </div>
    )
}
