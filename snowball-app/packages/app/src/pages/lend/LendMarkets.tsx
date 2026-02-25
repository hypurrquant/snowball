import { useLendMarkets } from '@/hooks/lend/useLendMarkets'
import { MarketCard } from '@/components/lend/MarketCard'
import { Search } from 'lucide-react'
import { useState } from 'react'

export function LendMarkets() {
    const { markets, isLoading } = useLendMarkets();
    const [search, setSearch] = useState('');

    const filteredMarkets = markets.filter(m =>
        m.config.name.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="max-w-5xl mx-auto space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h1 className="text-2xl font-bold tracking-tight text-white">Markets</h1>

                <div className="relative w-full sm:w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <input
                        type="text"
                        placeholder="Search markets..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full bg-dark-800 border border-dark-500 rounded-xl py-2 pl-9 pr-4 text-sm text-white focus:outline-none focus:border-ice-500 transition-colors"
                    />
                </div>
            </div>

            {isLoading ? (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="rounded-2xl border border-dark-500 h-56 animate-pulse bg-dark-600/30" />
                    ))}
                </div>
            ) : (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredMarkets.map((market) => (
                        <MarketCard key={market.config.id} market={market} />
                    ))}
                    {filteredMarkets.length === 0 && (
                        <div className="col-span-full py-12 text-center text-gray-500">
                            No markets found matching "{search}"
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}
