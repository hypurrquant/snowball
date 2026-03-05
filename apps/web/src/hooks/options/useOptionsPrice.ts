"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { API_BASE } from "@/config/addresses";

interface PriceData {
  price: number;
  timestamp: number;
  source: string;
}

interface OHLCVCandle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export function useOptionsPrice() {
  const [currentPrice, setCurrentPrice] = useState<PriceData | null>(null);
  const [priceHistory, setPriceHistory] = useState<OHLCVCandle[]>([]);
  const wsRef = useRef<WebSocket | null>(null);

  // WebSocket for real-time price
  useEffect(() => {
    const wsUrl = API_BASE.replace(/^http/, "ws");
    const ws = new WebSocket(`${wsUrl}/ws/price`);

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        setCurrentPrice({
          price: data.price,
          timestamp: data.timestamp * 1000,
          source: data.source,
        });
      } catch {}
    };

    ws.onerror = () => {
      // Fallback to polling
      const poll = async () => {
        try {
          const res = await fetch(`${API_BASE}/api/price/btc/current`);
          const data = await res.json();
          setCurrentPrice({
            price: data.price,
            timestamp: Date.now(),
            source: data.source || "rest",
          });
        } catch {}
      };
      poll();
    };

    wsRef.current = ws;
    return () => ws.close();
  }, []);

  // Fetch OHLCV history
  const fetchOHLCV = useCallback(async () => {
    try {
      const res = await fetch(
        `${API_BASE}/api/price/btc/ohlcv?interval=1m&limit=100`
      );
      const data = await res.json();
      if (Array.isArray(data)) {
        setPriceHistory(
          data.map((c: any) => ({
            time: c.timestamp,
            open: c.open,
            high: c.high,
            low: c.low,
            close: c.close,
            volume: c.volume || 0,
          }))
        );
      }
    } catch {}
  }, []);

  useEffect(() => {
    fetchOHLCV();
    const interval = setInterval(fetchOHLCV, 60_000);
    return () => clearInterval(interval);
  }, [fetchOHLCV]);

  return { currentPrice, priceHistory };
}
