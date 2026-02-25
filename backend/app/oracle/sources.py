import asyncio
import json
import logging
from typing import Callable

import httpx
import websockets

logger = logging.getLogger(__name__)

# Latest BTC price in USD
_latest_price: float = 0.0


def get_latest_price() -> float:
    return _latest_price


async def binance_ws_feed(on_price: Callable[[float], None] | None = None):
    """Subscribe to Binance btcusdt@trade WebSocket for real-time prices."""
    global _latest_price
    uri = "wss://stream.binance.com:9443/ws/btcusdt@trade"

    while True:
        try:
            async with websockets.connect(uri) as ws:
                logger.info("Connected to Binance WS")
                async for msg in ws:
                    data = json.loads(msg)
                    price = float(data["p"])
                    _latest_price = price
                    if on_price:
                        on_price(price)
        except Exception as e:
            logger.warning(f"Binance WS error: {e}, reconnecting in 5s...")
            await asyncio.sleep(5)


async def coingecko_fallback() -> float:
    """Fallback: fetch BTC price from CoinGecko REST API."""
    global _latest_price
    url = "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd"
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(url, timeout=10)
            resp.raise_for_status()
            data = resp.json()
            price = float(data["bitcoin"]["usd"])
            _latest_price = price
            logger.info(f"CoinGecko BTC price: ${price:,.2f}")
            return price
    except Exception as e:
        logger.error(f"CoinGecko fetch failed: {e}")
        return _latest_price
