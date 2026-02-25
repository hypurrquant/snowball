import time

from fastapi import APIRouter, Query

from app.price.cache import price_cache

router = APIRouter(prefix="/api/price", tags=["price"])


@router.get("/btc/current")
async def get_current_price():
    tick = price_cache.latest
    if tick is None:
        return {"price": 0, "timestamp": 0, "stale": True}
    stale = (time.time() - tick.timestamp) > 120
    return {
        "price": tick.price,
        "timestamp": tick.timestamp,
        "stale": stale,
    }


@router.get("/btc/history")
async def get_price_history(
    interval: str = Query("1m", description="Interval: 1m, 5m, 15m, 1h"),
    limit: int = Query(100, ge=1, le=1000),
):
    interval_map = {"1m": 60, "5m": 300, "15m": 900, "1h": 3600}
    interval_sec = interval_map.get(interval, 60)

    ticks = price_cache.history(interval_sec, limit)
    return {
        "interval": interval,
        "count": len(ticks),
        "data": [{"price": t.price, "timestamp": t.timestamp} for t in ticks],
    }


@router.get("/btc/ohlcv")
async def get_ohlcv(
    interval: str = Query("1m", description="Interval: 1m, 5m, 15m, 1h"),
    limit: int = Query(100, ge=1, le=1000),
):
    interval_map = {"1m": 60, "5m": 300, "15m": 900, "1h": 3600}
    interval_sec = interval_map.get(interval, 60)

    bars = price_cache.ohlcv(interval_sec, limit)
    return {
        "interval": interval,
        "count": len(bars),
        "data": [
            {
                "open": b.open,
                "high": b.high,
                "low": b.low,
                "close": b.close,
                "volume": b.volume,
                "timestamp": b.timestamp,
            }
            for b in bars
        ],
    }
