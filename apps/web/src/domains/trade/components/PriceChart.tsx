"use client";

import { useMemo } from "react";
import type { Address } from "viem";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card, CardHeader, CardTitle, CardContent } from "@/shared/components/ui/card";
import { TOKEN_INFO } from "@/core/config/addresses";
import { getPriceData } from "@/domains/trade/data/mockPriceData";
import { TrendingUp, TrendingDown } from "lucide-react";

interface PriceChartProps {
  tokenIn: Address;
  tokenOut: Address;
}

export function PriceChart({ tokenIn, tokenOut }: PriceChartProps) {
  const data = useMemo(() => getPriceData(tokenIn, tokenOut), [tokenIn, tokenOut]);

  const tokenInInfo = TOKEN_INFO[tokenIn];
  const tokenOutInfo = TOKEN_INFO[tokenOut];

  if (tokenIn.toLowerCase() === tokenOut.toLowerCase()) {
    return (
      <Card className="bg-bg-card/60 backdrop-blur-xl border-border shadow-xl">
        <CardContent className="flex items-center justify-center h-[360px]">
          <p className="text-text-secondary text-sm">Select a different pair</p>
        </CardContent>
      </Card>
    );
  }

  if (data.length === 0) {
    return (
      <Card className="bg-bg-card/60 backdrop-blur-xl border-border shadow-xl">
        <CardContent className="flex items-center justify-center h-[360px]">
          <p className="text-text-secondary text-sm">No data available</p>
        </CardContent>
      </Card>
    );
  }

  const currentPrice = data[data.length - 1].price;
  const firstPrice = data[0].price;
  const changePercent = ((currentPrice - firstPrice) / firstPrice) * 100;
  const isPositive = changePercent >= 0;

  return (
    <Card className="bg-bg-card/60 backdrop-blur-xl border-border shadow-xl">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-bold text-white">
            {tokenInInfo?.symbol ?? "?"} / {tokenOutInfo?.symbol ?? "?"}
          </CardTitle>
          <div className="text-right">
            <div className="text-xl font-bold text-white font-mono">
              {currentPrice < 0.01 ? currentPrice.toFixed(6) : currentPrice.toFixed(4)}
            </div>
            <div className={`flex items-center justify-end gap-1 text-xs font-medium ${isPositive ? "text-success" : "text-danger"}`}>
              {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
              {isPositive ? "+" : ""}{changePercent.toFixed(2)}%
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#60a5fa" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#60a5fa" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="date"
                stroke="#4A4B57"
                fontSize={12}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                stroke="#4A4B57"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                domain={["auto", "auto"]}
                tickFormatter={(v: number) =>
                  v < 0.01 ? v.toFixed(4) : v < 10 ? v.toFixed(2) : v.toLocaleString()
                }
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#1C1D30",
                  border: "1px solid #1F2037",
                  borderRadius: "8px",
                }}
                itemStyle={{ color: "#fff", fontWeight: "bold" }}
                formatter={(value: number | undefined) => [
                  value != null
                    ? value < 0.01 ? value.toFixed(6) : value.toFixed(4)
                    : "—",
                  "Price",
                ]}
              />
              <Area
                type="monotone"
                dataKey="price"
                stroke="#60a5fa"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#priceGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
