"use client";

import { useState, useEffect } from "react";
import { useConnection } from "wagmi";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { API_BASE } from "@/config/addresses";
import { formatNumber } from "@/lib/utils";
import { History, TrendingUp, TrendingDown } from "lucide-react";

interface OrderHistory {
  roundId: number;
  isOver: boolean;
  amount: string;
  payout: string;
  startPrice: string;
  endPrice: string;
  status: string;
  timestamp: number;
}

export default function OptionsHistoryPage() {
  const { address } = useConnection();
  const [orders, setOrders] = useState<OrderHistory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!address) return;
    const fetchHistory = async () => {
      try {
        const res = await fetch(
          `${API_BASE}/api/options/history?address=${address}`
        );
        if (res.ok) {
          const data = await res.json();
          setOrders(data.orders || []);
        }
      } catch {
        // API may not be running
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, [address]);

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="w-5 h-5 text-ice-400" />
            Trade History
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!address ? (
            <div className="text-center py-12 text-text-secondary">
              Connect wallet to view your trade history
            </div>
          ) : loading ? (
            <div className="text-center py-12 text-text-secondary">
              Loading...
            </div>
          ) : orders.length === 0 ? (
            <div className="text-center py-12 text-text-secondary">
              No trades yet. Start trading on the Options page.
            </div>
          ) : (
            <>
              {/* Header */}
              <div className="grid grid-cols-[60px_80px_100px_100px_100px_80px] gap-3 px-4 pb-2 text-xs text-text-tertiary uppercase tracking-wider">
                <span>Round</span>
                <span>Side</span>
                <span className="text-right">Amount</span>
                <span className="text-right">Payout</span>
                <span className="text-right">Price</span>
                <span className="text-right">Status</span>
              </div>

              <div className="divide-y divide-border/40">
                {orders.map((order, i) => (
                  <div
                    key={i}
                    className="grid grid-cols-[60px_80px_100px_100px_100px_80px] gap-3 items-center px-4 py-3 text-sm"
                  >
                    <span className="font-mono text-text-secondary">
                      #{order.roundId}
                    </span>
                    <Badge
                      variant={order.isOver ? "success" : "destructive"}
                      className="w-fit"
                    >
                      {order.isOver ? (
                        <TrendingUp className="w-3 h-3 mr-1" />
                      ) : (
                        <TrendingDown className="w-3 h-3 mr-1" />
                      )}
                      {order.isOver ? "Over" : "Under"}
                    </Badge>
                    <span className="text-right font-mono">
                      {formatNumber(Number(order.amount) / 1e18, 4)}
                    </span>
                    <span className="text-right font-mono">
                      {formatNumber(Number(order.payout) / 1e18, 4)}
                    </span>
                    <span className="text-right text-text-secondary text-xs">
                      {formatNumber(Number(order.startPrice) / 1e18, 2)} →{" "}
                      {formatNumber(Number(order.endPrice) / 1e18, 2)}
                    </span>
                    <div className="text-right">
                      <Badge
                        variant={
                          order.status === "won"
                            ? "success"
                            : order.status === "lost"
                              ? "destructive"
                              : "secondary"
                        }
                      >
                        {order.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
