"use client";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { StatCard } from "@/components/common/StatCard";
import { BarChart3, DollarSign, Activity, Users, ArrowUpRight } from "lucide-react";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

const MOCK_TVL_DATA = [
  { date: "Jan", tvl: 1200000 },
  { date: "Feb", tvl: 1800000 },
  { date: "Mar", tvl: 1500000 },
  { date: "Apr", tvl: 2400000 },
  { date: "May", tvl: 3100000 },
  { date: "Jun", tvl: 2800000 },
  { date: "Jul", tvl: 4200000 },
];

const MOCK_POOLS = [
  { pair: "wCTC / USDC", tvl: "$1.2M", vol24h: "$150K", apy: "12.4%" },
  { pair: "sbUSD / USDC", tvl: "$900K", vol24h: "$320K", apy: "8.1%" },
  { pair: "lstCTC / wCTC", tvl: "$850K", vol24h: "$95K", apy: "15.2%" },
];

export default function AnalyticsPage() {
  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2 text-white">
          <BarChart3 className="w-6 h-6 text-[#60a5fa]" />
          Protocol Analytics
        </h1>
        <div className="bg-[#1C1D30] px-3 py-1.5 rounded-lg text-xs font-medium text-[#8B8D97] border border-[#1F2037]">
          Data updates every 5 mins
        </div>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Value Locked" value="$4.20M" icon={<DollarSign className="w-5 h-5 text-[#60a5fa]" />} sub={
          <span className="flex items-center text-[#22c55e] text-xs mt-1"><ArrowUpRight className="w-3 h-3 mr-0.5" /> +12.5%</span>
        } />
        <StatCard label="24h Volume" value="$565K" icon={<Activity className="w-5 h-5 text-[#8B5CF6]" />} sub={
          <span className="flex items-center text-[#22c55e] text-xs mt-1"><ArrowUpRight className="w-3 h-3 mr-0.5" /> +5.2%</span>
        } />
        <StatCard label="Total Users" value="1,248" icon={<Users className="w-5 h-5 text-[#34D399]" />} sub={
          <span className="flex items-center text-[#22c55e] text-xs mt-1"><ArrowUpRight className="w-3 h-3 mr-0.5" /> +18 today</span>
        } />
        <StatCard label="Total Fees" value="$24.5K" icon={<DollarSign className="w-5 h-5 text-[#F59E0B]" />} sub="Last 30 days" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Chart */}
        <Card className="lg:col-span-2 bg-[#141525]/60 backdrop-blur-xl border-[#1F2037] shadow-xl">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-lg font-bold text-white">TVL History</CardTitle>
              <p className="text-sm text-[#8B8D97] mt-1">Total Value Locked across all pools and lending</p>
            </div>
            <div className="text-2xl font-bold text-white font-mono">$4.20M</div>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={MOCK_TVL_DATA} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorTvl" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#60a5fa" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#60a5fa" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="date" stroke="#4A4B57" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis
                    stroke="#4A4B57"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) => `$${value / 1000000}M`}
                  />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1C1D30', border: '1px solid #1F2037', borderRadius: '8px' }}
                    itemStyle={{ color: '#fff', fontWeight: 'bold' }}
                    formatter={(value: any) => [`$${(Number(value) ? Number(value) / 1000000 : 0).toFixed(2)}M`, 'TVL']}
                  />
                  <Area type="monotone" dataKey="tvl" stroke="#60a5fa" strokeWidth={2} fillOpacity={1} fill="url(#colorTvl)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Top Pools */}
        <Card className="bg-[#141525]/60 backdrop-blur-xl border-[#1F2037] shadow-xl">
          <CardHeader>
            <CardTitle className="text-lg font-bold text-white">Top Pools by Volume</CardTitle>
          </CardHeader>
          <CardContent className="px-0">
            <div className="grid grid-cols-[1fr_auto_auto] gap-4 px-6 pb-2 text-xs font-semibold text-[#8B8D97] uppercase tracking-wider border-b border-[#1F2037]">
              <span>Pool</span>
              <span className="text-right">Volume</span>
              <span className="text-right">APY</span>
            </div>
            <div className="flex flex-col">
              {MOCK_POOLS.map((pool, i) => (
                <div key={i} className="grid grid-cols-[1fr_auto_auto] gap-4 items-center px-6 py-4 hover:bg-[#1a2035] transition-colors border-b border-[#1F2037] last:border-0 cursor-pointer">
                  <span className="font-semibold text-white">{pool.pair}</span>
                  <span className="font-mono text-sm text-[#F5F5F7] text-right">{pool.vol24h}</span>
                  <span className="font-mono text-sm text-[#22c55e] text-right">{pool.apy}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
