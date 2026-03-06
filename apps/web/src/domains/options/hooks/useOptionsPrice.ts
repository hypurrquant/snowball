"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { API_BASE } from "@/core/config/addresses";

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

const MAX_RETRIES = 3;
const POLLING_INTERVAL = 10_000;

export function useOptionsPrice() {
  const [currentPrice, setCurrentPrice] = useState<PriceData | null>(null);
  const [priceHistory, setPriceHistory] = useState<OHLCVCandle[]>([]);
  const wsRef = useRef<WebSocket | null>(null);
  const retryCountRef = useRef(0);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pollingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const pollPrice = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/price/btc/current`);
      const data = await res.json();
      setCurrentPrice({
        price: data.price,
        timestamp: Date.now(),
        source: data.source || "rest-polling",
      });
    } catch (e) {
      console.warn("[useOptionsPrice] polling fetch failed:", e);
    }
  }, []);

  const startPollingFallback = useCallback(() => {
    if (pollingIntervalRef.current) return;
    pollPrice();
    pollingIntervalRef.current = setInterval(pollPrice, POLLING_INTERVAL);
  }, [pollPrice]);

  const connectWs = useCallback(() => {
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
      } catch (e) {
        console.warn("[useOptionsPrice] ws message parse failed:", e);
      }
    };

    ws.onopen = () => {
      retryCountRef.current = 0;
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };

    ws.onclose = () => {
      if (retryCountRef.current < MAX_RETRIES) {
        const backoff = 1000 * 2 ** retryCountRef.current;
        retryCountRef.current += 1;
        reconnectTimerRef.current = setTimeout(() => {
          wsRef.current = connectWs();
        }, backoff);
      } else {
        startPollingFallback();
      }
    };

    ws.onerror = () => {
      ws.close();
    };

    return ws;
  }, [startPollingFallback]);

  // WebSocket for real-time price
  useEffect(() => {
    wsRef.current = connectWs();

    return () => {
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
      if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
      wsRef.current?.close();
    };
  }, [connectWs]);

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
    } catch (e) {
      console.warn("[useOptionsPrice] OHLCV fetch failed:", e);
    }
  }, []);

  useEffect(() => {
    fetchOHLCV();
    const interval = setInterval(fetchOHLCV, 60_000);
    return () => clearInterval(interval);
  }, [fetchOHLCV]);

  return { currentPrice, priceHistory };
}
