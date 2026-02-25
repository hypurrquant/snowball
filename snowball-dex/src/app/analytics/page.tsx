import { Card } from "@/components/ui/card";

const MOCK_POOLS = [
    { pair: "wCTC / USDC", tvl: "$125K", volume: "$45K", fees: "$234", apr: "68.2%" },
    { pair: "wCTC / sbUSD", tvl: "$98K", volume: "$32K", fees: "$154", apr: "57.3%" },
    { pair: "sbUSD / USDC", tvl: "$210K", volume: "$180K", fees: "$90", apr: "15.6%" },
    { pair: "lstCTC / wCTC", tvl: "$45K", volume: "$12K", fees: "$5", apr: "4.1%" },
];

const MOCK_TOKENS = [
    { name: "CTC", price: "$0.45", change: "+2.3%", volume: "$89K" },
    { name: "USDC", price: "$1.00", change: "+0.01%", volume: "$225K" },
    { name: "sbUSD", price: "$1.00", change: "-0.02%", volume: "$212K" },
    { name: "wCTC", price: "$0.45", change: "+2.3%", volume: "$77K" },
];

export default function AnalyticsPage() {
    return (
        <main className="container mx-auto max-w-6xl py-12 px-4">
            <h1 className="text-3xl font-bold mb-8">Snowball DEX Analytics</h1>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                <Card className="p-6 bg-bg-card border-border">
                    <div className="text-sm text-text-secondary mb-2">TVL</div>
                    <div className="text-2xl font-bold">$478,000</div>
                    <div className="text-success text-sm mt-1">+5.2%</div>
                </Card>
                <Card className="p-6 bg-bg-card border-border">
                    <div className="text-sm text-text-secondary mb-2">24h Volume</div>
                    <div className="text-2xl font-bold">$269,000</div>
                    <div className="text-success text-sm mt-1">+12.3%</div>
                </Card>
                <Card className="p-6 bg-bg-card border-border">
                    <div className="text-sm text-text-secondary mb-2">24h Fees</div>
                    <div className="text-2xl font-bold">$483</div>
                    <div className="text-success text-sm mt-1">+8.1%</div>
                </Card>
                <Card className="p-6 bg-bg-card border-border">
                    <div className="text-sm text-text-secondary mb-2">Total Txns</div>
                    <div className="text-2xl font-bold">1,247</div>
                    <div className="text-success text-sm mt-1">+3.4%</div>
                </Card>
            </div>

            <div className="grid md:grid-cols-2 gap-8 mb-8">
                <div className="flex flex-col gap-4">
                    <h3 className="text-xl font-bold">Top Pools</h3>
                    <Card className="bg-bg-card border-border overflow-hidden">
                        <div className="grid grid-cols-5 p-4 bg-bg-input/30 text-sm font-medium text-text-secondary border-b border-border">
                            <div className="col-span-2">Pool</div>
                            <div>TVL</div>
                            <div>Volume</div>
                            <div className="text-right">APR</div>
                        </div>
                        <div className="flex flex-col">
                            {MOCK_POOLS.map((pool, i) => (
                                <div key={i} className="grid grid-cols-5 p-4 border-b border-border/50 last:border-0 items-center">
                                    <div className="col-span-2 font-medium">{pool.pair}</div>
                                    <div>{pool.tvl}</div>
                                    <div>{pool.volume}</div>
                                    <div className="text-right text-success">{pool.apr}</div>
                                </div>
                            ))}
                        </div>
                    </Card>
                </div>

                <div className="flex flex-col gap-4">
                    <h3 className="text-xl font-bold">Top Tokens</h3>
                    <Card className="bg-bg-card border-border overflow-hidden">
                        <div className="grid grid-cols-4 p-4 bg-bg-input/30 text-sm font-medium text-text-secondary border-b border-border">
                            <div>Token</div>
                            <div>Price</div>
                            <div>Price Change</div>
                            <div className="text-right">Volume</div>
                        </div>
                        <div className="flex flex-col">
                            {MOCK_TOKENS.map((token, i) => (
                                <div key={i} className="grid grid-cols-4 p-4 border-b border-border/50 last:border-0 items-center">
                                    <div className="font-medium">{token.name}</div>
                                    <div>{token.price}</div>
                                    <div className={token.change.startsWith("+") ? "text-success" : "text-error"}>{token.change}</div>
                                    <div className="text-right">{token.volume}</div>
                                </div>
                            ))}
                        </div>
                    </Card>
                </div>
            </div>
        </main>
    );
}
