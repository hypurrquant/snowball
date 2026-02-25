import asyncio
import json
import logging
import time

from fastapi import WebSocket, WebSocketDisconnect

from app.oracle.sources import get_latest_price
from app.price.cache import price_cache

logger = logging.getLogger(__name__)

# Connected WS clients
_clients: set[WebSocket] = set()


async def price_ws_handler(ws: WebSocket):
    """WebSocket endpoint: broadcast real-time BTC price."""
    await ws.accept()
    _clients.add(ws)
    logger.info(f"WS client connected ({len(_clients)} total)")

    try:
        while True:
            # Keep connection alive, client doesn't need to send anything
            await ws.receive_text()
    except WebSocketDisconnect:
        pass
    finally:
        _clients.discard(ws)
        logger.info(f"WS client disconnected ({len(_clients)} total)")


async def price_broadcast_loop():
    """Background task: broadcast price to all WS clients every second."""
    last_price = 0.0

    while True:
        try:
            price = get_latest_price()
            if price > 0 and price != last_price:
                last_price = price
                price_cache.add_tick(price)

                message = json.dumps({
                    "type": "price",
                    "symbol": "BTC/USD",
                    "price": price,
                    "timestamp": time.time(),
                })

                dead: list[WebSocket] = []
                for client in _clients:
                    try:
                        await client.send_text(message)
                    except Exception:
                        dead.append(client)

                for client in dead:
                    _clients.discard(client)

        except Exception as e:
            logger.error(f"Broadcast error: {e}")

        await asyncio.sleep(1)
