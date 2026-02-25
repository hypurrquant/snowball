"use client";

import { useEffect, useRef } from "react";
import { createChart, CandlestickSeries, type IChartApi, ColorType } from "lightweight-charts";

interface PriceChartProps {
  data: Array<{
    time: number;
    open: number;
    high: number;
    low: number;
    close: number;
  }>;
  currentPrice?: number;
}

export function PriceChart({ data, currentPrice }: PriceChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const chart = createChart(containerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor: "#8B8D97",
        fontFamily: "Inter, sans-serif",
        fontSize: 11,
      },
      grid: {
        vertLines: { color: "rgba(31, 32, 55, 0.5)" },
        horzLines: { color: "rgba(31, 32, 55, 0.5)" },
      },
      crosshair: {
        vertLine: { color: "rgba(96, 165, 250, 0.4)" },
        horzLine: { color: "rgba(96, 165, 250, 0.4)" },
      },
      rightPriceScale: {
        borderColor: "#1F2037",
      },
      timeScale: {
        borderColor: "#1F2037",
        timeVisible: true,
        secondsVisible: false,
      },
      width: containerRef.current.clientWidth,
      height: 300,
    });

    const candlestickSeries = chart.addSeries(CandlestickSeries, {
      upColor: "#22c55e",
      downColor: "#ef4444",
      borderDownColor: "#ef4444",
      borderUpColor: "#22c55e",
      wickDownColor: "#ef4444",
      wickUpColor: "#22c55e",
    });

    if (data.length > 0) {
      candlestickSeries.setData(
        data.map((d) => ({
          time: d.time as any,
          open: d.open,
          high: d.high,
          low: d.low,
          close: d.close,
        }))
      );
    }

    chartRef.current = chart;

    const handleResize = () => {
      if (containerRef.current) {
        chart.applyOptions({ width: containerRef.current.clientWidth });
      }
    };
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      chart.remove();
    };
  }, [data]);

  return (
    <div className="relative">
      <div ref={containerRef} className="w-full" />
      {currentPrice !== undefined && (
        <div className="absolute top-2 right-2 bg-bg-card/90 border border-border rounded-lg px-3 py-1.5">
          <span className="text-xs text-text-secondary mr-1">BTC</span>
          <span className="text-sm font-mono font-bold text-ice-400">
            ${currentPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </span>
        </div>
      )}
    </div>
  );
}
